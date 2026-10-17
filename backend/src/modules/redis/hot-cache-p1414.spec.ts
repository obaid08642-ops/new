import { HotCache } from './hot-cache.service';

// P14.14: a cold-cache spike on one key costs one database read per refresh, across processes.
function sharedRedis() {
  const kv = new Map<string, { v: string; exp: number }>();
  const live = (k: string) => { const e = kv.get(k); if (e && e.exp <= Date.now()) { kv.delete(k); return undefined; } return e; };
  return {
    kv,
    async cacheGet(k: string) { await new Promise((r) => setTimeout(r, 1)); return live(k)?.v ?? null; },
    async cacheSet(k: string, v: string, ttl: number) { kv.set(k, { v, exp: Date.now() + ttl * 1000 }); },
    async cacheDel(k: string) { kv.delete(k); },
    async cacheLock(k: string, ms: number) { if (live(k)) return false; kv.set(k, { v: '1', exp: Date.now() + ms }); return true; },
  };
}

describe('HotCache (P14.14)', () => {
  it('500 concurrent cold requests over 4 processes sharing Redis cost one database read', async () => {
    const redis = sharedRedis();
    const processes = [1, 2, 3, 4].map(() => new HotCache(redis as any));
    let reads = 0;
    const load = async () => { reads++; await new Promise((r) => setTimeout(r, 30)); return { sections: ['a'] }; };
    const answers = await Promise.all(Array.from({ length: 500 }, (_, i) => processes[i % 4].get('home', { ttl: 60 }, load)));
    expect(reads).toBe(1);
    expect(answers.every((a) => a.sections[0] === 'a')).toBe(true);
  });

  it('a stale value is served at once while one caller refreshes it', async () => {
    const redis = sharedRedis();
    const cache = new HotCache(redis as any);
    let version = 1;
    let reads = 0;
    const load = async () => { reads++; await new Promise((r) => setTimeout(r, 20)); return version; };
    expect(await cache.get('k', { ttl: 60, swr: 600 }, load)).toBe(1);
    const stored = JSON.parse(redis.kv.get('hc:k')!.v);
    redis.kv.set('hc:k', { v: JSON.stringify({ ...stored, fresh_until: Date.now() - 1 }), exp: Date.now() + 600_000 });
    version = 2;
    const during = await Promise.all(Array.from({ length: 100 }, () => cache.get('k', { ttl: 60, swr: 600 }, load)));
    expect(during.every((v) => v === 1)).toBe(true); // the stale copy, no waiting
    await new Promise((r) => setTimeout(r, 60));
    expect(reads).toBe(2); // one refresh for the 100 stale hits
    expect(await cache.get('k', { ttl: 60, swr: 600 }, load)).toBe(2);
  });

  it('the TTL carries jitter, the entry outlives its freshness by the stale window, invalidate forces one rebuild', async () => {
    const redis = sharedRedis();
    const cache = new HotCache(redis as any);
    const fresh: number[] = [];
    for (let i = 0; i < 20; i++) {
      await cache.invalidate('j');
      const t0 = Date.now();
      await cache.get('j', { ttl: 100, swr: 50 }, async () => i);
      fresh.push(JSON.parse(redis.kv.get('hc:j')!.v).fresh_until - t0);
      expect(redis.kv.get('hc:j')!.exp - t0).toBeGreaterThan(fresh[fresh.length - 1] + 40_000);
    }
    expect(Math.min(...fresh)).toBeGreaterThanOrEqual(89_000);
    expect(Math.max(...fresh)).toBeLessThanOrEqual(111_000);
    expect(new Set(fresh.map((f) => Math.round(f / 1000))).size).toBeGreaterThan(1);
  });

  it('a lock holder that never writes does not block readers: after the wait they read themselves', async () => {
    const redis = sharedRedis();
    await redis.cacheLock('hc:lock:x', 60_000); // a process that died holding the lock
    const cache = new HotCache(redis as any);
    (HotCache as any).WAIT_MS = 200;
    const v = await cache.get('x', { ttl: 60 }, async () => 'ok');
    (HotCache as any).WAIT_MS = 3000;
    expect(v).toBe('ok');
  });
});
