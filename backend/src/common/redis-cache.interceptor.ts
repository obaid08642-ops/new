import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { RedisService } from '../modules/redis/redis.service';
import { PUBLIC_CACHE_KEY, PublicCacheOptions } from './public-cache.decorator';

/**
 * 14.7 — Redis response cache, gated on `@PublicCache` (never by URL prefix).
 *
 * The old version cached any GET without an `Authorization` header by URL for
 * 300 s — including cookie-authenticated requests — and stamped `public` on
 * them. A shared cache keyed that way serves one user's data to another.
 *
 * Now: only routes explicitly marked `@PublicCache` are stored or served, and
 * only when the request carries NO auth signal (no Authorization header, no
 * session cookie, no `req.user`). Everything else passes through untouched, so
 * the `CacheControlInterceptor` marks it private. Fail closed.
 *
 * Headers on a HIT match what the policy interceptor would set on a MISS
 * (public + s-maxage + stale directives + Cache-Tag), so HIT and MISS are
 * indistinguishable to the edge.
 */
@Injectable()
export class RedisCacheInterceptor implements NestInterceptor {
  constructor(
    private readonly redis: RedisService,
    private readonly reflector: Reflector,
  ) {}

  async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    if (String(request.method || 'GET').toUpperCase() !== 'GET') {
      return next.handle();
    }

    const policy = this.policyFor(context);
    if (!policy) return next.handle();
    if (this.hasAuthSignal(request)) return next.handle();

    const cacheKey = `http_cache:${request.originalUrl || request.url || ''}`;
    try {
      const cachedResponse = await this.redis.getClient().get(cacheKey);
      if (cachedResponse) {
        this.setPublicHeaders(response, policy);
        return of(JSON.parse(cachedResponse));
      }
    } catch {
      // A Redis failure must never fail the request — fall through to origin.
    }

    return next.handle().pipe(
      tap(async (data) => {
        if (!data) return;
        try {
          this.setPublicHeaders(response, policy);
          await this.redis.getClient().set(cacheKey, JSON.stringify(data), 'EX', policy.ttl);
        } catch {
          /* cache write failures are invisible to the caller */
        }
      }),
    );
  }

  private policyFor(context: ExecutionContext): PublicCacheOptions | undefined {
    return (
      this.reflector.get<PublicCacheOptions>(PUBLIC_CACHE_KEY, context.getHandler()) ??
      this.reflector.get<PublicCacheOptions>(PUBLIC_CACHE_KEY, context.getClass()) ??
      undefined
    );
  }

  private hasAuthSignal(request: any): boolean {
    const headers = request.headers || {};
    if (headers.authorization || headers.Authorization) return true;
    if (request.user) return true;
    const cookies: string = headers.cookie || headers.Cookie || '';
    if (cookies.trim()) return true;
    return false;
  }

  private setPublicHeaders(response: any, policy: PublicCacheOptions): void {
    try {
      response?.setHeader?.(
        'Cache-Control',
        `public, s-maxage=${policy.ttl}, stale-while-revalidate=60, stale-if-error=86400`,
      );
      if (policy.tags && policy.tags.length) {
        response?.setHeader?.('Cache-Tag', policy.tags.join(', '));
      }
    } catch {
      /* non-HTTP */
    }
  }
}
