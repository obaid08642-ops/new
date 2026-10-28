import { lastValueFrom, of } from 'rxjs';
import { RedisCacheInterceptor } from './redis-cache.interceptor';

const CC = 'public, s-maxage=300, stale-while-revalidate=600';

function run(store: Map<string, string>, headers: Record<string, string> = {}, policy: any = { ttl: 300, tags: ['medicines'], cacheControl: CC }) {
  const client: any = { get: async (k: string) => store.get(k) ?? null, set: async (k: string, v: string) => { store.set(k, v); }, sadd: async () => 1, expire: async () => 1 };
  const reflector: any = { get: () => policy };
  const set: Record<string, string> = {};
  const ctx: any = {
    switchToHttp: () => ({ getRequest: () => ({ method: 'GET', originalUrl: '/api/v1/public/categories/ar/items?limit=24', headers }), getResponse: () => ({ setHeader: (k: string, v: string) => { set[k] = v; } }) }),
    getHandler: () => ({}), getClass: () => ({}),
  };
  const handler = jest.fn(() => of({ items: [1] }));
  const i = new RedisCacheInterceptor({ getClient: () => client } as any, reflector);
  return { set, handler, call: async () => lastValueFrom(await i.intercept(ctx, { handle: handler } as any)) };
}

describe('RedisCacheInterceptor public catalogue reads (2026-10-27)', () => {
  it('a HIT carries the same Cache-Control as the MISS, including the route\'s own stale-while-revalidate', async () => {
    const store = new Map<string, string>();
    const miss = run(store);
    await miss.call();
    await new Promise((r) => setImmediate(r));
    expect(miss.set['Cache-Control']).toBe(CC);
    const hit = run(store);
    expect(await hit.call()).toEqual({ items: [1] });
    expect(hit.handler).not.toHaveBeenCalled();
    expect(hit.set['Cache-Control']).toBe(CC);
    expect(hit.set['Cache-Tag']).toBe('medicines');
  });

  it('a request with an Authorization header is neither served from nor stored in the shared cache', async () => {
    const store = new Map<string, string>();
    const r = run(store, { authorization: 'Bearer x' });
    await r.call();
    expect(store.size).toBe(0);
    expect(r.set['Cache-Control']).toBeUndefined();
  });
});
