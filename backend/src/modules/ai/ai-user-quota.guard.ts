import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Optional, UnauthorizedException } from '@nestjs/common';
import { RedisService } from '../redis/redis.service';

/**
 * A paid AI call per signed-in user per day (AI_USER_DAILY_QUOTA, default 20). Counted in Redis under the user id and the
 * UTC day; past the limit the call answers 429 `ai_quota_exceeded` before the gateway is reached.
 */
@Injectable()
export class AiUserQuotaGuard implements CanActivate {
  constructor(@Optional() private readonly redis?: RedisService) {}

  static dailyLimit(): number {
    const n = parseInt(String(process.env.AI_USER_DAILY_QUOTA || ''), 10);
    return Number.isInteger(n) && n > 0 ? n : 20;
  }

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const userId = ctx.switchToHttp().getRequest()?.user?.id;
    if (typeof userId !== 'string' || !userId) throw new UnauthorizedException('authenticated_user_required');
    if (!this.redis) return true;
    const day = new Date().toISOString().slice(0, 10);
    const { allowed } = await this.redis.checkRateLimit(`ai-user:${userId}:${day}`, AiUserQuotaGuard.dailyLimit(), 86_400);
    if (!allowed) throw new HttpException({ code: 'ai_quota_exceeded', message: 'ai_quota_exceeded' }, HttpStatus.TOO_MANY_REQUESTS);
    return true;
  }
}
