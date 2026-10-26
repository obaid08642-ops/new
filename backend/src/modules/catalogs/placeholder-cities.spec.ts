/**
 * Placeholder and suspect cities (owner decision 2026-10-26): deleted, references re-pointed first. In-memory MongoDB.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike, type InsertChange } from './catalogue-apply.core';
import { planDistricts, planPlaceholderCities } from './catalogue-apply.steps';
import { DELETE_CITY_RULES, LISTED_ONLY_CITY_CODES } from '../location/placeholder-cities';
import { SAUDI_LOCATIONS_SEED } from '../location/seeds/saudi-locations.data';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
let db: DbLike;
const raw = () => mongoose.connection.db!;
const loc = (code: string, type: string, parent: string | null, ar: string, en: string) => ({ code, type, parent_code: parent, name_ar: ar, name_en: en, is_active: true });

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'placeholder_cities_test' });
  db = raw() as unknown as DbLike;
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(async () => {
  for (const c of ['locations', 'patient_profiles', 'users', 'provider_profiles', 'facilities', 'provider_branches', 'hospital_branches', 'orders']) await raw().collection(c).deleteMany({});
  await raw().collection('locations').insertMany([
    loc('sa-riyadh', 'city', 'sa-central-region', 'الرياض', 'Riyadh'),
    loc('sa-central-city-1', 'city', 'sa-central-region', 'مدينة وسطى 1', 'Central City 1'),
    loc('sa-jeddah', 'city', 'sa-western-region', 'جدة', 'Jeddah'),
    loc('sa-jeddah-new', 'city', 'sa-western-region', 'جدة الجديدة', 'Jeddah New'),
    loc('sa-central-city-1-001', 'district', 'sa-central-city-1', 'حي مدينة وسطى 1 1', 'Central City 1 District 1'),
    loc('sa-central-city-2', 'city', 'sa-central-region', 'مدينة وسطى 2', 'Central City 2'),
    loc('sa-duba', 'city', 'sa-northern-region', 'ضباء', 'Duba'),
    loc('sa-duba3', 'city', 'sa-northern-region', 'ضبا', 'Duba3'),
    loc('sa-duba3-001', 'district', 'sa-duba3', 'حي ضبا 1', 'Duba3 District 1'),
    loc('sa-al-ahsa', 'city', 'sa-eastern-region', 'الأحساء', 'Al-Ahsa'),
    loc('sa-al-umran', 'city', 'sa-eastern-region', 'العمران', 'Al Umran'),
    loc('sa-al-many', 'city', 'sa-eastern-region', 'ال many', 'Al Many'),
    loc('sa-sudair', 'city', 'sa-central-region', 'سدير', 'Sudair'),
  ]);
});

const exists = async (code: string) => !!(await raw().collection('locations').findOne({ code }));

describe('the seed', () => {
  const codes = new Set(SAUDI_LOCATIONS_SEED.map((l) => l.code));
  it('no longer has the deleted rows or their districts', () => {
    const roots = new Set(DELETE_CITY_RULES.map((r) => r.code));
    expect(SAUDI_LOCATIONS_SEED.filter((l) => roots.has(l.code) || (l.parent_code && roots.has(l.parent_code)))).toEqual([]);
  });
  it('keeps the listed-only cities and every re-point target as active cities', () => {
    const rows = new Map(SAUDI_LOCATIONS_SEED.map((l) => [l.code, l]));
    for (const c of LISTED_ONLY_CITY_CODES) expect(rows.get(c)?.is_active).toBe(true);
    for (const r of DELETE_CITY_RULES) if (r.into) expect(rows.get(r.into)).toMatchObject({ type: 'city', is_active: true });
    expect(codes.has('sa-al-ahsa-034') && codes.has('sa-al-ahsa-035')).toBe(true);
  });
  it('every city still has a known parent', () => {
    for (const l of SAUDI_LOCATIONS_SEED) if (l.parent_code) expect(codes.has(l.parent_code)).toBe(true);
  });
});

describe('planPlaceholderCities', () => {
  it('deletes an unreferenced placeholder with its districts, nothing else, and a second plan is empty', async () => {
    const before = await raw().collection('locations').countDocuments();
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.deleted_cities).toContain('sa-central-city-1');
    const res = await applyChanges(db, changes);
    expect(res.deleted).toBe(report.deleted_rows);
    expect(await exists('sa-central-city-1')).toBe(false);
    expect(await exists('sa-central-city-1-001')).toBe(false);
    expect(await exists('sa-riyadh')).toBe(true);
    expect(await raw().collection('locations').countDocuments()).toBe(before - report.deleted_rows);
    expect((await planPlaceholderCities(db)).changes).toHaveLength(0);
  });

  it('re-points a referenced placeholder with no real counterpart to the main city of its region, lists it, and prints the counts', async () => {
    await raw().collection('locations').insertOne(loc('sa-riyadh-x', 'city', 'sa-central-region', 'x', 'x')); // a bystander
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'Central City 2' }, { id: 'b', city: 'الرياض' }] });
    await raw().collection('orders').insertOne({ address: { city: 'مدينة وسطى 2' } });
    await raw().collection('provider_profiles').insertOne({ city: 'sa-central-city-2' });
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.references['sa-central-city-2']).toEqual({ 'patient_profiles.addresses.city': 1, 'provider_profiles.city': 1, 'orders.address.city': 1 });
    expect(report.repointed.find((m) => m.code === 'sa-central-city-2')).toEqual({ code: 'sa-central-city-2', into: 'sa-riyadh', rewritten_references: 3, how: 'region_default' });
    await applyChanges(db, changes);
    expect((await raw().collection('patient_profiles').findOne({}))!.addresses.map((a: any) => a.city)).toEqual(['Riyadh', 'الرياض']);
    expect((await raw().collection('orders').findOne({}))!.address.city).toBe('الرياض');
    expect((await raw().collection('provider_profiles').findOne({}))!.city).toBe('sa-riyadh');
    expect(await exists('sa-central-city-2')).toBe(false);
    expect((await planPlaceholderCities(db)).changes).toHaveLength(0);
  });

  it('re-points a *-new row to its real city before deleting it', async () => {
    await raw().collection('provider_branches').insertOne({ city: 'جدة الجديدة' });
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.repointed.find((m) => m.code === 'sa-jeddah-new')).toMatchObject({ into: 'sa-jeddah', rewritten_references: 1 });
    await applyChanges(db, changes);
    expect((await raw().collection('provider_branches').findOne({}))!.city).toBe('جدة');
    expect(await exists('sa-jeddah-new')).toBe(false);
  });

  it('merges sa-duba3 into sa-duba: references rewritten in the same language, rows deleted', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'ضبا' }, { id: 'b', city: 'Duba3' }, { id: 'c', city: 'تبوك' }] });
    await raw().collection('users').insertOne({ city: 'ضبا' });
    await raw().collection('orders').insertOne({ address: { city: 'sa-duba3' } });
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.repointed.find((m) => m.code === 'sa-duba3')).toMatchObject({ into: 'sa-duba', rewritten_references: 4 });
    await applyChanges(db, changes);
    expect((await raw().collection('patient_profiles').findOne({}))!.addresses.map((a: any) => a.city)).toEqual(['ضباء', 'Duba', 'تبوك']);
    expect((await raw().collection('users').findOne({}))!.city).toBe('ضباء');
    expect((await raw().collection('orders').findOne({}))!.address.city).toBe('sa-duba');
    expect(await exists('sa-duba3')).toBe(false);
    expect(await exists('sa-duba3-001')).toBe(false);
    expect(await exists('sa-duba')).toBe(true);
    expect((await planPlaceholderCities(db)).changes).toHaveLength(0);
  });

  it('moves Al Umran to Al-Ahsa, deletes Al Many, and only lists Sudair', async () => {
    await raw().collection('facilities').insertOne({ city: 'العمران' });
    const { changes, report } = await planPlaceholderCities(db);
    await applyChanges(db, changes);
    expect((await raw().collection('facilities').findOne({}))!.city).toBe('الأحساء');
    expect(await exists('sa-al-umran')).toBe(false);
    expect(await exists('sa-al-many')).toBe(false);
    expect(await exists('sa-sudair')).toBe(true);
    expect(report.listed_only).toEqual(['sa-sudair']);
  });

  it('rolls back: the rows come back with the same _id, and the references go back', async () => {
    await raw().collection('users').insertOne({ city: 'ضبا' });
    const id = (await raw().collection('locations').findOne({ code: 'sa-duba3' }))!._id;
    const { changes } = await planPlaceholderCities(db);
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    expect((await raw().collection('locations').findOne({ code: 'sa-duba3' }))!._id).toEqual(id);
    expect(await exists('sa-central-city-1-001')).toBe(true);
    expect((await raw().collection('users').findOne({}))!.city).toBe('ضبا');
  });

  it('does not delete a row that was replaced since the plan (different _id), nor write a moved value', async () => {
    await raw().collection('users').insertOne({ city: 'ضبا' });
    const { changes } = await planPlaceholderCities(db);
    await raw().collection('locations').deleteOne({ code: 'sa-central-city-1' });
    await raw().collection('locations').insertOne(loc('sa-central-city-1', 'city', 'sa-central-region', 'مدينة وسطى 1', 'Central City 1'));
    await raw().collection('users').updateOne({}, { $set: { city: 'تبوك' } });
    await applyChanges(db, changes);
    expect(await exists('sa-central-city-1')).toBe(true);
    expect((await raw().collection('users').findOne({}))!.city).toBe('تبوك');
  });
});

describe('new cities from the extract (planDistricts)', () => {
  const extract = {
    new_cities: [{ code: 'sa-ad-dilam', name_ar: 'الدلم', name_en: 'Ad Dilam', region_code: 'sa-central-region', lat: 23.99, lng: 47.16, source: 'osm:node/1' }],
    districts: [{ city_code: 'sa-ad-dilam', name_ar: 'النزهة', name_en: 'An Nuzha', lat: 24, lng: 47.1, source: 'osm:node/2' }],
  };
  beforeEach(async () => { await raw().collection('locations').insertOne(loc('sa-central-region', 'region', 'sa', 'المنطقة الوسطى', 'Central Region')); });

  it('inserts the city (with its region, centre and source) before its districts, and a second plan is empty', async () => {
    const plan = await planDistricts(db, extract);
    expect(plan.newCities).toBe(1);
    const inserts = plan.changes.filter((c) => c.kind === 'insert');
    expect(inserts.map((c) => String((c as InsertChange).doc.code))).toEqual(['sa-ad-dilam', 'sa-ad-dilam-001']);
    await applyChanges(db, plan.changes);
    expect(await raw().collection('locations').findOne({ code: 'sa-ad-dilam' })).toMatchObject({ type: 'city', parent_code: 'sa-central-region', is_active: true, coordinates: { lat: 23.99, lng: 47.16 }, source: 'osm:node/1' });
    expect(await raw().collection('locations').findOne({ code: 'sa-ad-dilam-001' })).toMatchObject({ type: 'district', parent_code: 'sa-ad-dilam' });
    expect((await planDistricts(db, extract)).changes).toHaveLength(0);
  });

  it('rolls back: the inserted rows are deleted again', async () => {
    const plan = await planDistricts(db, extract);
    await applyChanges(db, plan.changes);
    await rollbackChanges(db, plan.changes);
    expect(await raw().collection('locations').countDocuments({ code: /^sa-ad-dilam/ })).toBe(0);
  });
});
