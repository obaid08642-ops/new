/**
 * Redis role resolution (14.14 — config + helpers only, NOT infra).
 *
 * Two logical Redis roles share one physical URL until infra splits them:
 * - `REDIS_QUEUE_URL` — queues/jobs (BullMQ). Persistence-critical; must not
 *   share eviction pressure with cache once split.
 * - `REDIS_CACHE_URL` — ephemeral cache (interceptors, SWR, rate-limit
 *   spillover). Eviction-tolerant (`maxmemory-policy allkeys-lru` class).
 *
 * Fallback chain per role: `REDIS_<ROLE>_URL` -> `REDIS_URL` -> `''`.
 * `REDIS_URL` remains the only required var (see `config/env.validation.ts`);
 * the role vars are OPTIONAL overrides so a single-Redis deploy keeps working.
 *
 * Infra (separate instances, `deploy/redis.conf`, connection wiring inside
 * `modules/redis/*`) is explicitly DEFERRED to the infra owner — this module
 * never creates a client, it only resolves which URL each role should use.
 */

export interface RedisRoleResolution {
  /** URL the queue role should dial (REDIS_QUEUE_URL ?? REDIS_URL). */
  queueUrl: string;
  /** URL the cache role should dial (REDIS_CACHE_URL ?? REDIS_URL). */
  cacheUrl: string;
  /** Which env var actually supplied each role (`'base'` = REDIS_URL fallback). */
  source: { queue: 'queue' | 'base'; cache: 'cache' | 'base' };
  /** True when both roles currently point at the same deployment. */
  shared: boolean;
}

type EnvLike = Record<string, string | undefined>;

function pick(value: string | undefined): string {
  return (value ?? '').trim();
}

/**
 * Resolve per-role Redis URLs with fallback to the shared base URL.
 * Pure function — takes an env-like map so it is trivially unit-testable and
 * never touches `process.env` itself. Callers pass `process.env`.
 */
export function resolveRedisRoles(env: EnvLike = process.env): RedisRoleResolution {
  const base = pick(env.REDIS_URL);
  const queueOverride = pick(env.REDIS_QUEUE_URL);
  const cacheOverride = pick(env.REDIS_CACHE_URL);
  const queueUrl = queueOverride || base;
  const cacheUrl = cacheOverride || base;
  return {
    queueUrl,
    cacheUrl,
    source: {
      queue: queueOverride ? 'queue' : 'base',
      cache: cacheOverride ? 'cache' : 'base',
    },
    shared: queueUrl === cacheUrl,
  };
}

/**
 * Redact credentials for safe logging (keeps host/db visible, hides password).
 * `redis://:secret@host:6379/0` -> `redis://:***@host:6379/0`.
 */
export function redactRedisUrl(url: string): string {
  if (!url) return '';
  return url.replace(/:\/\/([^/@:]+)(:[^/@]*)?@/g, '://$1:***@').replace(/:\/\/:([^/@]*)@/g, '://:***@');
}
