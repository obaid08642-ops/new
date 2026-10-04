/**
 * Stale-while-revalidate (SWR) cache with TTL+jitter and singleflight (14.14).
 *
 * Framework-agnostic helper (no Nest/Redis imports) so it is usable for
 * in-memory hot-path caching in front of Redis/network fetches. The Redis
 * roles that back persistent caching live in `./redis-roles`; infra wiring is
 * deferred — this file only dedupes and paces fetches.
 *
 * Semantics of `getOrFetch(key, fetch, { ttlMs, staleMs, jitterRatio })`:
 * - MISS (`now >= staleUntil` or no entry): exactly ONE `fetch()` runs even
 *   with N concurrent callers (singleflight); all callers await it.
 * - STALE (`freshUntil <= now < staleUntil`): the stale value returns
 *   immediately while ONE background refresh runs (singleflight); a failed
 *   refresh keeps serving stale until `staleUntil`.
 * - FRESH (`now < freshUntil`): value returns with no fetch.
 *
 * TTL+jitter: the fresh window is `ttlMs ± ttlMs*jitterRatio` (uniform,
 * symmetric) to decorrelate expirations and avoid thundering-herd stampedes.
 */

export interface SwrEntry<T> {
  value: T;
  /** Exclusive upper bound of the fresh window (epoch ms). */
  freshUntil: number;
  /** Exclusive upper bound of the stale-serve window (epoch ms). */
  staleUntil: number;
}

export type SwrStatus = 'fresh-fetch' | 'fresh-hit' | 'stale';

export interface SwrResult<T> {
  value: T;
  status: SwrStatus;
}

export interface SwrFetchOptions {
  /** Fresh window before jitter, ms. Default 60_000. */
  ttlMs?: number;
  /** Extra stale-serve window after the fresh window, ms. Default 300_000. */
  staleMs?: number;
  /** Symmetric jitter ratio applied to `ttlMs` (0 = deterministic). Default 0.1. */
  jitterRatio?: number;
}

/**
 * `baseTtlMs ± baseTtlMs*jitterRatio`, uniform via `rand()` in [0,1).
 * Pure — inject `rand` in tests for determinism.
 */
export function computeTtlWithJitter(
  baseTtlMs: number,
  jitterRatio = 0.1,
  rand: () => number = Math.random,
): number {
  if (!Number.isFinite(baseTtlMs) || baseTtlMs <= 0) return 0;
  const ratio = !Number.isFinite(jitterRatio) || jitterRatio < 0 ? 0 : jitterRatio;
  if (ratio === 0) return Math.floor(baseTtlMs);
  return Math.floor(baseTtlMs * (1 - ratio + 2 * ratio * rand()));
}

const DEFAULT_TTL_MS = 60_000;
const DEFAULT_STALE_MS = 300_000;
const DEFAULT_JITTER = 0.1;

export class SwrCache<T = unknown> {
  private readonly entries = new Map<string, SwrEntry<T>>();
  /** Singleflight: key -> in-flight fetch shared by concurrent callers. */
  private readonly inflight = new Map<string, Promise<T>>();
  private readonly now: () => number;
  private readonly rand: () => number;

  constructor(opts?: { now?: () => number; rand?: () => number }) {
    this.now = opts?.now ?? Date.now;
    this.rand = opts?.rand ?? Math.random;
  }

  async getOrFetch(key: string, fetch: () => Promise<T>, opts: SwrFetchOptions = {}): Promise<SwrResult<T>> {
    const ttlMs = opts.ttlMs ?? DEFAULT_TTL_MS;
    const staleMs = opts.staleMs ?? DEFAULT_STALE_MS;
    const jitterRatio = opts.jitterRatio ?? DEFAULT_JITTER;
    const now = this.now();
    const entry = this.entries.get(key);

    if (entry && now < entry.freshUntil) {
      return { value: entry.value, status: 'fresh-hit' };
    }

    if (entry && now < entry.staleUntil) {
      // Stale-serve + single background refresh (fire-and-forget, deduped).
      void this.refreshInBackground(key, fetch, ttlMs, staleMs, jitterRatio).catch(() => {
        /* refresh failures keep serving stale; never reject the reader */
      });
      return { value: entry.value, status: 'stale' };
    }

    // Miss or fully expired: blocking fetch, deduped across concurrent callers.
    const value = await this.sharedFetch(key, fetch);
    this.entries.set(key, this.buildEntry(value, ttlMs, staleMs, jitterRatio));
    return { value, status: 'fresh-fetch' };
  }

  /** Test/ops introspection. */
  size(): number {
    return this.entries.size;
  }

  inflightCount(): number {
    return this.inflight.size;
  }

  delete(key: string): void {
    this.entries.delete(key);
  }

  clear(): void {
    this.entries.clear();
  }

  private sharedFetch(key: string, fetch: () => Promise<T>): Promise<T> {
    const existing = this.inflight.get(key);
    if (existing) return existing;
    const promise = fetch().finally(() => {
      if (this.inflight.get(key) === promise) this.inflight.delete(key);
    });
    this.inflight.set(key, promise);
    return promise;
  }

  private async refreshInBackground(
    key: string,
    fetch: () => Promise<T>,
    ttlMs: number,
    staleMs: number,
    jitterRatio: number,
  ): Promise<void> {
    const value = await this.sharedFetch(key, fetch);
    this.entries.set(key, this.buildEntry(value, ttlMs, staleMs, jitterRatio));
  }

  private buildEntry(value: T, ttlMs: number, staleMs: number, jitterRatio: number): SwrEntry<T> {
    const now = this.now();
    const freshWindow = computeTtlWithJitter(ttlMs, jitterRatio, this.rand);
    const staleWindow = Number.isFinite(staleMs) && staleMs > 0 ? Math.floor(staleMs) : 0;
    return { value, freshUntil: now + freshWindow, staleUntil: now + freshWindow + staleWindow };
  }
}
