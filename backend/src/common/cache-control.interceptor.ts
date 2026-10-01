import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PUBLIC_CACHE_KEY } from './public-cache.decorator';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const req = context.switchToHttp().getRequest();
    const res = context.switchToHttp().getResponse();
    const isGet = req.method === 'GET';

    // Default: every response is private and must not be stored in a shared cache.
    if (!isGet) {
      res.setHeader?.('Cache-Control', 'no-store, no-cache, must-revalidate');
      return next.handle();
    }

    // Check if the route is explicitly marked as public-cacheable.
    const publicCache = this.reflector.getAllAndOverride<{ ttlSeconds: number; tags?: string[] } | undefined>(
      PUBLIC_CACHE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Only allow public caching when:
    // 1. The route is marked with @PublicCache
    // 2. The request has no Authorization header
    // 3. The request has no session cookie
    const hasAuth = !!(req.headers?.['authorization'] || req.headers?.['Authorization']);
    const hasCookie = !!(req.headers?.['cookie'] || req.headers?.['Cookie']);
    const canCachePublicly = publicCache && !hasAuth && !hasCookie;

    return next.handle().pipe(
      tap(() => {
        if (canCachePublicly) {
          res.setHeader?.('Cache-Control', `public, max-age=${publicCache.ttlSeconds}, s-maxage=${publicCache.ttlSeconds}, stale-while-revalidate=60`);
          res.setHeader?.('Vary', 'Accept-Encoding, Accept-Language, Authorization, Cookie');
          res.setHeader?.('X-Cache-Hint', 'public');
        } else {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private');
        }
      }),
    );
  }
}
