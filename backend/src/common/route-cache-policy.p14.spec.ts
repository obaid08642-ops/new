/**
 * 14.7 — cache policy is set PER ROUTE, not by URL prefix.
 *
 * The old interceptor marked whole URL prefixes as public (`/api/v1/medicines*`),
 * which also matched per-user paths (`/me/recently-viewed`) and never checked
 * for auth — the same leak class as the deleted edge worker, at the origin
 * header level. A shared cache must never serve one user's data to another.
 *
 * Pinned contract:
 *  1. Default is `private, no-store` — a route is publicly cacheable ONLY when
 *     its handler (or controller) carries `@PublicCache(ttl, tags)`.
 *  2. A `@PublicCache` route still answers `private, no-store` when the request
 *     carries any auth signal (Authorization header or req.user). Fail closed:
 *     a logged-in user never gets a shared cached copy.
 *  3. A public answer carries `public, s-maxage=<ttl>, stale-while-revalidate,`
 *     `stale-if-error`, a `Cache-Tag` header (for 14.8 purge), and
 *     `Vary: Accept-Language` when the body depends on locale.
 *  4. Non-GET answers `no-store`.
 *  5. CI gate: a `@PublicCache` handler must not read the user (no
 *     `@CurrentUser`, no `req.user`). A public route that needs the user is a
 *     leak — fail the build, don't cache it.
 */
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PublicCache, PUBLIC_CACHE_KEY } from './public-cache.decorator';

describe('14.7 @PublicCache marks a route explicitly', () => {
  it('exposes ttl, tags and the locale flag as metadata', () => {
    class Probe {
      @PublicCache(300, ['medicines'], { varyLanguage: true })
      list() { return []; }
    }
    const meta = Reflect.getMetadata(PUBLIC_CACHE_KEY, (Probe.prototype as any).list);
    expect(meta).toEqual({ ttl: 300, tags: ['medicines'], varyLanguage: true });
  });

  it('defaults varyLanguage to false and tags to []', () => {
    class Probe {
      @PublicCache(60)
      health() { return {}; }
    }
    const meta = Reflect.getMetadata(PUBLIC_CACHE_KEY, (Probe.prototype as any).health);
    expect(meta).toEqual({ ttl: 60, tags: [], varyLanguage: false });
  });
});

describe('14.7 the interceptor fails closed', () => {
  // The interceptor is constructed directly; these pin the header contract
  // without booting the app.
  const load = () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const m = require('./cache-control.interceptor');
    return m.CacheControlInterceptor;
  };

  const ctxFor = (method: string, headers: Record<string, string>, user?: any) => {
    const setHeader = jest.fn();
    return {
      switchToHttp: () => ({
        getRequest: () => ({ method, headers, user, url: '/api/v1/medicines' }),
        getResponse: () => ({ setHeader }),
      }),
      getHandler: () => ({}),
      getClass: () => ({}),
      setHeader,
    } as any;
  };

  it('answers private, no-store when the route carries no @PublicCache', async () => {
    const Interceptor = load();
    const ctx: any = ctxFor('GET', {});
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('answers no-store for non-GET even on a @PublicCache route', async () => {
    const Interceptor = load();
    const handler = () => ({});
    Reflect.defineMetadata(PUBLIC_CACHE_KEY, { ttl: 300, tags: ['t'], varyLanguage: false }, handler);
    const ctx: any = ctxFor('POST', {});
    ctx.getHandler = () => handler;
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith('Cache-Control', expect.stringContaining('no-store'));
  });

  it('answers private when a @PublicCache route sees an Authorization header', async () => {
    const Interceptor = load();
    const handler = () => ({});
    Reflect.defineMetadata(PUBLIC_CACHE_KEY, { ttl: 300, tags: ['t'], varyLanguage: false }, handler);
    const ctx: any = ctxFor('GET', { authorization: 'Bearer abc' }, undefined);
    ctx.getHandler = () => handler;
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('answers private when a @PublicCache route sees req.user', async () => {
    const Interceptor = load();
    const handler = () => ({});
    Reflect.defineMetadata(PUBLIC_CACHE_KEY, { ttl: 300, tags: ['t'], varyLanguage: false }, handler);
    const ctx: any = ctxFor('GET', {}, { id: 'u-1' });
    ctx.getHandler = () => handler;
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith('Cache-Control', 'private, no-store');
  });

  it('answers public with s-maxage, stale directives and a Cache-Tag for an anonymous @PublicCache GET', async () => {
    const Interceptor = load();
    const handler = () => ({});
    Reflect.defineMetadata(PUBLIC_CACHE_KEY, { ttl: 300, tags: ['medicines', 'catalog'], varyLanguage: false }, handler);
    const ctx: any = ctxFor('GET', {});
    ctx.getHandler = () => handler;
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith(
      'Cache-Control',
      'public, s-maxage=300, stale-while-revalidate=60, stale-if-error=86400',
    );
    expect(ctx.setHeader).toHaveBeenCalledWith('Cache-Tag', 'medicines, catalog');
  });

  it('adds Vary: Accept-Language when the body depends on locale', async () => {
    const Interceptor = load();
    const handler = () => ({});
    Reflect.defineMetadata(PUBLIC_CACHE_KEY, { ttl: 300, tags: ['t'], varyLanguage: true }, handler);
    const ctx: any = ctxFor('GET', {});
    ctx.getHandler = () => handler;
    const { lastValueFrom } = require('rxjs');
    await lastValueFrom(await new Interceptor(new Reflector()).intercept(ctx, { handle: () => of({}) }));
    expect(ctx.setHeader).toHaveBeenCalledWith('Vary', expect.stringContaining('Accept-Language'));
  });
});
