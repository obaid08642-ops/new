import { SetMetadata } from '@nestjs/common';

/** Metadata key for {@link PublicCache}. */
export const PUBLIC_CACHE_KEY = 'nabd_public_cache';

export interface PublicCacheOptions {
  /** Seconds an edge/shared cache may serve the response (`s-maxage`). */
  ttl: number;
  /** Cache tags for 14.8 instant purge (sent as the `Cache-Tag` header). */
  tags?: string[];
  /** Set when the body depends on locale — adds `Vary: Accept-Language`. */
  varyLanguage?: boolean;
  /**
   * The exact Cache-Control of an anonymous answer, when the default (`public, s-maxage=<ttl>, ...`) does not fit the route
   * (issue 1544: suggestions also set `max-age` and a one-day stale-while-revalidate). The auth fail-closed rule still applies.
   */
  cacheControl?: string;
}

/**
 * 14.7 — mark a GET route as publicly cacheable, per route (never by URL
 * prefix).
 *
 * A route WITHOUT this decorator answers `private, no-store`. A route WITH it
 * still answers `private, no-store` when the request carries any auth signal
 * (Authorization header or `req.user`) — fail closed, so a logged-in user
 * never receives a shared cached copy.
 *
 * A `@PublicCache` handler MUST NOT read the user (`@CurrentUser`, `req.user`).
 * The route-table gate (`route-cache-table.p14.spec.ts`) fails the build if it
 * does — a public route that needs the user is a cross-user leak, not a
 * cacheable route.
 */
export const PublicCache = (ttl: number, tags: string[] = [], options: { varyLanguage?: boolean; cacheControl?: string } = {}) =>
  SetMetadata(PUBLIC_CACHE_KEY, {
    ttl,
    tags,
    varyLanguage: options.varyLanguage ?? false,
    ...(options.cacheControl ? { cacheControl: options.cacheControl } : {}),
  } as PublicCacheOptions);
