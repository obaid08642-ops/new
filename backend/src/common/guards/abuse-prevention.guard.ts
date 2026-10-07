import { 
  Injectable, 
  CanActivate, 
  ExecutionContext, 
  HttpException, 
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { Reflector } from '@nestjs/core';
import { ERROR_CODES } from '../errors';

export interface RateLimitConfig {
  actionType: 'ai_call' | 'search' | 'upload' | 'coupon' | 'referral' | 'review';
  customKey?: string;
  skipOnError?: boolean;
}

export const RATE_LIMIT_CONFIG_KEY = 'rate_limit_config';

/**
 * Decorator to configure rate limiting on controllers/handlers.
 */
export function RateLimit(config: RateLimitConfig) {
  return (target: any, propertyKey?: string, descriptor?: PropertyDescriptor) => {
    if (descriptor) {
      Reflect.defineMetadata(RATE_LIMIT_CONFIG_KEY, config, descriptor.value);
    } else {
      Reflect.defineMetadata(RATE_LIMIT_CONFIG_KEY, config, target);
    }
    return descriptor || target;
  };
}

@Injectable()
export class AbusePreventionGuard implements CanActivate {
  // Rate limit configurations
  private readonly LIMITS = {
    ai_call: { perMin: 20, perHour: 100 },
    search: { perMin: 60, perHour: 300 },
    upload: { perMin: 10, perHour: 50 },
    coupon: { perHour: 3 }, // Per order per hour
    referral: { perHour: 5 }, // Per user per hour
    review: { perHour: 10 }, // Per user per hour
  };

  constructor(
    private readonly redisService: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const handler = context.getHandler();
    const controller = context.getClass();

    // Get rate limit config from decorator
    const config = this.reflector.get<RateLimitConfig>(RATE_LIMIT_CONFIG_KEY, handler) ||
                   this.reflector.get<RateLimitConfig>(RATE_LIMIT_CONFIG_KEY, controller);

    if (!config) {
      // No rate limit configured, allow
      return true;
    }

    const userId = request.user?.id || request.ip || 'anonymous';
    const actionType = config.actionType;
    const limits = this.LIMITS[actionType];

    if (!limits) {
      this.warn(`Unknown action type for rate limiting: ${actionType}`);
      return true;
    }

    try {
      const result = await this.checkRateLimit(userId, actionType, limits, config.customKey, request);
      
      if (!result.allowed) {
        const errorResponse = {
          code: ERROR_CODES.RATE_LIMITED,
          message: this.getRateLimitMessage(actionType, result.window),
          retryAfter: result.retryAfter,
          limit: result.limit,
          remaining: result.remaining,
        };

        throw new HttpException(errorResponse, HttpStatus.TOO_MANY_REQUESTS);
      }

      // Add rate limit headers to response
      const response = context.switchToHttp().getResponse();
      if (response) {
        response.setHeader('X-RateLimit-Limit', result.limit);
        response.setHeader('X-RateLimit-Remaining', result.remaining);
        response.setHeader('X-RateLimit-Reset', result.resetTime);
      }

      return true;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      
      if (config.skipOnError) {
        this.warn(`Rate limit check failed, skipping: ${error}`);
        return true;
      }
      
      throw new HttpException({
        code: ERROR_CODES.INTERNAL_ERROR,
        message: 'Rate limit check failed',
      }, HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  private async checkRateLimit(
    userId: string,
    actionType: string,
    limits: { perMin?: number; perHour: number },
    customKey?: string,
    request?: any,
  ): Promise<{ 
    allowed: boolean; 
    remaining: number; 
    limit: number;
    resetTime: number;
    window: string;
    retryAfter?: number;
  }> {
    const now = Date.now();
    const minuteWindow = Math.floor(now / 60000);
    const hourWindow = Math.floor(now / 3600000);

    const baseKey = customKey || `${actionType}:${userId}`;
    const minuteKey = `ratelimit:${baseKey}:min:${minuteWindow}`;
    const hourKey = `ratelimit:${baseKey}:hour:${hourWindow}`;

    // Use pipeline for atomic operations
    const client = this.redisService.getClient();
    
    let minCount: number, hourCount: number;
    
    try {
      // Use multi/exec for atomicity
      const multi = client.multi();
      multi.incr(minuteKey);
      multi.incr(hourKey);
      multi.ttl(minuteKey);
      multi.ttl(hourKey);
      
      const results = await multi.exec();
      minCount = results?.[0]?.[1] as number || 1;
      hourCount = results?.[1]?.[1] as number || 1;
      const minTtl = results?.[2]?.[1] as number || 60;
      const hourTtl = results?.[3]?.[1] as number || 3600;

      // Set expiry if first request
      if (minCount === 1) await client.expire(minuteKey, 60);
      if (hourCount === 1) await client.expire(hourKey, 3600);

      const minLimit = limits.perMin || limits.perHour;
      const hourLimit = limits.perHour;

      const allowed = (!limits.perMin || minCount <= minLimit) && hourCount <= hourLimit;
      const remaining = Math.min(
        limits.perMin ? Math.max(0, minLimit - minCount) : hourLimit,
        Math.max(0, hourLimit - hourCount),
      );

      let window = 'ok';
      let retryAfter: number | undefined;
      
      if (!allowed) {
        if (limits.perMin && minCount > minLimit) {
          window = 'minute';
          retryAfter = Math.max(1, 60 - (now % 60000) / 1000);
        } else {
          window = 'hour';
          retryAfter = Math.max(1, 3600 - (now % 3600000) / 1000);
        }
      }

      return {
        allowed,
        remaining,
        limit: hourLimit,
        resetTime: Math.floor((now + (retryAfter || 3600) * 1000) / 1000),
        window,
        retryAfter,
      };
    } catch (error) {
      // Fallback to simple incr if pipeline fails
      const [min, hour] = await Promise.all([
        this.redisService.incr(minuteKey),
        this.redisService.incr(hourKey),
      ]);

      if (min === 1) await this.redisService.expire(minuteKey, 60);
      if (hour === 1) await this.redisService.expire(hourKey, 3600);

      const minLimit = limits.perMin || limits.perHour;
      const hourLimit = limits.perHour;
      const allowed = (!limits.perMin || min <= minLimit) && hour <= hourLimit;

      return {
        allowed,
        remaining: Math.max(0, hourLimit - hour),
        limit: hourLimit,
        resetTime: Math.floor((now + 3600000) / 1000),
        window: allowed ? 'ok' : (limits.perMin && min > minLimit ? 'minute' : 'hour'),
        retryAfter: allowed ? undefined : (limits.perMin && min > minLimit ? 60 : 3600),
      };
    }
  }

  private getRateLimitMessage(actionType: string, window: string): string {
    const messages: Record<string, string> = {
      ai_call: 'Too many AI requests. Please slow down.',
      search: 'Too many search requests. Please wait a moment.',
      upload: 'Too many uploads. Please try again later.',
      coupon: 'Too many coupon attempts. Maximum 3 per hour per order.',
      referral: 'Too many referral attempts. Please try again later.',
      review: 'Too many review submissions. Please slow down.',
    };

    const base = messages[actionType] || 'Rate limit exceeded';
    return window === 'minute' ? `${base} (minute limit)` : `${base} (hour limit)`;
  }

  private warn(message: string): void {
    console.warn(`[AbusePreventionGuard] ${message}`);
  }
}

/**
 * Specialized guard for coupon attempt limiting (per order per hour).
 */
@Injectable()
export class CouponAbuseGuard implements CanActivate {
  private readonly MAX_ATTEMPTS_PER_HOUR = 3;
  private readonly WINDOW_SECONDS = 3600;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id;
    const orderId = request.body?.orderId || request.params?.orderId || request.query?.orderId;
    const couponCode = request.body?.couponCode || request.body?.coupon_code;

    if (!userId || !orderId) {
      throw new ForbiddenException('User ID and Order ID required for coupon validation');
    }

    const key = `coupon:attempts:${userId}:${orderId}`;
    const current = await this.redisService.get(key);
    const attempts = current ? parseInt(current, 10) : 0;

    if (attempts >= this.MAX_ATTEMPTS_PER_HOUR) {
      const ttl = await this.redisService.ttl(key);
      throw new HttpException({
        code: ERROR_CODES.RATE_LIMITED,
        message: `Maximum coupon attempts (${this.MAX_ATTEMPTS_PER_HOUR}) reached for this order. Try again in ${ttl} seconds.`,
        retryAfter: ttl,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    // Increment for this attempt
    const newAttempts = await this.redisService.incr(key);
    if (newAttempts === 1) {
      await this.redisService.expire(key, this.WINDOW_SECONDS);
    }

    // Add headers
    const response = context.switchToHttp().getResponse();
    if (response) {
      response.setHeader('X-Coupon-Attempts-Remaining', this.MAX_ATTEMPTS_PER_HOUR - newAttempts);
    }

    return true;
  }
}

/**
 * Specialized guard for search rate limiting.
 */
@Injectable()
export class SearchRateLimitGuard implements CanActivate {
  private readonly PER_MINUTE = 60;
  private readonly PER_HOUR = 300;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip || 'anonymous';

    return this.checkLimit(request, userId, 'search', this.PER_MINUTE, this.PER_HOUR);
  }

  private async checkLimit(
    request: any,
    userId: string,
    actionType: string,
    perMin: number,
    perHour: number,
  ): Promise<boolean> {
    const now = Date.now();
    const minuteKey = `ratelimit:${actionType}:min:${userId}:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${actionType}:hour:${userId}:${Math.floor(now / 3600000)}`;

    const [minCount, hourCount] = await Promise.all([
      this.redisService.incr(minuteKey),
      this.redisService.incr(hourKey),
    ]);

    if (minCount === 1) await this.redisService.expire(minuteKey, 60);
    if (hourCount === 1) await this.redisService.expire(hourKey, 3600);

    if (minCount > perMin || hourCount > perHour) {
      const response = request.res;
      if (response) {
        response.setHeader('X-RateLimit-Limit', perHour);
        response.setHeader('X-RateLimit-Remaining', 0);
      }
      
      throw new HttpException({
        code: ERROR_CODES.RATE_LIMITED,
        message: minCount > perMin 
          ? `Too many search requests per minute (limit: ${perMin})`
          : `Too many search requests per hour (limit: ${perHour})`,
        retryAfter: minCount > perMin ? 60 : 3600,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    const response = request.res;
    if (response) {
      response.setHeader('X-RateLimit-Limit', perHour);
      response.setHeader('X-RateLimit-Remaining', Math.max(0, perHour - hourCount));
    }

    return true;
  }
}

/**
 * Specialized guard for AI call rate limiting.
 */
@Injectable()
export class AIRateLimitGuard implements CanActivate {
  private readonly PER_MINUTE = 20;
  private readonly PER_HOUR = 100;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip || 'anonymous';

    return this.checkLimit(request, userId, 'ai_call', this.PER_MINUTE, this.PER_HOUR);
  }

  private async checkLimit(
    request: any,
    userId: string,
    actionType: string,
    perMin: number,
    perHour: number,
  ): Promise<boolean> {
    const now = Date.now();
    const minuteKey = `ratelimit:${actionType}:min:${userId}:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${actionType}:hour:${userId}:${Math.floor(now / 3600000)}`;

    const [minCount, hourCount] = await Promise.all([
      this.redisService.incr(minuteKey),
      this.redisService.incr(hourKey),
    ]);

    if (minCount === 1) await this.redisService.expire(minuteKey, 60);
    if (hourCount === 1) await this.redisService.expire(hourKey, 3600);

    if (minCount > perMin || hourCount > perHour) {
      throw new HttpException({
        code: ERROR_CODES.RATE_LIMITED,
        message: minCount > perMin 
          ? `Too many AI requests per minute (limit: ${perMin})`
          : `Too many AI requests per hour (limit: ${perHour})`,
        retryAfter: minCount > perMin ? 60 : 3600,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}

/**
 * Specialized guard for upload rate limiting.
 */
@Injectable()
export class UploadRateLimitGuard implements CanActivate {
  private readonly PER_MINUTE = 10;
  private readonly PER_HOUR = 50;

  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip || 'anonymous';

    return this.checkLimit(request, userId, 'upload', this.PER_MINUTE, this.PER_HOUR);
  }

  private async checkLimit(
    request: any,
    userId: string,
    actionType: string,
    perMin: number,
    perHour: number,
  ): Promise<boolean> {
    const now = Date.now();
    const minuteKey = `ratelimit:${actionType}:min:${userId}:${Math.floor(now / 60000)}`;
    const hourKey = `ratelimit:${actionType}:hour:${userId}:${Math.floor(now / 3600000)}`;

    const [minCount, hourCount] = await Promise.all([
      this.redisService.incr(minuteKey),
      this.redisService.incr(hourKey),
    ]);

    if (minCount === 1) await this.redisService.expire(minuteKey, 60);
    if (hourCount === 1) await this.redisService.expire(hourKey, 3600);

    if (minCount > perMin || hourCount > perHour) {
      throw new HttpException({
        code: ERROR_CODES.RATE_LIMITED,
        message: minCount > perMin 
          ? `Too many uploads per minute (limit: ${perMin})`
          : `Too many uploads per hour (limit: ${perHour})`,
        retryAfter: minCount > perMin ? 60 : 3600,
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}