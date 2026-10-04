import { CacheControlInterceptor } from './cache-control.interceptor';
import { of } from 'rxjs';

describe('CacheControlInterceptor (X0)', () => {
  const makeReq = (headers: Record<string, string> = {}) => ({ method: 'GET', headers, url: '/api/v1/medicines' });
  const makeRes = () => {
    const headers: Record<string, string> = {};
    return { setHeader: (k: string, v: string) => { headers[k] = v; }, _headers: headers };
  };
  // Key-aware reflector mock: PUBLIC_KEY='isPublic', PUBLIC_CACHE_KEY='publicCache'.
  const mockReflector = (isPublic: boolean, cache?: { ttlSeconds: number; tags?: string[] }) => ({
    getAllAndOverride: jest.fn((key: string) =>
      key === 'isPublic' ? (isPublic || undefined) : key === 'publicCache' ? cache : undefined,
    ),
  });

  it('defaults to private, no-store for non-public routes', (done) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq(), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toBe('private, no-store');
      done();
    });
  });

  it('allows public caching only when no auth header and no cookie', (done) => {
    const reflector = mockReflector(true, { ttlSeconds: 300 });
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq(), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toContain('public');
      expect(res._headers['Cache-Control']).toContain('s-maxage=300');
      done();
    });
  });

  it('rejects public caching when Authorization header is present', (done) => {
    const reflector = mockReflector(true, { ttlSeconds: 300 });
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq({ authorization: 'Bearer token' }), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toBe('private, no-store');
      done();
    });
  });

  it('rejects public caching when session cookie is present', (done) => {
    const reflector = mockReflector(true, { ttlSeconds: 300 });
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq({ cookie: 'access_token=xyz' }), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toBe('private, no-store');
      done();
    });
  });

  it('fails closed when @PublicCache is set on a non-@Public() route', (done) => {
    const reflector = mockReflector(false, { ttlSeconds: 300 });
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq(), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toBe('private, no-store');
      expect(res._headers['Cache-Tag']).toBeUndefined();
      done();
    });
  });

  it('emits Cache-Tag when tags are provided on a @Public() route', (done) => {
    const reflector = mockReflector(true, { ttlSeconds: 300, tags: ['medicines', 'catalog'] });
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => makeReq(), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toContain('public');
      expect(res._headers['Cache-Control']).toContain('s-maxage=300');
      expect(res._headers['Cache-Control']).toContain('stale-while-revalidate');
      expect(res._headers['Cache-Tag']).toBe('medicines,catalog');
      done();
    });
  });

  it('sets no-store for non-GET methods', (done) => {
    const reflector = { getAllAndOverride: jest.fn().mockReturnValue(undefined) };
    const interceptor = new CacheControlInterceptor(reflector as any);
    const res = makeRes();
    const ctx = {
      switchToHttp: () => ({ getRequest: () => ({ method: 'POST', headers: {}, url: '/api/v1/orders' }), getResponse: () => res }),
      getHandler: () => ({}),
      getClass: () => ({}),
    } as any;
    const next: any = { handle: () => of(null) };

    interceptor.intercept(ctx, next).subscribe(() => {
      expect(res._headers['Cache-Control']).toBe('no-store, no-cache, must-revalidate');
      done();
    });
  });
});
