import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from './redis.service';

/**
 * P14.14 cache rules for hot, rebuildable reads (home sections, categories, ranking):
 *  - TTL with jitter (±10%), so keys written together do not expire together;
 *  - stale-while-revalidate: after `ttl` the old value is still served for `swr` seconds while ONE caller refreshes it;
 *  - one database read per refresh, fleet-wide: callers in a process share one promise (single flight) and processes
 *    share a lock in the cache instance; the others wait briefly for the new value instead of reading the database;
 *  - Redis down: the in-process fallback of RedisService keeps the same rules per process.
 * Entries live in the cache role (`REDIS_CACHE_URL`), which may evict them at any time: a miss only costs one read.
 */
export interface HotCacheOptions {
  /** seconds the value is fresh */
  ttl: number;
  /** seconds a stale value may still be served while it is refreshed (default: ttl) */
  swr?: number;
}

type Stored<T> = { v: T; fresh_until: number };

@Injectable()
export class HotCache {
  private readonly logger = new Logger('HotCache');
  private readonly inflight = new Map<string, Promise<any>>();
  static readonly LOCK_MS = 10_000;
  static readonly WAIT_MS = 3_000;
  static readonly POLL_MS = 50;

  constructor(private readonly redis: RedisService) {}

  async get<T>(key: string, opts: HotCacheOptions, load: () => Promise<T>): Promise<T> {
    const entry = await this.read<T>(key);
    if (entry && entry.fresh_until > Date.now()) return entry.v;
    if (entry) {
      // stale: answer now, refresh behind (errors keep the stale copy until it expires)
      this.refresh(key, opts, load).catch((e) => this.logger.warn(`refresh ${key} failed: ${e?.message || e}`));
      return entry.v;
    }
    return this.refresh(key, opts, load);
  }

  /** Drop a key (after a write that changes it); the next read rebuilds it once. */
  async invalidate(key: string): Promise<void> {
    await this.redis.cacheDel(`hc:${key}`);
  }

  private async read<T>(key: string): Promise<Stored<T> | null> {
    const raw = await this.redis.cacheGet(`hc:${key}`).catch(() => null);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as Stored<T>;
    } catch {
      return null;
    }
  }

  private refresh<T>(key: string, opts: HotCacheOptions, load: () => Promise<T>): Promise<T> {
    const running = this.inflight.get(key);
    if (running) return running;
    const p = this.refreshOnce(key, opts, load).finally(() => this.inflight.delete(key));
    this.inflight.set(key, p);
    return p;
  }

  private async refreshOnce<T>(key: string, opts: HotCacheOptions, load: () => Promise<T>): Promise<T> {
    const before = await this.read<T>(key);
    if (await this.redis.cacheLock(`hc:lock:${key}`, HotCache.LOCK_MS)) {
      return this.loadAndStore(key, opts, load);
    }
    // another process is reading the database: serve what exists, or wait for its value
    if (before) return before.v;
    const until = Date.now() + HotCache.WAIT_MS;
    while (Date.now() < until) {
      await new Promise((r) => setTimeout(r, HotCache.POLL_MS));
      const e = await this.read<T>(key);
      if (e) return e.v;
    }
    // the lock holder died or is slow: read ourselves rather than fail the request
    return this.loadAndStore(key, opts, load);
  }

  private async loadAndStore<T>(key: string, opts: HotCacheOptions, load: () => Promise<T>): Promise<T> {
    const v = await load();
    const jitter = 1 + (Math.random() * 0.2 - 0.1);
    const ttl = Math.max(1, opts.ttl * jitter);
    const swr = Math.max(0, opts.swr ?? opts.ttl);
    const stored: Stored<T> = { v, fresh_until: Date.now() + ttl * 1000 };
    await this.redis.cacheSet(`hc:${key}`, JSON.stringify(stored), ttl + swr).catch(() => undefined);
    await this.redis.cacheDel(`hc:lock:${key}`).catch(() => undefined);
    return v;
  }
}
