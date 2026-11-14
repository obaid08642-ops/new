/**
 * Speed inventory (2026-10-25): the public catalogue GETs answered `private, no-store`, so Cloudflare served none of them.
 * This pins (1) which routes are now publicly cacheable and for how long, (2) that personal routes of the SAME controllers
 * stay private/no-store, and (3) that a signed-in request to a cacheable route is still private/no-store.
 */
import { of } from 'rxjs';
import { Reflector } from '@nestjs/core';
import { PUBLIC_CACHE_KEY } from './public-cache.decorator';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { LabsController } from '../modules/labs/labs.controller';
import { RadiologyController } from '../modules/radiology/radiology.controller';
import { CareController } from '../modules/care/care.controller';
import { LocationController } from '../modules/location/location.controller';
import { NursingController } from '../modules/home-care/home-care.controller';
import { MedicinesController } from '../modules/medicines/medicines.controller';
import { SearchController } from '../modules/search/search.controller';
import { SeoSearchController } from '../modules/seo-search/seo-search.module';
import { I18nController } from '../modules/i18n/i18n.controller';
import { InsuranceController } from '../modules/insurance/insurance.module';

type Ctl = { prototype: object };
const handler = (c: Ctl, name: string) => (c.prototype as Record<string, unknown>)[name] as (...a: unknown[]) => unknown;
const meta = (c: Ctl, name: string) => Reflect.getMetadata(PUBLIC_CACHE_KEY, handler(c, name)) as { ttl: number } | undefined;

const PUBLIC: Array<[Ctl, string, number]> = [
  [LabsController, 'services', 120], [LabsController, 'packages', 120], [LabsController, 'categories', 120], [LabsController, 'one', 120],
  [RadiologyController, 'services', 120], [RadiologyController, 'modalities', 120], [RadiologyController, 'one', 120],
  [CareController, 'specialties', 300], [CareController, 'insuranceCompanies', 300], [CareController, 'degrees', 300],
  [NursingController, 'getCatalog', 120],
  // max-throughput pass (2026-10-30): the heavy anonymous reads that answered private/no-store and so reached Node every time
  [LabsController, 'carousel', 120], [RadiologyController, 'carousel', 120],
  [MedicinesController, 'autocomplete', 300], [MedicinesController, 'categoriesList', 300], [MedicinesController, 'filters', 300], [MedicinesController, 'hot', 300],
  [SearchController, 'search', 300], [SeoSearchController, 'publicProductsSearch', 120], [I18nController, 'bundle', 300], [I18nController, 'raw', 300], [InsuranceController, 'companies', 300],
  [LocationController, 'getRegions', 3600], [LocationController, 'getCities', 3600], [LocationController, 'getDistricts', 3600],
];
const PRIVATE: Array<[Ctl, string]> = [
  [LabsController, 'mine'], [LabsController, 'oneBooking'], [LabsController, 'getTracking'], [LabsController, 'providerInbox'],
  [CareController, 'doctors'],
];

const run = (c: Ctl, name: string, headers: Record<string, string>, user?: unknown) => {
  const set: Record<string, string> = {};
  const ctx = {
    getHandler: () => handler(c, name), getClass: () => c,
    switchToHttp: () => ({
      getRequest: () => ({ method: 'GET', headers, user }),
      getResponse: () => ({ headersSent: false, setHeader: (k: string, v: string) => { set[k] = v; } }),
    }),
  };
  let done = false;
  new CacheControlInterceptor(new Reflector()).intercept(ctx as never, { handle: () => of({}) }).subscribe(() => { done = true; });
  expect(done).toBe(true);
  return set;
};

describe('public catalogue routes are cacheable by the edge', () => {
  it.each(PUBLIC)('%p.%s is @PublicCache(%s)', (c, name, ttl) => {
    expect(meta(c, name)?.ttl).toBe(ttl);
    const h = run(c, name, {});
    expect(h['Cache-Control']).toContain(`public, s-maxage=${ttl}`);
    expect(h['Cache-Control']).toContain('stale-while-revalidate');
  });

  it.each(PUBLIC)('%p.%s answers private/no-store to a signed-in request', (c, name) => {
    expect(run(c, name, { authorization: 'Bearer x' })['Cache-Control']).toBe('private, no-store');
    expect(run(c, name, {}, { id: 'u1' })['Cache-Control']).toBe('private, no-store');
  });
});

describe('personal routes of the same controllers stay private', () => {
  it.each(PRIVATE)('%p.%s is not public', (c, name) => {
    expect(handler(c, name)).toBeDefined();
    expect(meta(c, name)).toBeUndefined();
    expect(run(c, name, {})['Cache-Control']).toBe('private, no-store');
  });
});
