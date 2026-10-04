import { SwrCache, computeTtlWithJitter } from './swr-cache';

const flush = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('swr-cache (14.14)', () => {
  it('serves stale while refreshing once: concurrent stale readers trigger 1 background fetch', async () => {
    let now = 0;
    let calls = 0;
    const cache = new SwrCache<string>({ now: () => now, rand: () => 0.5 });

    // Deterministic jitter sanity: rand 0.5 centers the symmetric window.
    expect(computeTtlWithJitter(1000, 0.2, () => 0.5)).toBe(1000);

    const fetch = async () => {
      calls += 1;
      return `v${calls}`;
    };

    // t=0: miss -> blocking fetch.
    await expect(cache.getOrFetch('k', fetch, { ttlMs: 1000, staleMs: 5000, jitterRatio: 0 })).resolves.toEqual({
      value: 'v1',
      status: 'fresh-fetch',
    });
    expect(calls).toBe(1);

    // t=500: fresh hit, no fetch.
    now = 500;
    await expect(cache.getOrFetch('k', fetch, { ttlMs: 1000, staleMs: 5000, jitterRatio: 0 })).resolves.toEqual({
      value: 'v1',
      status: 'fresh-hit',
    });
    expect(calls).toBe(1);

    // t=1500: inside stale window -> both concurrent readers get stale v1
    // immediately while a SINGLE background refresh runs (singleflight).
    now = 1500;
    const [a, b] = await Promise.all([
      cache.getOrFetch('k', fetch, { ttlMs: 1000, staleMs: 5000, jitterRatio: 0 }),
      cache.getOrFetch('k', fetch, { ttlMs: 1000, staleMs: 5000, jitterRatio: 0 }),
    ]);
    expect(a).toEqual({ value: 'v1', status: 'stale' });
    expect(b).toEqual({ value: 'v1', status: 'stale' });
    await flush();
    await flush();
    expect(calls).toBe(2); // exactly one refresh for both stale readers
    expect(cache.inflightCount()).toBe(0);

    // Refreshed entry is fresh again.
    await expect(cache.getOrFetch('k', fetch, { ttlMs: 1000, staleMs: 5000, jitterRatio: 0 })).resolves.toEqual({
      value: 'v2',
      status: 'fresh-hit',
    });
    expect(calls).toBe(2);
  });
});
