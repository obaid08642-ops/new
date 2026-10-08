import { pointInPolygon, validatePolygon, ServiceAreaService } from './service-area.service';
import { CityLaunchService } from './city-launch.service';
import { CoverageService } from './coverage.service';

type Doc = Record<string, unknown>;

function makeConn() {
  const store: Record<string, Doc[]> = {
    service_areas: [],
    city_launches: [],
    provider_profiles: [],
    locations: [{ code: 'sa-riyadh', type: 'city', name_en: 'Riyadh' }],
  };
  const matches = (doc: Doc, filter: Record<string, unknown>): boolean => {
    for (const [k, cond] of Object.entries(filter)) {
      const c = cond as Doc;
      if (c !== null && typeof c === 'object' && '$eq' in c) {
        if (doc[k] !== c['$eq']) return false;
      } else if (doc[k] !== (cond as unknown)) return false;
    }
    return true;
  };
  const conn = {
    collection: (name: string) => ({
      findOne: async (f: Record<string, unknown>): Promise<Doc | null> =>
        (store[name] || []).find((d) => matches(d, f)) ?? null,
      insertOne: async (d: Doc): Promise<{ insertedId: unknown }> => {
        (store[name] = store[name] || []).push(d);
        return { insertedId: d['id'] };
      },
      updateOne: async (
        f: Record<string, unknown>,
        u: Record<string, unknown>,
        opts?: Record<string, unknown>,
      ): Promise<{ modifiedCount: number; upsertedCount: number }> => {
        const d = (store[name] || []).find((x) => matches(x, f));
        if (!d) {
          if (opts?.['upsert']) {
            (store[name] = store[name] || []).push({ ...(u['$set'] as Doc) });
            return { modifiedCount: 0, upsertedCount: 1 };
          }
          return { modifiedCount: 0, upsertedCount: 0 };
        }
        Object.assign(d, (u['$set'] as Doc) || {});
        return { modifiedCount: 1, upsertedCount: 0 };
      },
      find: (f: Record<string, unknown>) => ({
        toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)),
        limit: (n: number) => ({
          toArray: async (): Promise<Doc[]> => (store[name] || []).filter((d) => matches(d, f)).slice(0, n),
        }),
      }),
      countDocuments: async (f: Record<string, unknown>): Promise<number> =>
        (store[name] || []).filter((d) => matches(d, f)).length,
    }),
  };
  return { store, conn };
}

const asConn = (conn: unknown): import('mongoose').Connection => conn as import('mongoose').Connection;

const triangle = [
  { lat: 24.7, lng: 46.6 },
  { lat: 24.8, lng: 46.6 },
  { lat: 24.75, lng: 46.8 },
];

const areaDto = (code: string, idem: string) => ({
  code,
  nameAr: 'شمال',
  nameEn: 'North',
  cityCode: 'sa-riyadh',
  polygon: triangle,
  zoneRules: { maxDistanceKm: 20, capacityPerDay: 100, allowedServices: ['pharmacy_delivery'] },
  idempotencyKey: idem,
});

describe('P22.16 service-area geometry (pure)', () => {
  it('pointInPolygon classifies inside/outside', () => {
    expect(pointInPolygon({ lat: 24.75, lng: 46.65 }, triangle)).toBe(true);
    expect(pointInPolygon({ lat: 25.5, lng: 47.5 }, triangle)).toBe(false);
  });

  it('validatePolygon rejects degenerate geometry', () => {
    expect(() => validatePolygon([{ lat: 1, lng: 1 }, { lat: 2, lng: 2 }])).toThrow('polygon_min_3_points');
    expect(() =>
      validatePolygon([
        { lat: 1, lng: 1 },
        { lat: 1, lng: 1 },
        { lat: 1, lng: 1 },
      ]),
    ).toThrow('polygon_degenerate');
    expect(() =>
      validatePolygon([
        { lat: 91, lng: 1 },
        { lat: 2, lng: 2 },
        { lat: 3, lng: 3 },
      ]),
    ).toThrow('polygon_bad_lat');
  });
});

