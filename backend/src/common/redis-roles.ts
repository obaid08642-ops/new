/**
 * Redis roles (14.14 / X12).
 *
 * - Queue role (`REDIS_QUEUE_URL`): BullMQ queues and workers. Needs
 *   persistence and `maxmemory-policy noeviction`.
 * - Cache role (`REDIS_CACHE_URL`): RedisService (cache, rate-limit and
 *   short-lived keys).
 *
 * Each role falls back to `REDIS_URL`, then to `REDIS_HOST`/`REDIS_PORT`/
 * `REDIS_PASSWORD`, so a single-Redis deployment keeps working unchanged.
 * Callers: RedisService (cache), BullModule.forRoot in app.module.ts and the
 * push queue (queue).
 */

export interface RedisRoleResolution {
  queueUrl: string;
  cacheUrl: string;
  /** True when both roles point at the same deployment. */
  shared: boolean;
}

type EnvLike = Record<string, string | undefined>;

function pick(value: string | undefined): string {
  return (value ?? '').trim();
}

/** REDIS_URL, else a URL built from REDIS_HOST / REDIS_PORT / REDIS_PASSWORD. */
export function baseRedisUrl(env: EnvLike = process.env): string {
  const url = pick(env.REDIS_URL);
  if (url) return url;
  const host = pick(env.REDIS_HOST) || 'localhost';
  const port = pick(env.REDIS_PORT) || '6379';
  const password = pick(env.REDIS_PASSWORD);
  return password ? `redis://:${encodeURIComponent(password)}@${host}:${port}` : `redis://${host}:${port}`;
}

export function resolveRedisRoles(env: EnvLike = process.env): RedisRoleResolution {
  const base = baseRedisUrl(env);
  const queueUrl = pick(env.REDIS_QUEUE_URL) || base;
  const cacheUrl = pick(env.REDIS_CACHE_URL) || base;
  return { queueUrl, cacheUrl, shared: queueUrl === cacheUrl };
}

export interface BullConnection {
  host: string;
  port: number;
  password: string | undefined;
  tls?: Record<string, never>;
}

/** BullMQ connection options for the queue role. */
export function bullConnectionFromEnv(env: EnvLike = process.env): BullConnection {
  const url = new URL(resolveRedisRoles(env).queueUrl);
  return {
    host: url.hostname || 'localhost',
    port: Number(url.port || '6379'),
    password: url.password ? decodeURIComponent(url.password) : (pick(env.REDIS_PASSWORD) || undefined),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
