import { SetMetadata } from '@nestjs/common';

export const PUBLIC_CACHE_KEY = 'publicCache';

/**
 * Marks a route as eligible for shared (CDN/Nginx) caching.
 *
 * Only `@Public()` read routes may use this. The response is cached only when
 * the request carries no `Authorization` header and no session cookie —
 * authenticated requests always bypass the shared cache.
 *
 * @param ttlSeconds  Time-to-live in seconds for the shared cache.
 * @param tags        Optional cache tags for purging.
 */
export const PublicCache = (ttlSeconds: number, tags?: string[]) =>
  SetMetadata(PUBLIC_CACHE_KEY, { ttlSeconds, tags });