describe('P22.16 service-area CRUD (mocked store)', () => {
  it('creates + lists + updates + deactivates areas; validates city + geometry', async () => {
    const { store, conn } = makeConn();
    const svc = new ServiceAreaService(asConn(conn));
    const created = await svc.create(areaDto('area-n', 'idem-area-1') as never);
    expect(created['code']).toBe('area-n');
    const dupKey = await svc.create({ ...areaDto('area-n2', 'idem-area-1'), code: 'area-n2' } as never);
    expect(dupKey['code']).toBe('area-n');
    expect(store['service_areas'].length).toBe(1);
    await expect(svc.create(areaDto('area-n', 'idem-area-2') as never)).rejects.toThrow('area_code_exists');
    await expect(svc.create({ ...areaDto('area-x', 'idem-area-3'), cityCode: 'nope' } as never)).rejects.toThrow(
      'city_not_found',
    );
    await expect(
      svc.create({ ...areaDto('area-y', 'idem-area-4'), zoneRules: { allowedServices: ['teleport'] } } as never),
    ).rejects.toThrow('zone_unknown_service:teleport');
    const updated = await svc.update('area-n', { nameEn: 'North Updated', active: true });
    expect(updated['name_en']).toBe('North Updated');
    const listed = await svc.list('sa-riyadh');
    expect(listed.length).toBe(1);
    const removed = await svc.remove('area-n');
    expect(removed).toEqual({ ok: true });
  });
});

describe('P22.16 city launch switches (mocked store)', () => {
  it('fail-open default; explicit switch gates per service', async () => {
    const { conn } = makeConn();
    const svc = new CityLaunchService(asConn(conn));
    expect(await svc.isLaunched('sa-riyadh', 'cod')).toBe(true);
    await svc.setSwitch({ cityCode: 'sa-riyadh', service: 'cod', enabled: false, idempotencyKey: 'idem-cl-1' });
    expect(await svc.isLaunched('sa-riyadh', 'cod')).toBe(false);
    expect(await svc.isLaunched('sa-riyadh', 'pharmacy_delivery')).toBe(true);
    const row = await svc.forCity('sa-riyadh');
    expect(row).toEqual({ cod: false });
    await expect(
      svc.setSwitch({ cityCode: 'sa-riyadh', service: 'teleport', enabled: true, idempotencyKey: 'idem-cl-2' } as never),
    ).rejects.toThrow('unknown_service');
  });
});

describe('P22.16 provider coverage from real data (mocked store)', () => {
  it('coverage by area counts matching profiles (cities + geo-in-polygon)', async () => {
    const { conn } = makeConn();
    const areas = new ServiceAreaService(asConn(conn));
    await areas.create(areaDto('area-n', 'idem-cov-area') as never);
    const profCol = (conn as unknown as { collection: (n: string) => { insertOne: (d: Doc) => Promise<unknown> } }).collection(
      'provider_profiles',
    );
    await profCol.insertOne({ account_id: 'a1', provider_type: 'pharmacy', service_area_cities: ['sa-riyadh'] });
    await profCol.insertOne({ account_id: 'a2', provider_type: 'doctor', city: 'sa-riyadh' });
    await profCol.insertOne({ account_id: 'a3', provider_type: 'pharmacy', geo: { lat: 24.75, lng: 46.65 } });
    await profCol.insertOne({ account_id: 'a4', provider_type: 'pharmacy', city: 'sa-jeddah' });
    const cov = new CoverageService(asConn(conn));
    const rows = await cov.byCity('sa-riyadh');
    expect(rows.length).toBe(1);
    expect(rows[0].areaCode).toBe('area-n');
    // a1 (service_area_cities) + a2 (city) + a3 (geo inside polygon); a4 excluded
    expect(rows[0].providers).toBe(3);
    expect(rows[0].byType).toEqual({ pharmacy: 2, doctor: 1 });
    expect(rows[0].covered).toBe(true);
    const summary = await cov.citySummary('sa-riyadh');
    expect(summary.areas).toBe(1);
    expect(summary.providers).toBe(2);
    expect(summary.uncoveredAreas).toEqual([]);
  });

  it('empty cities report uncovered areas', async () => {
    const { conn } = makeConn();
    const areas = new ServiceAreaService(asConn(conn));
    await areas.create(areaDto('area-n', 'idem-cov2-area') as never);
    const cov = new CoverageService(asConn(conn));
    const rows = await cov.byCity('sa-riyadh');
    expect(rows[0].providers).toBe(0);
    expect(rows[0].covered).toBe(false);
    const summary = await cov.citySummary('sa-riyadh');
    expect(summary.uncoveredAreas).toEqual(['area-n']);
  });
});
