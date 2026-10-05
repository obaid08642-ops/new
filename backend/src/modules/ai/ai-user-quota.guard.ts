import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Optional } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * R11 §5 lead 13: paid AI routes had only per-IP throttles (the global
 * throttler runs before authentication), so one account could keep spending
 * provider quota from rotating IPs. Each user gets AI_USER_DAILY_LIMIT calls
 * per UTC day across the paid AI routes. RedisService falls back to memory
 * per process, so the limit still holds when Redis is down.
 */
@Injectable()
export class AiUserQuotaGuard implements CanActivate {
  static readonly DEFAULT_DAILY_LIMIT = 100;

  constructor(@Optional() private readonly redis?: RedisService) {}

  private limit(): number {
    const n = Number(process.env.AI_USER_DAILY_LIMIT);
    return Number.isFinite(n) && n > 0 ? n : AiUserQuotaGuard.DEFAULT_DAILY_LIMIT;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const user = ctx.switchToHttp().getRequest()?.user;
    if (!user?.id) return true; // authentication is enforced by JwtAuthGuard before this guard
    if (user.role === 'admin' || user.role === 'super_admin') return true;
    const day = new Date().toISOString().slice(0, 10);
    const key = `ai:quota:${user.id}:${day}`;
    if (!this.redis) throw new HttpException('ai_quota_store_unavailable', HttpStatus.SERVICE_UNAVAILABLE);
    const used = await this.redis.incr(key);
    if (used === 1) await this.redis.expire(key, 26 * 3600);
    if (used > this.limit()) throw new HttpException('ai_daily_limit_reached', HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
