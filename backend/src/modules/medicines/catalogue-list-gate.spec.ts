import { ServiceUnavailableException } from '@nestjs/common';
import { HotCache } from '../redis/hot-cache.service';
import { MedicinesService } from './medicines.service';

/**
 * Run 133: `MedicinesService.filtered` was the one catalogue list with no cache and no cap, so a burst of requests ran 4-8 list queries at once in mongod. Now: cached like `paginate` (single flight,
 * stale served while one caller rebuilds) and every build waits for a place in the process-wide gate.
 */
function fakeRedis() {
  const m = new Map<string, string>(); const locks = new Set<string>();
  return {
    cacheGet: async (k: string) => m.get(k) ?? null,
    cacheSet: async (k: string, v: string) => { m.set(k, v); },
    cacheDel: async (k: string) => { m.delete(k); locks.delete(k); },
    cacheLock: async (k: string) => { if (locks.has(k)) return false; locks.add(k); return true; },
    m,
  };
}

function service() {
  const svc: any = Object.create(MedicinesService.prototype);
  const redis = fakeRedis();
  svc.hotCache = new HotCache(redis as any);
  const uncached = jest.fn<Promise<any>, any[]>(async () => ({ data: [{ id: 'x' }], total: 1 }));
  svc.filteredUncached = uncached;
  return { svc, uncached, redis };
}
const F = { forms: [], brands: ['GSK'], rx_only: false };

describe('MedicinesService.filtered: cached and capped', () => {
  it('the same request is built once and then served from the cache; another page or sort is another key', async () => {
    const { svc, uncached } = service();
    await svc.filtered(undefined, undefined, F, 'price_desc', 1, 20);
    await svc.filtered(undefined, undefined, F, 'price_desc', 1, 20);
    await svc.filtered(undefined, undefined, F, 'price_desc', 1, 20);
    expect(uncached).toHaveBeenCalledTimes(1);
    await svc.filtered(undefined, undefined, F, 'price_desc', 2, 20);
    await svc.filtered(undefined, undefined, F, 'price_asc', 1, 20);
    expect(uncached).toHaveBeenCalledTimes(3);
  });

  it('a burst of identical cold requests shares one build (single flight)', async () => {
    const { svc, uncached } = service();
    uncached.mockImplementation(async () => { await new Promise((r) => setTimeout(r, 30)); return { data: [], total: 0 }; });
    await Promise.all(Array.from({ length: 12 }, () => svc.filtered(undefined, undefined, F, 'newest', 1, 20)));
    expect(uncached).toHaveBeenCalledTimes(1);
  });

  it('a burst of DIFFERENT cold requests never runs more than the gate allows at once', async () => {
    const { svc, uncached } = service();
    let now = 0; let peak = 0;
    uncached.mockImplementation(async () => { now += 1; peak = Math.max(peak, now); await new Promise((r) => setTimeout(r, 25)); now -= 1; return { data: [], total: 0 }; });
    await Promise.all(Array.from({ length: 10 }, (_, i) => svc.filtered(`q${i}`, undefined, F, 'price_asc', 1, 20)));
    expect(peak).toBeLessThanOrEqual(3);
    expect(uncached).toHaveBeenCalledTimes(10);
  });

  it('when the gate is full a cold request is refused with 503 catalogue_busy, and a STALE copy is still served', async () => {
    const { svc, uncached, redis } = service();
    await svc.filtered(undefined, undefined, F, 'price_desc', 1, 20);                       // fills the cache
    for (const [k, v] of redis.m) { if (k.startsWith('hc:med:filtered')) { const o = JSON.parse(v); o.fresh_until = Date.now() - 1000; redis.m.set(k, JSON.stringify(o)); } }   // now stale
    const gate = MedicinesService.LIST_GATE as any;
    const hold: Array<() => void> = [];
    const holders = Array.from({ length: 3 }, () => gate.run(() => new Promise<void>((r) => hold.push(r))));
    const realWait = gate.waitMs; gate.waitMs = 20; gate.maxQueue = 0;                      // refuse at once instead of waiting 4 s in the test
    try {
      const stale = await svc.filtered(undefined, undefined, F, 'price_desc', 1, 20);       // stale: served, the refresh is refused quietly
      expect(stale.data[0].id).toBe('x');
      await expect(svc.filtered('another', undefined, F, 'price_desc', 1, 20)).rejects.toBeInstanceOf(ServiceUnavailableException);   // cold: 503
    } finally {
      gate.waitMs = realWait; gate.maxQueue = 50; hold.forEach((r) => r()); await Promise.all(holders);
    }
    expect(uncached.mock.calls.length).toBe(1);
  });
});
