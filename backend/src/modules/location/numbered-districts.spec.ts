/**
 * The numbered placeholder districts (owner ruling 2026-10-26): deleted from the seed and, through the guarded apply, from the database,
 * after every reference is re-pointed to the nearest real district of the same city (by the reference's own point) or cleared.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike } from '../catalogs/catalogue-apply.core';
import { planNumberedDistricts } from '../catalogs/catalogue-apply.steps';
import { SAUDI_LOCATIONS_SEED } from './seeds/saudi-locations.data';
import { distanceKm, isNumberedDistrict, nearestDistrict, pointOfRecord } from './numbered-districts';

describe('isNumberedDistrict', () => {
  it('matches the generator\'s names only (both languages end in a number)', () => {
    expect(isNumberedDistrict({ type: 'district', name_ar: 'حي ضبا 7', name_en: 'Duba District 7' })).toBe(true);
    expect(isNumberedDistrict({ type: 'district', name_ar: 'حي الملقا', name_en: 'Al Malqa District' })).toBe(false);
    expect(isNumberedDistrict({ type: 'district', name_ar: 'حي الأحساء 39', name_en: 'Al-Ahsa District 39' })).toBe(true);
    expect(isNumberedDistrict({ type: 'district', name_ar: 'حي النخيل 2', name_en: 'Al Nakheel 2nd District' })).toBe(false);
    expect(isNumberedDistrict({ type: 'city', name_ar: 'X 1', name_en: 'X District 1' })).toBe(false);
  });
});

describe('the seed', () => {
  it('has no numbered district any more, and no district whose parent is missing', () => {
    expect(SAUDI_LOCATIONS_SEED.filter(isNumberedDistrict)).toEqual([]);
    const codes = new Set(SAUDI_LOCATIONS_SEED.map((l) => l.code));
    for (const l of SAUDI_LOCATIONS_SEED) if (l.parent_code) expect(codes.has(l.parent_code)).toBe(true);
  });
  it('keeps the real districts (the named ones of Riyadh are still there)', () => {
    expect(SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'district' && l.parent_code === 'sa-riyadh').length).toBeGreaterThan(100);
  });
});

describe('nearestDistrict / pointOfRecord', () => {
  const real = [
    { code: 'a-001', coordinates: { lat: 24.80, lng: 46.60 } },
    { code: 'a-002', coordinates: { lat: 24.60, lng: 46.70 } },
    { code: 'a-003', coordinates: null },
  ];
  it('picks the nearest centroid, ignores rows without one, ties go to the lower code', () => {
    expect(nearestDistrict({ lat: 24.79, lng: 46.61 }, real)?.code).toBe('a-001');
    expect(nearestDistrict({ lat: 24.61, lng: 46.69 }, real)?.code).toBe('a-002');
    expect(nearestDistrict({ lat: 24.7, lng: 46.65 }, [{ code: 'z', coordinates: { lat: 24.8, lng: 46.65 } }, { code: 'b', coordinates: { lat: 24.6, lng: 46.65 } }])?.code).toBe('b');
    expect(nearestDistrict({ lat: 1, lng: 1 }, [{ code: 'x' }])).toBeNull();
    expect(distanceKm({ lat: 24.7, lng: 46.6 }, { lat: 24.7, lng: 46.6 })).toBe(0);
  });
  it('reads the first point that holds two numbers inside the kingdom', () => {
    const pts = [{ lat: 'location.lat', lng: 'location.lng' }, { lat: 'lat', lng: 'lng' }];
    expect(pointOfRecord({ location: { lat: 24.7, lng: 46.6 } }, pts)).toEqual({ lat: 24.7, lng: 46.6 });
    expect(pointOfRecord({ lat: 24.7, lng: 46.6 }, pts)).toEqual({ lat: 24.7, lng: 46.6 });
    expect(pointOfRecord({ lat: 0, lng: 0 }, pts)).toBeNull();
    expect(pointOfRecord({ lat: '24', lng: '46' }, pts)).toBeNull();
  });
});

describe('planNumberedDistricts on a database', () => {
  jest.setTimeout(120_000);
  let mongod: MongoMemoryServer; let db: DbLike;
  const raw = () => mongoose.connection.db!;
  const loc = (code: string, type: string, parent: string | null, ar: string, en: string, c?: { lat: number; lng: number }) => ({ code, type, parent_code: parent, name_ar: ar, name_en: en, is_active: true, ...(c ? { coordinates: c } : {}) });
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'numbered_districts_test' }); db = raw() as unknown as DbLike; });
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
  beforeEach(async () => {
    for (const c of ['locations', 'patient_profiles', 'orders', 'facilities', 'provider_profiles']) await raw().collection(c).deleteMany({});
    await raw().collection('locations').insertMany([
      // riyadh: two real districts with centroids + two numbered
      loc('sa-riyadh-001', 'district', 'sa-riyadh', 'حي الملقا', 'Al Malqa District', { lat: 24.81, lng: 46.62 }),
      loc('sa-riyadh-002', 'district', 'sa-riyadh', 'حي الشفا', 'Ash Shifa District', { lat: 24.55, lng: 46.70 }),
      loc('sa-riyadh-090', 'district', 'sa-riyadh', 'حي الرياض 90', 'Riyadh District 90'),
      loc('sa-riyadh-091', 'district', 'sa-riyadh', 'حي الرياض 91', 'Riyadh District 91'),
      // duba: only numbered districts (no real one at all)
      loc('sa-duba-001', 'district', 'sa-duba', 'حي ضباء 1', 'Duba District 1'),
      loc('sa-duba-002', 'district', 'sa-duba', 'حي ضباء 2', 'Duba District 2'),
      // jeddah: a real district without a centroid yet + a numbered one => deferred
      loc('sa-jeddah-001', 'district', 'sa-jeddah', 'حي الروضة', 'Ar Rawdah District'),
      loc('sa-jeddah-050', 'district', 'sa-jeddah', 'حي جدة 50', 'Jeddah District 50'),
    ]);
  });
  const exists = async (code: string) => !!(await raw().collection('locations').findOne({ code }));

  it('re-points references by their own point (same language), clears those without a point, deletes the rows, prints counts per city', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [
      { id: 'a', city: 'الرياض', district: 'حي الرياض 90', lat: 24.82, lng: 46.63 }, // near Al Malqa
      { id: 'b', city: 'Riyadh', district: 'Riyadh District 91', lat: 24.54, lng: 46.71 }, // near Ash Shifa, English
      { id: 'c', city: 'الرياض', district: 'حي الرياض 90' }, // no point
      { id: 'd', city: 'الرياض', district: 'حي الملقا' }, // real: untouched
    ] });
    await raw().collection('orders').insertOne({ address: { city: 'Duba', district: 'Duba District 1' } });
    await raw().collection('facilities').insertOne({ city: 'الرياض', district: 'sa-riyadh-091', location: { lat: 24.80, lng: 46.60 } });
    const { changes, report } = await planNumberedDistricts(db);

    const riyadh = report.cities.find((c) => c.city === 'sa-riyadh')!;
    expect(riyadh).toMatchObject({ numbered: 2, real: 2, real_with_centroid: 2, referenced: 4, repointed: 3, cleared: 1, action: 'deleted' });
    expect(report.cities.find((c) => c.city === 'sa-duba')).toMatchObject({ numbered: 2, real: 0, referenced: 1, repointed: 0, cleared: 1, action: 'deleted' });
    expect(report.cities.find((c) => c.city === 'sa-jeddah')).toMatchObject({ numbered: 1, real: 1, real_with_centroid: 0, action: 'deferred_no_real_district_has_a_centroid_yet' });
    expect(report).toMatchObject({ numbered_rows: 5, deleted_rows: 4, deferred_rows: 1, references_repointed: 3, references_cleared: 2 });

    await applyChanges(db, changes);
    const addr = (await raw().collection('patient_profiles').findOne({}))!.addresses;
    expect(addr.map((a: any) => a.district)).toEqual(['حي الملقا', 'Ash Shifa District', '', 'حي الملقا']);
    expect((await raw().collection('orders').findOne({}))!.address.district).toBe('');
    expect((await raw().collection('facilities').findOne({}))!.district).toBe('sa-riyadh-001'); // stored as a code: written as a code
    for (const code of ['sa-riyadh-090', 'sa-riyadh-091', 'sa-duba-001', 'sa-duba-002']) expect(await exists(code)).toBe(false);
    for (const code of ['sa-riyadh-001', 'sa-riyadh-002', 'sa-jeddah-001', 'sa-jeddah-050']) expect(await exists(code)).toBe(true); // real kept; jeddah waits
    expect((await planNumberedDistricts(db)).changes.filter((c) => c.kind === 'delete').length).toBe(1); // only the deferred one remains
  });

  it('once the deferred city has a centroid, the next plan handles it', async () => {
    await raw().collection('locations').updateOne({ code: 'sa-jeddah-001' }, { $set: { coordinates: { lat: 21.5, lng: 39.2 } } });
    const { report } = await planNumberedDistricts(db);
    expect(report.cities.find((c) => c.city === 'sa-jeddah')).toMatchObject({ action: 'deleted' });
    expect(report.deferred_rows).toBe(0);
  });

  it('rolls back: the rows come back with their _id and the references go back', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'الرياض', district: 'حي الرياض 90', lat: 24.82, lng: 46.63 }] });
    const id = (await raw().collection('locations').findOne({ code: 'sa-riyadh-090' }))!._id;
    const { changes } = await planNumberedDistricts(db);
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    expect((await raw().collection('locations').findOne({ code: 'sa-riyadh-090' }))!._id).toEqual(id);
    expect((await raw().collection('patient_profiles').findOne({}))!.addresses[0].district).toBe('حي الرياض 90');
  });

  it('does not write a reference that changed since the plan', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'الرياض', district: 'حي الرياض 90', lat: 24.82, lng: 46.63 }] });
    const { changes } = await planNumberedDistricts(db);
    await raw().collection('patient_profiles').updateOne({}, { $set: { 'addresses.0.district': 'حي جديد' } });
    await applyChanges(db, changes);
    expect((await raw().collection('patient_profiles').findOne({}))!.addresses[0].district).toBe('حي جديد');
  });
});
