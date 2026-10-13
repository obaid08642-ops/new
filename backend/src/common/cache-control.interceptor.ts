import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PUBLIC_CACHE_KEY, PublicCacheOptions } from './public-cache.decorator';

/**
 * 14.7 — cache policy per route, not by URL prefix.
 *
 * The old interceptor marked whole URL prefixes as public (`/api/v1/medicines*`),
 * which also matched per-user paths (`/me/recently-viewed`) and never checked
 * for auth. A shared cache keyed that way serves one user's data to another —
 * the same leak class as the deleted edge worker, at the origin header level.
 *
 * Contract (pinned by route-cache-policy.p14.spec.ts):
 *  - No `@PublicCache` → `private, no-store`.
 *  - `@PublicCache` + any auth signal (Authorization header or `req.user`) →
 *    `private, no-store`. Fail closed.
 *  - `@PublicCache` + anonymous GET → `public, s-maxage=<ttl>,`
 *    `stale-while-revalidate=60, stale-if-error=86400`, plus `Cache-Tag` (14.8
 *    purge) and `Vary: Accept-Language` when the body depends on locale.
 *  - Non-GET → `no-store`.
 */
@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const method = String(req.method || 'GET').toUpperCase();

    if (method !== 'GET') {
      res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next.handle();
    }

    const meta = this.policyFor(context);
    return next.handle().pipe(
      tap(() => {
        // Handlers that take over the raw response (@Res()) may have already
        // sent it; setting headers then throws. They carry their own direct
        // Cache-Control (kept in sync with the decorator by inspection), so
        // skip rather than crash.
        if (res.headersSent) return;
        if (!meta) {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private');
          return;
        }
        if (this.hasAuthSignal(req)) {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private-authenticated');
          return;
        }
        res.setHeader?.(
          'Cache-Control',
          `public, s-maxage=${meta.ttl}, stale-while-revalidate=60, stale-if-error=86400`,
        );
        if (meta.tags && meta.tags.length) {
          res.setHeader?.('Cache-Tag', meta.tags.join(', '));
        }
        res.setHeader?.(
          'Vary',
          meta.varyLanguage ? 'Accept-Encoding, Accept-Language' : 'Accept-Encoding',
        );
        res.setHeader?.('X-Cache-Hint', 'public');
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

  /** Any signal that this request belongs to a signed-in user. */
  private hasAuthSignal(req: any): boolean {
    const headers = req.headers || {};
    if (headers.authorization || headers.Authorization) return true;
    if (req.user) return true;
    // Any cookie at all fails closed: the API is Bearer-token based, so a
    // cookie means the response might be personalized (or the request comes
    // through a BFF that personalized it). A shared cache must never serve it.
    const cookies: string = headers.cookie || headers.Cookie || '';
    if (cookies.trim()) return true;
    return false;
  }
}
