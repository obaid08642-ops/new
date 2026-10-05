import { of } from 'rxjs';
import { RouteCachePolicyInterceptor } from './route-cache-policy.interceptor';
import { PublicCache, assertPublicCacheOptions } from './public-cache.decorator';

describe('RouteCachePolicyInterceptor (14.7)', () => {
  const makeReq = (init: Record<string, unknown> = {}) => ({
    method: 'GET',
    headers: {},
    url: '/api/v1/locations/regions',
    ...init,
  });
  const makeRes = () => {
    const headers: Record<string, string> = {};
    return { setHeader: (k: string, v: string) => { headers[k] = v; }, _headers: headers };
  };
  // Key-aware reflector mock: PUBLIC_KEY='isPublic', PUBLIC_CACHE_KEY='publicCache'.
  const mockReflector = (isPublic: boolean, cache?: Record<string, unknown>) => ({
    getAllAndOverride: jest.fn((key: string) =>
      key === 'isPublic' ? (isPublic || undefined) : key === 'publicCache' ? cache : undefined,
    ),
  });
  const run = (
    reflector: { getAllAndOverride: jest.Mock },
    req: Record<string, unknown>,
  ): Promise<Record<string, string>> =>
    new Promise((resolve) => {
      const interceptor = new RouteCachePolicyInterceptor(reflector as never);
      const res = makeRes();
      const ctx = {
        switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
        getHandler: () => ({}),
        getClass: () => ({}),
      } as never;
      (interceptor.intercept(ctx, { handle: () => of(null) } as never) as import('rxjs').Observable<unknown>).subscribe(
        () => resolve(res._headers),
      );
    });

  it('defaults every GET response to private, no-store', async () => {
    const h = await run({ getAllAndOverride: jest.fn().mockReturnValue(undefined) } as never, makeReq());
    expect(h['Cache-Control']).toBe('private, no-store');
    expect(h['X-Cache-Hint']).toBe('private');
  });

  it('sends public/s-maxage/stale-while-revalidate/stale-if-error + Cache-Tag on a @Public() @PublicCache read', async () => {
    const h = await run(
      mockReflector(true, { ttlSeconds: 300, tags: ['geo', 'regions'] }) as never,
      makeReq(),
    );
    expect(h['Cache-Control']).toBe('public, max-age=300, s-maxage=300, stale-while-revalidate=60, stale-if-error=86400');
    expect(h['Cache-Tag']).toBe('geo,regions');
    expect(h['X-Cache-Hint']).toBe('public');
  });

  it('adds Vary Accept-Language only when varyLanguage is set (locale-dependent)', async () => {
    const plain = await run(mockReflector(true, { ttlSeconds: 300 }) as never, makeReq());
    expect(plain['Vary']).toBe('Accept-Encoding, Authorization, Cookie');
    expect(plain['Vary']).not.toContain('Accept-Language');

    const localized = await run(
      mockReflector(true, { ttlSeconds: 300, varyLanguage: true }) as never,
      makeReq(),
    );
    expect(localized['Vary']).toContain('Accept-Language');
  });

  it('fails closed when @PublicCache is set on a non-@Public() route', async () => {
    const h = await run(mockReflector(false, { ttlSeconds: 300, tags: ['x'] }) as never, makeReq());
    expect(h['Cache-Control']).toBe('private, no-store');
    expect(h['Cache-Tag']).toBeUndefined();
  });

  it('fails closed when Authorization header is present', async () => {
    const h = await run(
      mockReflector(true, { ttlSeconds: 300 }) as never,
      makeReq({ headers: { authorization: 'Bearer t' } }),
    );
    expect(h['Cache-Control']).toBe('private, no-store');
  });

  it('fails closed when a session cookie is present', async () => {
    const h = await run(
      mockReflector(true, { ttlSeconds: 300 }) as never,
      makeReq({ headers: { cookie: 'access_token=xyz' } }),
    );
    expect(h['Cache-Control']).toBe('private, no-store');
  });

  it('fails closed when req.user is populated (14.7 hardening beyond X0)', async () => {
    const h = await run(
      mockReflector(true, { ttlSeconds: 300 }) as never,
      makeReq({ headers: {}, user: { id: 'u1' } }),
    );
    expect(h['Cache-Control']).toBe('private, no-store');
    expect(h['Cache-Tag']).toBeUndefined();
  });

  it.each([[0], [-5], [86401], [1.5], ['300']])('fails closed on out-of-range ttl %p', async (ttl) => {
    const h = await run(mockReflector(true, { ttlSeconds: ttl as number }) as never, makeReq());
    expect(h['Cache-Control']).toBe('private, no-store');
  });

  it.each([[['bad tag']], [['ok', 'nope!']], [new Array(11).fill('t')], ['not-an-array']])(
    'fails closed on invalid tags %p',
    async (tags) => {
      const h = await run(mockReflector(true, { ttlSeconds: 300, tags: tags as string[] }) as never, makeReq());
      expect(h['Cache-Control']).toBe('private, no-store');
      expect(h['Cache-Tag']).toBeUndefined();
    },
  );

  it('sets no-store for non-GET methods', async () => {
    const h = await run(
      { getAllAndOverride: jest.fn().mockReturnValue(undefined) } as never,
      makeReq({ method: 'POST', url: '/api/v1/auth/login' }),
    );
    expect(h['Cache-Control']).toBe('no-store, no-cache, must-revalidate');
  });

  it('decorator factory rejects invalid options at startup', () => {
    expect(() => PublicCache(0)).toThrow();
    expect(() => PublicCache(90000)).toThrow();
    expect(() => PublicCache(60, ['bad tag'])).toThrow();
    expect(() => assertPublicCacheOptions({ ttlSeconds: 60, varyLanguage: 'yes' as unknown as boolean })).toThrow();
    expect(() => PublicCache(60, ['geo'], { varyLanguage: true })).not.toThrow();
  });
});
