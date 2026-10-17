/**
 * 14.8 — one price change must invalidate all four layers, and a purge that
 * cannot reach the edge must fail loudly instead of pretending.
 *
 * Pinned contract (PurgeBus with stubbed edge targets + fake Redis):
 *  1. shared Redis: DEL every key indexed under each tag, then DEL the index.
 *  2. Redis pub/sub: one `cache:purge` event carrying the tags.
 *  3. Cloudflare stub receives the tags.
 *  4. Next stub receives the tags.
 *  5. With the DEFAULT targets and no credentials, purge THROWS (fail loudly)
 *     instead of silently skipping the edge.
 *  6. A Redis failure does not fail the purge call (short TTLs are the
 *     backstop), but the edge calls still run.
 *  7. Every edge layer is tried even when another one fails: a Cloudflare
 *     failure must not leave the Next pages (ISR copies of the product pages)
 *     uninvalidated, and the purge still fails loudly afterwards.
 */
import { PurgeBus, PURGE_CHANNEL } from './purge-bus';

function fakeRedis() {
  const sets = new Map<string, Set<string>>();
  const kv = new Map<string, string>();
  const published: Array<{ channel: string; message: string }> = [];
  return {
    sets,
    kv,
    published,
    async smembers(k: string): Promise<string[]> {
      return [...(sets.get(k) ?? [])];
    },
    async del(...ks: string[]): Promise<number> {
      let n = 0;
      for (const k of ks) {
        if (kv.delete(k)) n++;
        if (sets.delete(k)) n++;
      }
      return n;
    },
    async publish(channel: string, message: string): Promise<void> {
      published.push({ channel, message });
    },
    getClient() {
      return this;
    },
  };
}

describe('14.8 PurgeBus invalidates all four layers (mocked)', () => {
  it('DELs indexed keys, publishes, and calls Cloudflare + Next with the tags', async () => {
    const redis: any = fakeRedis();
    redis.kv.set('http_cache:/api/v1/medicines?page=1', '{"data":[]}');
    redis.sets.set('cache:tag:medicines', new Set(['http_cache:/api/v1/medicines?page=1']));
    const seen: { cloudflare: string[][]; next: string[][] } = { cloudflare: [], next: [] };
    const bus = new PurgeBus(redis, {
      cloudflare: async (t) => { seen.cloudflare.push(t); },
      next: async (t) => { seen.next.push(t); },
    });

    await bus.purge(['medicines', 'medicines']);

    expect(redis.kv.has('http_cache:/api/v1/medicines?page=1')).toBe(false);
    expect(redis.sets.has('cache:tag:medicines')).toBe(false);
    expect(redis.published).toHaveLength(1);
    expect(redis.published[0].channel).toBe(PURGE_CHANNEL);
    expect(JSON.parse(redis.published[0].message).tags).toEqual(['medicines']);
    expect(seen.cloudflare).toEqual([['medicines']]);
    expect(seen.next).toEqual([['medicines']]);
  });

  it('does nothing for an empty tag list (no edge calls, no publish)', async () => {
    const redis: any = fakeRedis();
    const seen: string[] = [];
    const bus = new PurgeBus(redis, {
      cloudflare: async () => { seen.push('cf'); },
      next: async () => { seen.push('next'); },
    });
    await bus.purge([]);
    expect(seen).toEqual([]);
    expect(redis.published).toHaveLength(0);
  });

  it('fails loudly when the edge credentials are missing (never skips silently)', async () => {
    const redis: any = fakeRedis();
    const bus = new PurgeBus(redis);
    await expect(bus.purge(['medicines'])).rejects.toThrow(/missing_credentials/);
  });

  it('a Redis failure does not fail the purge, and the edge still runs', async () => {
    const broken: any = {
      smembers: async () => { throw new Error('redis_down'); },
      del: async () => { throw new Error('redis_down'); },
      publish: async () => { throw new Error('redis_down'); },
      getClient() { return this; },
    };
    const seen: string[] = [];
    const bus = new PurgeBus(broken, {
      cloudflare: async () => { seen.push('cf'); },
      next: async () => { seen.push('next'); },
    });
    await expect(bus.purge(['medicines'])).resolves.toBeUndefined();
    expect(seen).toEqual(['cf', 'next']);
  });

  it('propagates an edge failure instead of reporting success', async () => {
    const redis: any = fakeRedis();
    const bus = new PurgeBus(redis, {
      cloudflare: async () => { throw new Error('purge_cloudflare_failed:500'); },
      next: async () => {},
    });
    await expect(bus.purge(['medicines'])).rejects.toThrow(/purge_cloudflare_failed/);
  });

  it('still purges Next when Cloudflare fails, and then fails loudly with both reasons', async () => {
    const redis: any = fakeRedis();
    const seen: string[][] = [];
    const bus = new PurgeBus(redis, {
      cloudflare: async () => { throw new Error('purge_cloudflare_failed:429'); },
      next: async (t) => { seen.push(t); },
    });
    await expect(bus.purge(['medicines'])).rejects.toThrow(/purge_cloudflare_failed:429/);
    expect(seen).toEqual([['medicines']]);

    const both = new PurgeBus(redis, {
      cloudflare: async () => { throw new Error('purge_cloudflare_failed:429'); },
      next: async () => { throw new Error('purge_next_failed:503'); },
    });
    await expect(both.purge(['medicines'])).rejects.toThrow(/purge_cloudflare_failed:429.*purge_next_failed:503/);
  });
});
