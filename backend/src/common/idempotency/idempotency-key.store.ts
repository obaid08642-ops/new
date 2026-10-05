import { createHash } from 'crypto';

/** Response TTL: replay window for a completed write (24h). */
export const IDEMPOTENCY_RESPONSE_TTL_SECONDS = 86400;
/** Lock TTL: in-flight guard for a concurrent duplicate (2 min). */
export const IDEMPOTENCY_LOCK_TTL_SECONDS = 120;
/** Client-supplied key bound (matches existing write-path contract). */
export const IDEMPOTENCY_MAX_KEY_LENGTH = 128;

/** Minimal Redis surface this store needs (satisfied by RedisService.getClient()). */
export interface IdempotencyRedisClient {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, ...args: Array<string | number>): Promise<string | null>;
  del(key: string): Promise<unknown>;
}

export interface CachedIdempotentResponse {
  request_hash: string;
  response: unknown;
}

export function buildIdempotencyKey(
  userId: string,
  method: string,
  path: string,
  clientKey: string,
): string {
  return `idempotency:${userId}:${method}:${path}:${clientKey}`;
}

export function lockKeyFor(recordKey: string): string {
  return `${recordKey}:lock`;
}

export function hashRequestBody(body: unknown): string {
  return createHash('sha256').update(JSON.stringify(body ?? {})).digest('hex');
}

export function parseCachedIdempotentResponse(raw: string | null): CachedIdempotentResponse | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return null;
    const candidate = parsed as { request_hash?: unknown; response?: unknown };
    if (typeof candidate.request_hash !== 'string') return null;
    return { request_hash: candidate.request_hash, response: candidate.response };
  } catch {
    return null;
  }
}

/**
 * Redis-backed idempotency record store with TTL.
 * Pure delegation over the injected client — no globals, no module wiring here.
 */
export class IdempotencyKeyStore {
  constructor(private readonly redis: IdempotencyRedisClient) {}

  findResponse(recordKey: string): Promise<CachedIdempotentResponse | null> {
    return this.redis.get(recordKey).then(parseCachedIdempotentResponse);
  }

  /**
   * Pre-shape records: `{ response }` persisted WITHOUT a `request_hash` by an
   * older writer. F2: the interceptor treats these as a MISS (execute +
   * overwrite with the hashed shape) so a reused key with a different body
   * cannot replay a stale response. Kept for observability/migration tooling;
   * the write path no longer replays them (see IdempotencyKeyInterceptor).
   */
  async findLegacyResponse(recordKey: string): Promise<{ found: boolean; response?: unknown }> {
    const raw = await this.redis.get(recordKey);
    if (!raw) return { found: false };
    try {
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== 'object' || parsed === null) return { found: false };
      const candidate = parsed as { request_hash?: unknown; response?: unknown };
      if (typeof candidate.request_hash === 'string') return { found: false };
      if (!('response' in candidate)) return { found: false };
      return { found: true, response: candidate.response };
    } catch {
      return { found: false };
    }
  }

  async acquireLock(recordKey: string): Promise<boolean> {
    const acquired = await this.redis.set(
      lockKeyFor(recordKey),
      '1',
      'EX',
      IDEMPOTENCY_LOCK_TTL_SECONDS,
      'NX',
    );
    return acquired === 'OK';
  }

  async saveResponse(recordKey: string, requestHash: string, response: unknown): Promise<void> {
    await this.redis.set(
      recordKey,
      JSON.stringify({ request_hash: requestHash, response }),
      'EX',
      IDEMPOTENCY_RESPONSE_TTL_SECONDS,
    );
    await this.redis.del(lockKeyFor(recordKey));
  }

  async releaseLock(recordKey: string): Promise<void> {
    await this.redis.del(lockKeyFor(recordKey));
  }
}
