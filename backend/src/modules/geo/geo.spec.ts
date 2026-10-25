import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BadRequestException, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { GUARDS_METADATA } from '@nestjs/common/constants';
import { JwtAuthGuard } from '../../common/auth.guard';
import { parseGeocodedAddress } from '../../common/national-address';
import { ReverseGeocodeQueryDto } from './geo.dto';
import { GeoController } from './geo.controller';
import { CACHE_TTL_SECONDS, GeoService, MAX_DISTRICT_M } from './geo.service';
import { cacheKey, haversineM, inServiceArea, nearest } from './geo-math';
import { NominatimSource, SplGeocodeSource, type SourceOutcome } from './geo-sources';

const RIYADH = { lat: 24.7136, lng: 46.6753 };
const rows = [
  { code: 'sa-riyadh', name_ar: 'الرياض', name_en: 'Riyadh', type: 'city', parent_code: 'sa-central-region' },
  { code: 'sa-jeddah', name_ar: 'جدة', name_en: 'Jeddah', type: 'city', parent_code: 'sa-western-region' },
  { code: 'sa-riyadh-001', name_ar: 'حي الملقا', name_en: 'Al Malqa', type: 'district', parent_code: 'sa-riyadh', coordinates: { lat: 24.8100, lng: 46.6250 } },
  { code: 'sa-riyadh-002', name_ar: 'حي العليا', name_en: 'Al Olaya', type: 'district', parent_code: 'sa-riyadh', coordinates: { lat: 24.6937, lng: 46.6853 } },
  { code: 'sa-riyadh-003', name_ar: 'حي بلا إحداثيات', name_en: 'No Centroid', type: 'district', parent_code: 'sa-riyadh' },
  { code: 'sa-jeddah-001', name_ar: 'حي الروضة', name_en: 'Ar Rawdah', type: 'district', parent_code: 'sa-jeddah', coordinates: { lat: 21.5680, lng: 39.1530 } },
];

function build(opts: { spl?: SourceOutcome; osm?: SourceOutcome; named?: { district?: string; city?: string } | null } = {}) {
  const store = new Map<string, string>();
  const redis = {
    getJson: jest.fn(async (k: string) => (store.has(k) ? JSON.parse(store.get(k)!) : null)),
    setJson: jest.fn(async (k: string, v: unknown, ttl?: number) => { store.set(k, JSON.stringify(v)); (redis as any).lastTtl = ttl; }),
  };
  const spl = { reverse: jest.fn(async () => opts.spl ?? { outcome: 'unavailable' }) };
  const osm = { reverse: jest.fn(async () => opts.osm ?? { outcome: 'unavailable' }) };
  const locations = {
    resolveFromText: jest.fn(async () => {
      const n = opts.named;
      if (!n) return null;
      return { city: n.city ? rows.find((r) => r.code === n.city) : undefined, district: n.district ? rows.find((r) => r.code === n.district) : undefined };
    }),
  };
  const model = { find: () => ({ lean: async () => rows }) };
  const svc = new GeoService(redis as never, spl as never, osm as never, locations as never, model as never);
  return { svc, redis, spl, osm, locations, store };
}
const found = (source: 'spl' | 'osm', extra: Record<string, string> = {}): SourceOutcome => ({ outcome: 'found', address: { source, street: 'طريق الملك فهد', building_no: '7777', postal_code: '12211', short_address: 'RRRD2929', city: 'الرياض', district: 'العليا', ...extra } });

describe('geo math', () => {
  it('measures distance in metres', () => {
    expect(haversineM(RIYADH, RIYADH)).toBe(0);
    expect(Math.round(haversineM({ lat: 24, lng: 46 }, { lat: 25, lng: 46 }) / 1000)).toBe(111);
  });
  it('shares one cache key between taps about 20 m apart and separates points 300 m apart', () => {
    expect(cacheKey({ lat: 24.71360, lng: 46.67530 })).toBe(cacheKey({ lat: 24.71368, lng: 46.67538 }));
    expect(cacheKey(RIYADH)).not.toBe(cacheKey({ lat: 24.7165, lng: 46.6753 }));
  });
  it('knows the service area', () => {
    expect(inServiceArea(RIYADH)).toBe(true);
    for (const p of [{ lat: 0, lng: 0 }, { lat: 51.5, lng: -0.1 }, { lat: 24.7, lng: 60 }]) expect(inServiceArea(p)).toBe(false);
  });
  it('finds the nearest centroid within a radius and ignores rows without one', () => {
    const d = rows.filter((r) => r.type === 'district');
    expect(nearest(RIYADH, d, 6000)?.item.code).toBe('sa-riyadh-002');
    expect(nearest({ lat: 30, lng: 40 }, d, 6000)).toBeNull();
  });
});

