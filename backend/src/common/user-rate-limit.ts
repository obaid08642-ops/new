import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable, Optional, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from '../modules/redis/redis.service';

/**
 * Phase 16.12 - a per-USER ceiling on an expensive action (uploads, search, ...). The global throttler counts per IP, which
 * a person behind a shared address shares with strangers and a script with many addresses escapes; this counts per account
 * (per IP only for a visitor who is not signed in).
 *
 *   @UseGuards(UserRateLimitGuard) @UserRateLimit('upload', 30, 3600)  // 30 uploads an hour per account
 *
 * The limit can be tuned without a deploy: USER_RATE_LIMIT_<BUCKET>=<limit>/<window seconds> (e.g. USER_RATE_LIMIT_UPLOAD=60/3600).
 * Counted in Redis (RedisService falls back to memory); past the limit the answer is 429 `rate_limited` with Retry-After.
 */
export const USER_RATE_LIMIT_KEY = 'user_rate_limit';

export interface UserRateLimitSpec { bucket: string; limit: number; windowSeconds: number }

export const UserRateLimit = (bucket: string, limit: number, windowSeconds: number) =>
  SetMetadata(USER_RATE_LIMIT_KEY, { bucket, limit, windowSeconds } satisfies UserRateLimitSpec);

/** The spec with the environment override applied; a malformed override is ignored, never "unlimited". */
export function effectiveSpec(spec: UserRateLimitSpec, env: NodeJS.ProcessEnv = process.env): UserRateLimitSpec {
  const raw = env[`USER_RATE_LIMIT_${spec.bucket.toUpperCase().replace(/[^A-Z0-9]/g, '_')}`];
  const m = /^(\d{1,7})\/(\d{1,7})$/.exec(String(raw ?? '').trim());
  if (!m || Number(m[1]) < 1 || Number(m[2]) < 1) return spec;
  return { bucket: spec.bucket, limit: Number(m[1]), windowSeconds: Number(m[2]) };
}

@Injectable()
export class UserRateLimitGuard implements CanActivate {
  constructor(private readonly reflector: Reflector, @Optional() private readonly redis?: RedisService) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const found = this.reflector.getAllAndOverride<UserRateLimitSpec | undefined>(USER_RATE_LIMIT_KEY, [ctx.getHandler(), ctx.getClass()]);
    if (!found || !this.redis) return true;
    const spec = effectiveSpec(found);
    const req = ctx.switchToHttp().getRequest();
    const who = typeof req?.user?.id === 'string' && req.user.id ? `u:${req.user.id}` : `ip:${req?.ip ?? 'unknown'}`;
    const { allowed } = await this.redis.checkRateLimit(`user-limit:${spec.bucket}:${who}`, spec.limit, spec.windowSeconds);
    if (!allowed) {
      ctx.switchToHttp().getResponse()?.setHeader?.('Retry-After', String(spec.windowSeconds));
      throw new HttpException({ statusCode: 429, code: 'rate_limited', message: 'rate_limited', bucket: spec.bucket }, HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
