import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PUBLIC_CACHE_KEY } from './public-cache.decorator';
import { PUBLIC_KEY } from './auth.guard';

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
    // X0: @PublicCache is honored ONLY on @Public() read routes. If the
    // decorator was added to an authenticated route by mistake, the route
    // stays private — the mistake fails closed, never open.
    const isPublic = this.reflector.getAllAndOverride<boolean>(PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    const publicCache = this.reflector.getAllAndOverride<{ ttlSeconds: number; tags?: string[] } | undefined>(
      PUBLIC_CACHE_KEY,
      [context.getHandler(), context.getClass()],
    );

    // Only allow public caching when:
    // 1. The route is marked with @PublicCache
    // 2. The route is also marked with @Public()
    // 3. The request has no Authorization header
    // 4. The request has no session cookie
    const hasAuth = !!(req.headers?.['authorization'] || req.headers?.['Authorization']);
    const hasCookie = !!(req.headers?.['cookie'] || req.headers?.['Cookie']);
    const canCachePublicly = !!(isPublic && publicCache && !hasAuth && !hasCookie);

    return next.handle().pipe(
      tap(() => {
        if (canCachePublicly && publicCache) {
          res.setHeader?.('Cache-Control', `public, max-age=${publicCache.ttlSeconds}, s-maxage=${publicCache.ttlSeconds}, stale-while-revalidate=60`);
          res.setHeader?.('Vary', 'Accept-Encoding, Accept-Language, Authorization, Cookie');
          if (publicCache.tags?.length) {
            res.setHeader?.('Cache-Tag', publicCache.tags.join(','));
          }
          res.setHeader?.('X-Cache-Hint', 'public');
        } else {
          res.setHeader?.('Cache-Control', 'private, no-store');
          res.setHeader?.('X-Cache-Hint', 'private');
        }
      }),
    );
  }
}