describe('GET /geo/reverse contract', () => {
  it('is authenticated and rate limited', () => {
    expect(Reflect.getMetadata(GUARDS_METADATA, GeoController)).toContain(JwtAuthGuard);
    expect(Reflect.getMetadata('THROTTLER:LIMITdefault', GeoController.prototype.reverse)).toBe(20);
  });
  it('takes lat and lng as numbers in range (query strings are converted)', async () => {
    const ok = plainToInstance(ReverseGeocodeQueryDto, { lat: '24.7', lng: '46.6' });
    expect(await validate(ok)).toEqual([]);
    expect(ok.lat).toBe(24.7);
    for (const bad of [{ lat: 'x', lng: '46' }, { lat: '91', lng: '46' }, { lat: '24', lng: '181' }, { lat: '24' }, {}]) {
      expect((await validate(plainToInstance(ReverseGeocodeQueryDto, bad))).length).toBeGreaterThan(0);
    }
  });
});

describe('GeoService.reverse', () => {
  it('refuses a point outside the kingdom before asking any source', async () => {
    const { svc, spl, osm } = build({ spl: found('spl') });
    await expect(svc.reverse({ lat: 51.5, lng: -0.12 })).rejects.toBeInstanceOf(BadRequestException);
    expect(spl.reverse).not.toHaveBeenCalled();
    expect(osm.reverse).not.toHaveBeenCalled();
  });

  it('answers from the National Address first, with OUR city and district (the nearest centroid), and does not ask OSM', async () => {
    const { svc, spl, osm } = build({ spl: found('spl'), osm: found('osm'), named: { city: 'sa-riyadh', district: 'sa-riyadh-002' } });
    const r = await svc.reverse(RIYADH);
    expect(r).toEqual({
      city_id: 'sa-riyadh', city_name_ar: 'الرياض', city_name_en: 'Riyadh',
      district_id: 'sa-riyadh-002', district_name_ar: 'حي العليا', district_name_en: 'Al Olaya',
      street: 'طريق الملك فهد', building_no: '7777', postal_code: '12211', short_address: 'RRRD2929', source: 'spl',
    });
    expect(spl.reverse).toHaveBeenCalledTimes(1);
    expect(osm.reverse).not.toHaveBeenCalled();
  });

  it('falls back to OSM when the National Address cannot answer', async () => {
    const { svc, osm } = build({ spl: { outcome: 'unavailable' }, osm: found('osm', { short_address: '' }) });
    const r = await svc.reverse(RIYADH);
    expect(osm.reverse).toHaveBeenCalledTimes(1);
    expect(r.source).toBe('osm');
    expect(r.district_id).toBe('sa-riyadh-002');
  });

  it('district_id is always one of ours: the centroid wins over the source\'s district name', async () => {
    const { svc } = build({ spl: found('spl', { district: 'اسم آخر' }), named: { city: 'sa-riyadh', district: 'sa-riyadh-001' } });
    expect((await svc.reverse(RIYADH)).district_id).toBe('sa-riyadh-002'); // 2 km from Al Olaya, 14 km from Al Malqa
  });

  it('too far from every centroid: uses the district the source named, else none (the street is still returned)', async () => {
    const far = { lat: 24.9, lng: 46.9 };
    expect(haversineM(far, { lat: 24.6937, lng: 46.6853 })).toBeGreaterThan(MAX_DISTRICT_M);
    const named = build({ spl: found('spl'), named: { city: 'sa-riyadh', district: 'sa-riyadh-001' } });
    expect((await named.svc.reverse(far)).district_id).toBe('sa-riyadh-001');
    const unnamed = build({ spl: found('spl'), named: { city: 'sa-riyadh' } });
    const r = await unnamed.svc.reverse(far);
    expect(r.district_id).toBeNull();
    expect(r.city_id).toBe('sa-riyadh');
    expect(r.street).toBe('طريق الملك فهد');
  });

  it('never returns a district of another city than the point\'s', async () => {
    const jeddah = { lat: 21.5681, lng: 39.1531 };
    const { svc } = build({ spl: found('spl', { city: 'جدة', district: 'الروضة' }), named: { city: 'sa-jeddah' } });
    const r = await svc.reverse(jeddah);
    expect(r.city_id).toBe('sa-jeddah');
    expect(r.district_id).toBe('sa-jeddah-001');
  });

  it('caches a good answer for 30 days by the rounded point and serves the next tap from the cache', async () => {
    const { svc, spl, redis } = build({ spl: found('spl') });
    await svc.reverse(RIYADH);
    expect((redis as any).lastTtl).toBe(CACHE_TTL_SECONDS);
    expect(CACHE_TTL_SECONDS).toBe(2_592_000);
    await svc.reverse({ lat: RIYADH.lat + 0.00005, lng: RIYADH.lng + 0.00005 });
    expect(spl.reverse).toHaveBeenCalledTimes(1);
  });

  it('503 and nothing cached when every source is down and no district is near', async () => {
    const { svc, redis } = build({});
    await expect(svc.reverse({ lat: 30, lng: 40 })).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(redis.setJson).not.toHaveBeenCalled();
  });

  it('404 when the sources answered "nothing here" and no district is near', async () => {
    const { svc } = build({ spl: { outcome: 'none' }, osm: { outcome: 'none' } });
    await expect(svc.reverse({ lat: 30, lng: 40 })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('a degraded answer (sources down, only our centroid matched) is returned but not kept for 30 days', async () => {
    const { svc, redis } = build({});
    const r = await svc.reverse(RIYADH);
    expect(r.district_id).toBe('sa-riyadh-002');
    expect(r.street).toBeNull();
    expect(redis.setJson).not.toHaveBeenCalled();
  });
});

describe('National Address by coordinates', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.restoreAllMocks(); });

  it('reads an address-geocode answer', () => {
    const a = parseGeocodedAddress({ success: true, Addresses: [{ BuildingNumber: '7777', Street: 'King Fahd Rd', District: 'Al Olaya', City: 'Riyadh', PostCode: '12211', AdditionalNumber: '1234', ShortAddress: 'rrrd 2929' }] });
    expect(a).toMatchObject({ building_number: '7777', street: 'King Fahd Rd', district: 'Al Olaya', city: 'Riyadh', post_code: '12211', short_address: 'RRRD2929' });
    for (const none of [null, {}, { Addresses: null }, { Addresses: [] }, { PostCode: [{ postCode: '1' }] }]) expect(parseGeocodedAddress(none)).toBeNull();
  });

  it('is unavailable without a key and calls the documented URL with the key from the environment', async () => {
    const src = new SplGeocodeSource();
    delete process.env.SPL_API_KEY; delete process.env.SPL_GEOCODE_URL;
    expect(await src.reverse(RIYADH)).toEqual({ outcome: 'unavailable' });
    process.env.SPL_API_KEY = 'k-1';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ Addresses: [{ Street: 'S', District: 'D', City: 'C' }] }), { status: 200 }));
    const out = await src.reverse(RIYADH);
    expect(out).toMatchObject({ outcome: 'found', address: { source: 'spl', street: 'S' } });
    const url = String(fetchMock.mock.calls[0][0]);
    expect(url).toContain('apina.address.gov.sa/NationalAddress/v3.1/address/address-geocode');
    expect(url).toContain('lat=24.7136');
    expect(url).toContain('long=46.6753');
    expect(url).toContain('api_key=k-1');
  });

  it('404 is "none", other failures are "unavailable"', async () => {
    process.env.SPL_API_KEY = 'k';
    const src = new SplGeocodeSource();
    jest.spyOn(globalThis, 'fetch').mockResolvedValueOnce(new Response('', { status: 404 })).mockResolvedValueOnce(new Response('', { status: 403 })).mockRejectedValueOnce(new Error('boom'));
    expect(await src.reverse(RIYADH)).toEqual({ outcome: 'none' });
    expect(await src.reverse(RIYADH)).toEqual({ outcome: 'unavailable' });
    expect(await src.reverse(RIYADH)).toEqual({ outcome: 'unavailable' });
  });
});

