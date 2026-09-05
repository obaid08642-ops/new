import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import Redis from 'ioredis';

/** Canonical Redis URL resolution shared by every Redis consumer in the app. */
export function redisUrlFromEnv(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  const host = process.env.REDIS_HOST || 'localhost';
  const port = process.env.REDIS_PORT || '6379';
  const password = process.env.REDIS_PASSWORD;
  return password ? `redis://:${password}@${host}:${port}` : `redis://${host}:${port}`;
}

type Entry = { v: any; exp?: number };

/**
 * Central Redis access layer with a per-process in-memory fallback.
 *
 * When the Redis server is unreachable (outage, misconfiguration, local dev
 * without Redis) every operation degrades to an expiring in-process store
 * instead of throwing/hanging — cache misses are acceptable, request 500s are
 * not. The fallback is per-process (not shared across replicas), so it is a
 * resilience net, never a primary store. A single warning is logged when the
 * fallback first activates.
 */
@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger('RedisService');
  private client: Redis;
  private subscriber: Redis;
  private publisher: Redis;
  private ready = false;
  private warned = false;

  // ── In-memory fallback stores ────────────────────────────────
  private memKv = new Map<string, Entry>();
  private memHash = new Map<string, Map<string, string> & { exp?: number }>();
  private memSets = new Map<string, Set<string> & { exp?: number }>();
  private memZset = new Map<string, { items: { score: number; member: string }[]; exp?: number }>();
  private sweeper: NodeJS.Timeout;

  onModuleInit() {
    const redisUrl = redisUrlFromEnv();
    const options = {
      retryStrategy: (times: number) => Math.min(times * 100, 3000),
      maxRetriesPerRequest: 3,
      enableOfflineQueue: false,
      lazyConnect: false,
    };
    this.client = new Redis(redisUrl, options);
    this.subscriber = new Redis(redisUrl, options);
    this.publisher = new Redis(redisUrl, options);

    const markReady = () => { this.ready = true; this.logger.log('Redis connected'); };
    const markDown = () => { this.ready = false; this.fallbackWarn(); };
    for (const c of [this.client, this.subscriber, this.publisher]) {
      c.on('ready', markReady);
      c.on('error', () => markDown());
      c.on('end', () => { this.ready = false; });
    }

    // Purge expired fallback keys every 30s
    this.sweeper = setInterval(() => this.sweep(), 30000);
    this.sweeper.unref();
  }

  async onModuleDestroy() {
    clearInterval(this.sweeper);
    await this.client?.quit().catch(() => undefined);
    await this.subscriber?.quit().catch(() => undefined);
    await this.publisher?.quit().catch(() => undefined);
  }

  private fallbackWarn() {
    if (!this.warned) {
      this.warned = true;
      this.logger.warn('Redis unavailable — using in-memory fallback store (per-process, not shared across replicas)');
    }
  }

  // ── Fallback primitives ──────────────────────────────────────
  private alive(e?: Entry | { exp?: number }): boolean {
    if (!e) return false;
    if (e.exp && e.exp <= Date.now()) return false;
    return true;
  }

  private memGet(key: string): string | null {
    const e = this.memKv.get(key);
    if (!this.alive(e)) { this.memKv.delete(key); return null; }
    return e!.v;
  }

  private memSet(key: string, v: string, ttlSeconds?: number) {
    this.memKv.set(key, { v, exp: ttlSeconds ? Date.now() + ttlSeconds * 1000 : undefined });
  }

  private sweep() {
    const now = Date.now();
    for (const [k, e] of this.memKv) if (e.exp && e.exp <= now) this.memKv.delete(k);
    for (const [k, e] of this.memHash) if (e.exp && e.exp <= now) this.memHash.delete(k);
    for (const [k, e] of this.memSets) if (e.exp && e.exp <= now) this.memSets.delete(k);
    for (const [k, e] of this.memZset) if (e.exp && e.exp <= now) this.memZset.delete(k);
  }

  // ── Core operations ──────────────────────────────────────────
  async get(key: string): Promise<string | null> {
    if (this.ready) { try { return await this.client.get(key); } catch { /* fall through */ } }
    return this.memGet(key);
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    if (this.ready) {
      try {
        if (ttlSeconds) await this.client.setex(key, ttlSeconds, value);
        else await this.client.set(key, value);
        return;
      } catch { /* fall through */ }
    }
    this.memSet(key, value, ttlSeconds);
  }

  async del(key: string): Promise<void> {
    if (this.ready) { try { await this.client.del(key); return; } catch { /* fall through */ } }
    this.memKv.delete(key); this.memHash.delete(key); this.memSets.delete(key); this.memZset.delete(key);
  }

  async ttl(key: string): Promise<number> {
    if (this.ready) { try { return await this.client.ttl(key); } catch { /* fall through */ } }
    const e = this.memKv.get(key);
    if (!this.alive(e)) return -2;
    return e!.exp ? Math.max(0, Math.round((e!.exp - Date.now()) / 1000)) : -1;
  }

  async exists(key: string): Promise<boolean> {
    if (this.ready) { try { return (await this.client.exists(key)) > 0; } catch { /* fall through */ } }
    return this.memGet(key) !== null;
  }

  async incr(key: string): Promise<number> {
    if (this.ready) { try { return await this.client.incr(key); } catch { /* fall through */ } }
    const cur = this.memGet(key);
    const next = (parseInt(cur || '0', 10) || 0) + 1;
    const e = this.memKv.get(key);
    this.memKv.set(key, { v: String(next), exp: e?.exp });
    return next;
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (this.ready) { try { await this.client.expire(key, ttl); return; } catch { /* fall through */ } }
    const e = this.memKv.get(key);
    if (this.alive(e)) e!.exp = Date.now() + ttl * 1000;
  }

  async setnx(key: string, value: string): Promise<boolean> {
    if (this.ready) { try { return (await this.client.setnx(key, value)) === 1; } catch { /* fall through */ } }
    if (this.memGet(key) !== null) return false;
    this.memSet(key, value);
    return true;
  }

  async keys(pattern: string): Promise<string[]> {
    if (this.ready) { try { return await this.client.keys(pattern); } catch { /* fall through */ } }
    const re = new RegExp('^' + pattern.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.') + '$');
    const out: string[] = [];
    for (const k of this.memKv.keys()) if (this.memGet(k) !== null && re.test(k)) out.push(k);
    return out;
  }

  async mget(keys: string[]): Promise<(string | null)[]> {
    if (this.ready) { try { return await this.client.mget(...keys); } catch { /* fall through */ } }
    return keys.map((k) => this.memGet(k));
  }

  // ── Hash operations ──────────────────────────────────────────
  private memHashOf(key: string): (Map<string, string> & { exp?: number }) | null {
    const h = this.memHash.get(key);
    if (!this.alive(h)) { this.memHash.delete(key); return null; }
    return h!;
  }

  async hset(key: string, field: string, value: string): Promise<void> {
    if (this.ready) { try { await this.client.hset(key, field, value); return; } catch { /* fall through */ } }
    let h = this.memHashOf(key);
    if (!h) { h = new Map() as Map<string, string> & { exp?: number }; this.memHash.set(key, h); }
    h.set(field, value);
  }

  async hget(key: string, field: string): Promise<string | null> {
    if (this.ready) { try { return await this.client.hget(key, field); } catch { /* fall through */ } }
    return this.memHashOf(key)?.get(field) ?? null;
  }

  async hgetall(key: string): Promise<Record<string, string>> {
    if (this.ready) { try { return await this.client.hgetall(key); } catch { /* fall through */ } }
    const h = this.memHashOf(key);
    return h ? Object.fromEntries(h.entries()) : {};
  }

  async hdel(key: string, field: string): Promise<void> {
    if (this.ready) { try { await this.client.hdel(key, field); return; } catch { /* fall through */ } }
    this.memHashOf(key)?.delete(field);
  }

  async hmset(key: string, data: Record<string, string>): Promise<void> {
    if (this.ready) { try { await this.client.hmset(key, data); return; } catch { /* fall through */ } }
    let h = this.memHashOf(key);
    if (!h) { h = new Map() as Map<string, string> & { exp?: number }; this.memHash.set(key, h); }
    for (const [f, v] of Object.entries(data)) h.set(f, v);
  }

  // ── Set operations ───────────────────────────────────────────
  private memSetOf(key: string): (Set<string> & { exp?: number }) | null {
    const s = this.memSets.get(key);
    if (!this.alive(s)) { this.memSets.delete(key); return null; }
    return s!;
  }

  async sadd(key: string, ...members: string[]): Promise<void> {
    if (this.ready) { try { await this.client.sadd(key, ...members); return; } catch { /* fall through */ } }
    let s = this.memSetOf(key);
    if (!s) { s = new Set() as Set<string> & { exp?: number }; this.memSets.set(key, s); }
    for (const m of members) s.add(m);
  }

  async srem(key: string, ...members: string[]): Promise<void> {
    if (this.ready) { try { await this.client.srem(key, ...members); return; } catch { /* fall through */ } }
    const s = this.memSetOf(key);
    if (s) for (const m of members) s.delete(m);
  }

  async smembers(key: string): Promise<string[]> {
    if (this.ready) { try { return await this.client.smembers(key); } catch { /* fall through */ } }
    const s = this.memSetOf(key);
    return s ? Array.from(s) : [];
  }

  async sismember(key: string, member: string): Promise<boolean> {
    if (this.ready) { try { return (await this.client.sismember(key, member)) === 1; } catch { /* fall through */ } }
    return this.memSetOf(key)?.has(member) ?? false;
  }

  // ── Sorted set operations ─────────────────────────────────────
  private memZsetOf(key: string): { items: { score: number; member: string }[]; exp?: number } | null {
    const z = this.memZset.get(key);
    if (!this.alive(z)) { this.memZset.delete(key); return null; }
    return z!;
  }

  async zadd(key: string, score: number, member: string): Promise<void> {
    if (this.ready) { try { await this.client.zadd(key, score, member); return; } catch { /* fall through */ } }
    let z = this.memZsetOf(key);
    if (!z) { z = { items: [] }; this.memZset.set(key, z); }
    z.items = z.items.filter((i) => i.member !== member);
    z.items.push({ score, member });
  }

  async zrem(key: string, member: string): Promise<void> {
    if (this.ready) { try { await this.client.zrem(key, member); return; } catch { /* fall through */ } }
    const z = this.memZsetOf(key);
    if (z) z.items = z.items.filter((i) => i.member !== member);
  }

  async zrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.ready) { try { return await this.client.zrange(key, start, stop); } catch { /* fall through */ } }
    const z = this.memZsetOf(key);
    if (!z) return [];
    const sorted = [...z.items].sort((a, b) => a.score - b.score).map((i) => i.member);
    const end = stop === -1 ? undefined : stop + 1;
    return sorted.slice(start, end);
  }

  async zrangebyscore(key: string, min: number, max: number): Promise<string[]> {
    if (this.ready) { try { return await this.client.zrangebyscore(key, min, max); } catch { /* fall through */ } }
    const z = this.memZsetOf(key);
    if (!z) return [];
    return z.items.filter((i) => i.score >= min && i.score <= max).sort((a, b) => a.score - b.score).map((i) => i.member);
  }

  async zincrby(key: string, increment: number, member: string): Promise<number> {
    if (this.ready) {
      try {
        const res = await this.client.zincrby(key, increment, member);
        return parseFloat(res);
      } catch { /* fall through */ }
    }
    let z = this.memZsetOf(key);
    if (!z) { z = { items: [] }; this.memZset.set(key, z); }
    const existing = z.items.find((i) => i.member === member);
    if (existing) {
      existing.score += increment;
      return existing.score;
    } else {
      z.items.push({ score: increment, member });
      return increment;
    }
  }

  async zrevrange(key: string, start: number, stop: number): Promise<string[]> {
    if (this.ready) {
      try {
        return await this.client.zrevrange(key, start, stop);
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    if (!z) return [];
    const sorted = [...z.items].sort((a, b) => b.score - a.score).map((i) => i.member);
    const end = stop === -1 ? undefined : stop + 1;
    return sorted.slice(start, end);
  }

  async zrevrangeWithScores(key: string, start: number, stop: number): Promise<{ member: string; score: number }[]> {
    if (this.ready) {
      try {
        const raw = await this.client.zrevrange(key, start, stop, 'WITHSCORES');
        const out: { member: string; score: number }[] = [];
        for (let i = 0; i < raw.length; i += 2) {
          out.push({ member: raw[i], score: parseFloat(raw[i + 1]) });
        }
        return out;
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    if (!z) return [];
    const sorted = [...z.items].sort((a, b) => b.score - a.score);
    const end = stop === -1 ? undefined : stop + 1;
    return sorted.slice(start, end).map((i) => ({ member: i.member, score: i.score }));
  }

  async zscore(key: string, member: string): Promise<number | null> {
    if (this.ready) {
      try {
        const s = await this.client.zscore(key, member);
        return s !== null ? parseFloat(s) : null;
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    if (!z) return null;
    const found = z.items.find((i) => i.member === member);
    return found ? found.score : null;
  }

  async zrevrank(key: string, member: string): Promise<number | null> {
    if (this.ready) {
      try {
        return await this.client.zrevrank(key, member);
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    if (!z) return null;
    const sorted = [...z.items].sort((a, b) => b.score - a.score);
    const idx = sorted.findIndex((i) => i.member === member);
    return idx >= 0 ? idx : null;
  }

  async zcard(key: string): Promise<number> {
    if (this.ready) {
      try {
        return await this.client.zcard(key);
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    return z ? z.items.length : 0;
  }

  async zremrangebyrank(key: string, start: number, stop: number): Promise<number> {
    if (this.ready) {
      try {
        return await this.client.zremrangebyrank(key, start, stop);
      } catch { /* fall through */ }
    }
    const z = this.memZsetOf(key);
    if (!z) return 0;
    const sorted = [...z.items].sort((a, b) => a.score - b.score);
    const end = stop === -1 ? sorted.length : stop + 1;
    const toRemove = new Set(sorted.slice(start, end).map((i) => i.member));
    const initialLen = z.items.length;
    z.items = z.items.filter((i) => !toRemove.has(i.member));
    return initialLen - z.items.length;
  }

  // ── Pub/Sub ──────────────────────────────────────────────────
  async publish(channel: string, message: string): Promise<void> {
    if (this.ready) { try { await this.publisher.publish(channel, message); } catch { /* fall through */ } }
    // Fallback: pub/sub is cross-process by nature; silently drop when Redis is down.
  }

  async subscribe(channel: string, handler: (message: string) => void): Promise<void> {
    if (!this.ready) return; // no cross-process messaging without Redis
    try {
      await this.subscriber.subscribe(channel);
      this.subscriber.on('message', (ch, msg) => { if (ch === channel) handler(msg); });
    } catch { /* fall through */ }
  }

  async unsubscribe(channel: string): Promise<void> {
    if (!this.ready) return;
    try { await this.subscriber.unsubscribe(channel); } catch { /* fall through */ }
  }

  // ── JSON helpers ─────────────────────────────────────────────
  async getJson<T>(key: string): Promise<T | null> {
    const v = await this.get(key);
    return v ? JSON.parse(v) : null;
  }

  async setJson(key: string, value: any, ttlSeconds?: number): Promise<void> {
    await this.set(key, JSON.stringify(value), ttlSeconds);
  }

  // ── Rate limiting helper ─────────────────────────────────────
  async checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<{ allowed: boolean; remaining: number }> {
    const current = await this.incr(`ratelimit:${key}`);
    if (current === 1) await this.expire(`ratelimit:${key}`, windowSeconds);
    return { allowed: current <= limit, remaining: Math.max(0, limit - current) };
  }

  /**
   * Raw client for advanced call-sites (interceptors, health checks).
   * When Redis is down, returns a minimal in-memory shim with the same
   * command shapes those call-sites use (get/set with EX|NX, lpush, ping).
   */
  getClient(): any {
    if (this.ready) return this.client;
    const self = this;
    return {
      status: 'fallback',
      async ping() { return 'PONG'; },
      async get(key: string) { return self.get(key); },
      async set(key: string, value: string, ...args: any[]) {
        // supports: set(k, v), set(k, v, 'EX', ttl), set(k, v, 'EX', ttl, 'NX'), set(k, v, 'NX')
        let ttl: number | undefined; let nx = false;
        for (let i = 0; i < args.length; i++) {
          const a = String(args[i]).toUpperCase();
          if (a === 'EX' && typeof args[i + 1] !== 'undefined') { ttl = Number(args[i + 1]); i++; }
          if (a === 'NX') nx = true;
        }
        if (nx && self.memGet(key) !== null) return null;
        self.memSet(key, value, ttl);
        return 'OK';
      },
      async del(key: string) { return self.del(key); },
      async exists(key: string) { return (await self.exists(key)) ? 1 : 0; },
      async ttl(key: string) { return self.ttl(key); },
      async incr(key: string) { return self.incr(key); },
      // E5-F6: without these, the in-memory fallback crashed every request
      // through api-security (c.expire is not a function) — a Redis outage
      // would have become a TOTAL API outage.
      async expire(key: string, ttl: number) { return self.expire(key, ttl); },
      async setnx(key: string, value: string) { return (await self.setnx(key, value)) ? 1 : 0; },
      async sadd(key: string, ...members: string[]) {
        const cur = self.memGet(key);
        const arr: string[] = cur ? JSON.parse(cur) : [];
        let added = 0;
        for (const m of members) if (!arr.includes(m)) { arr.push(m); added++; }
        self.memSet(key, JSON.stringify(arr));
        return added;
      },
      async smembers(key: string) {
        const cur = self.memGet(key);
        return cur ? JSON.parse(cur) : [];
      },
      async srem(key: string, ...members: string[]) {
        const cur = self.memGet(key);
        const arr: string[] = cur ? JSON.parse(cur) : [];
        const next = arr.filter((m) => !members.includes(m));
        self.memSet(key, JSON.stringify(next));
        return arr.length - next.length;
      },
      async lpush(key: string, ...values: string[]) {
        const cur = self.memGet(key);
        const arr = cur ? JSON.parse(cur) : [];
        arr.unshift(...values);
        self.memSet(key, JSON.stringify(arr));
        return arr.length;
      },
    };
  }
}
