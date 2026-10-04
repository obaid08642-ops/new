import { Injectable, CanActivate, ExecutionContext, HttpException, HttpStatus } from '@nestjs/common';
import { RedisService } from '../../modules/redis/redis.service';
import { ERROR_CODES } from '../errors';

@Injectable()
export class VelocityGuard implements CanActivate {
  constructor(private readonly redisService: RedisService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const userId = request.user?.id || request.ip; // Fallback to IP if not authenticated

    // Limit: 5 payments in 10 minutes (600 seconds)
    const MAX_ATTEMPTS = 5;
    const WINDOW_SECONDS = 600;

    const rateLimitKey = `velocity:payment:${userId}`;
    const { allowed, remaining } = await this.redisService.checkRateLimit(rateLimitKey, MAX_ATTEMPTS, WINDOW_SECONDS);

    if (!allowed) {
      throw new HttpException({
        code: ERROR_CODES.RATE_LIMITED,
        message: 'Too many payment attempts. Please try again after 10 minutes. (Velocity Check Failed)',
      }, HttpStatus.TOO_MANY_REQUESTS);
    }

    return true;
  }
}