describe('OpenStreetMap Nominatim, through the backend only', () => {
  const saved = { ...process.env };
  afterEach(() => { process.env = { ...saved }; jest.restoreAllMocks(); });
  const redisWith = (answers: Array<string | null>) => ({ getClient: () => ({ set: jest.fn(async () => (answers.length ? answers.shift() : 'OK')) }) });

  it('sends an identifying User-Agent, asks for Arabic names and maps the address', async () => {
    process.env.GEO_USER_AGENT = 'NabdPlus-test/1.0 (+https://nabd.plus)';
    const fetchMock = jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ address: { road: 'طريق الملك فهد', house_number: '12', postcode: '12211', suburb: 'العليا', city: 'الرياض' } }), { status: 200 }));
    const out = await new NominatimSource(redisWith(['OK']) as never).reverse(RIYADH);
    expect(out).toEqual({ outcome: 'found', address: { source: 'osm', city: 'الرياض', district: 'العليا', street: 'طريق الملك فهد', building_no: '12', postal_code: '12211' } });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain('nominatim.openstreetmap.org/reverse');
    expect(url).toContain('accept-language=ar');
    expect((init.headers as Record<string, string>)['User-Agent']).toBe('NabdPlus-test/1.0 (+https://nabd.plus)');
  });

  it('waits for the one-second slot and gives up (unavailable) instead of queueing past three seconds', async () => {
    const fetchMock = jest.spyOn(globalThis, 'fetch');
    const src = new NominatimSource(redisWith(new Array(60).fill(null)) as never);
    const started = Date.now();
    expect(await src.reverse(RIYADH)).toEqual({ outcome: 'unavailable' });
    expect(Date.now() - started).toBeGreaterThanOrEqual(2900);
    expect(fetchMock).not.toHaveBeenCalled();
  }, 10000);

  it('"nothing found" and "error" answers are "none"', async () => {
    jest.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(JSON.stringify({ error: 'Unable to geocode' }), { status: 200 }));
    expect(await new NominatimSource(redisWith(['OK']) as never).reverse(RIYADH)).toEqual({ outcome: 'none' });
  });
});
