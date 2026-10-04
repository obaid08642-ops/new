import { SetMetadata } from '@nestjs/common';

export const PUBLIC_CACHE_KEY = 'publicCache';

/**
 * Marks a route as eligible for shared (CDN/Nginx) caching.
 *
 * ONLY for `@Public()` GET routes. Enforced at runtime by
 * CacheControlInterceptor: @PublicCache on a non-@Public() route is ignored
 * (fails closed to `private, no-store`). The response is cached only when the
 * request carries no `Authorization` header and no session cookie —
 * authenticated requests always bypass the shared cache. When `tags` are
 * given, they are emitted as a `Cache-Tag` header for purge-by-tag.
 *
 * There are no URL-prefix public lists: the default for every response is
 * `private, no-store`; `public` is strictly opt-in per route.
 *
 * @param ttlSeconds  Time-to-live in seconds for the shared cache.
 * @param tags        Optional cache tags for purging.
 */
export const PublicCache = (ttlSeconds: number, tags?: string[]) =>
  SetMetadata(PUBLIC_CACHE_KEY, { ttlSeconds, tags });
