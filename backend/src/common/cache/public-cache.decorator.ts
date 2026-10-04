import { SetMetadata } from '@nestjs/common';

// Single definition of the metadata key (was re-exported from the X0 file,
// now consolidated here so the old file can be removed).
export const PUBLIC_CACHE_KEY = 'publicCache';

/**
 * 14.7 — hardened successor of the X0 `@PublicCache` decorator.
 *
 * Uses the SAME metadata key (`publicCache`) as X0, so the existing
 * `CacheControlInterceptor` honors it and `RouteCachePolicyInterceptor`
 * (same directory) enforces the hardened policy. No controller changes here —
 * the rollout wave that wires this onto routes is tracked separately.
 *
 * Policy:
 * - default every response `private, no-store`;
 * - `@PublicCache(ttl, tags)` ONLY on `@Public()` GET reads sends
 *   `public, s-maxage, stale-while-revalidate` + `Cache-Tag` (+ `Vary:
 *   Accept-Language` iff `varyLanguage` is true);
 * - anything else (non-GET, authed request, `req.user` present, bad ttl/tags)
 *   fails closed to `private, no-store` at runtime.
 */
export const ROUTE_CACHE_MAX_TTL_SECONDS = 86400; // 24h
export const ROUTE_CACHE_MAX_TAGS = 10;
const TAG_RE = /^[a-z0-9][a-z0-9:_-]{0,63}$/i;

export interface PublicCacheOptions {
  ttlSeconds: number;
  tags?: string[];
  /** Set true only when the response body varies by locale. */
  varyLanguage?: boolean;
}

 /** Fail fast at startup: invalid cache metadata must never be registered. */
export function assertPublicCacheOptions(opts: PublicCacheOptions): void {
  const { ttlSeconds, tags, varyLanguage } = opts;
  if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1 || ttlSeconds > ROUTE_CACHE_MAX_TTL_SECONDS) {
    throw new Error(
      `[14.7] @PublicCache ttlSeconds must be an integer 1..${ROUTE_CACHE_MAX_TTL_SECONDS}, got ${String(ttlSeconds)}`,
    );
  }
  if (tags !== undefined) {
    if (!Array.isArray(tags) || tags.length < 1 || tags.length > ROUTE_CACHE_MAX_TAGS) {
      throw new Error(`[14.7] @PublicCache tags must be 1..${ROUTE_CACHE_MAX_TAGS} entries`);
    }
    for (const t of tags) {
      if (typeof t !== 'string' || !TAG_RE.test(t)) {
        throw new Error(`[14.7] @PublicCache tag ${JSON.stringify(t)} must match ${String(TAG_RE)}`);
      }
    }
  }
  if (varyLanguage !== undefined && typeof varyLanguage !== 'boolean') {
    throw new Error('[14.7] @PublicCache varyLanguage must be a boolean');
  }
}

/**
 * Marks a `@Public()` GET route as eligible for shared (CDN/Nginx) caching.
 * Validated at decoration time; re-validated at runtime (fail closed).
 */
export const PublicCache = (
  ttlSeconds: number,
  tags?: string[],
  opts?: { varyLanguage?: boolean },
): ReturnType<typeof SetMetadata> => {
  const options: PublicCacheOptions = { ttlSeconds, tags, varyLanguage: opts?.varyLanguage ?? false };
  assertPublicCacheOptions(options);
  return SetMetadata(PUBLIC_CACHE_KEY, options);
};
