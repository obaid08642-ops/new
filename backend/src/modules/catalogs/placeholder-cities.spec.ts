/**
 * Placeholder and suspect cities (owner decision 2026-10-26): inactive, never deleted, references checked first. In-memory MongoDB.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike } from './catalogue-apply.core';
import { planPlaceholderCities } from './catalogue-apply.steps';
import { LISTED_ONLY_CITY_CODES, PLACEHOLDER_CITY_CODES, SUSPECT_CITY_RULES } from '../location/placeholder-cities';
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

const active = async (code: string) => (await raw().collection('locations').findOne({ code }))!.is_active;

describe('the seed', () => {
  const rows = new Map(SAUDI_LOCATIONS_SEED.map((l) => [l.code, l]));
  it('has every listed code, and they are inactive with their districts', () => {
    for (const code of [...PLACEHOLDER_CITY_CODES, ...SUSPECT_CITY_RULES.map((r) => r.code)]) {
      expect(rows.get(code)?.type).toBe('city');
      expect(rows.get(code)?.is_active).toBe(false);
    }
    const roots = new Set([...PLACEHOLDER_CITY_CODES, ...SUSPECT_CITY_RULES.map((r) => r.code)]);
    const kids = SAUDI_LOCATIONS_SEED.filter((l) => l.parent_code && roots.has(l.parent_code));
    expect(kids.length).toBeGreaterThan(0);
    expect(kids.every((k) => k.is_active === false)).toBe(true);
    for (const code of LISTED_ONLY_CITY_CODES) expect(rows.get(code)?.is_active).toBe(true);
  });
  it('keeps the real cities active (nothing else was switched off)', () => {
    const off = SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city' && !l.is_active).map((l) => l.code).sort();
    expect(off).toEqual([...PLACEHOLDER_CITY_CODES, ...SUSPECT_CITY_RULES.map((r) => r.code)].sort());
  });
  it('merge targets exist as active cities', () => {
    for (const r of SUSPECT_CITY_RULES) if (r.into) expect(rows.get(r.into)?.is_active).toBe(true);
  });
});

describe('planPlaceholderCities', () => {
  it('deactivates an unreferenced placeholder and its districts, deletes nothing, and a second plan is empty', async () => {
    const before = await raw().collection('locations').countDocuments();
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.deactivated_cities).toContain('sa-central-city-1');
    await applyChanges(db, changes);
    expect(await active('sa-central-city-1')).toBe(false);
    expect(await active('sa-central-city-1-001')).toBe(false);
    expect(await active('sa-riyadh')).toBe(true);
    expect(await raw().collection('locations').countDocuments()).toBe(before);
    expect((await planPlaceholderCities(db)).changes).toHaveLength(0);
  });

  it('does not touch a placeholder that an address, provider or order still holds, and prints the counts', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'Central City 2' }, { id: 'b', city: 'الرياض' }] });
    await raw().collection('orders').insertOne({ address: { city: 'مدينة وسطى 2' } });
    await raw().collection('provider_profiles').insertOne({ city: 'sa-central-city-2' });
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.blocked_by_references).toEqual(['sa-central-city-2']);
    expect(report.references['sa-central-city-2']).toEqual({ 'patient_profiles.addresses.city': 1, 'provider_profiles.city': 1, 'orders.address.city': 1 });
    await applyChanges(db, changes);
    expect(await active('sa-central-city-2')).toBe(true);
    expect(await active('sa-central-city-1')).toBe(false);
  });

  it('merges sa-duba3 into sa-duba: references are rewritten in the same language, then the row goes inactive', async () => {
    await raw().collection('patient_profiles').insertOne({ addresses: [{ id: 'a', city: 'ضبا' }, { id: 'b', city: 'Duba3' }, { id: 'c', city: 'تبوك' }] });
    await raw().collection('users').insertOne({ city: 'ضبا' });
    await raw().collection('orders').insertOne({ address: { city: 'sa-duba3' } });
    const { changes, report } = await planPlaceholderCities(db);
    expect(report.merged.find((m) => m.code === 'sa-duba3')).toMatchObject({ into: 'sa-duba', rewritten_references: 4 });
    await applyChanges(db, changes);
    expect((await raw().collection('patient_profiles').findOne({}))!.addresses.map((a: any) => a.city)).toEqual(['ضباء', 'Duba', 'تبوك']);
    expect((await raw().collection('users').findOne({}))!.city).toBe('ضباء');
    expect((await raw().collection('orders').findOne({}))!.address.city).toBe('sa-duba');
    expect(await active('sa-duba3')).toBe(false);
    expect(await active('sa-duba3-001')).toBe(false);
    expect(await active('sa-duba')).toBe(true);
    expect((await planPlaceholderCities(db)).changes).toHaveLength(0);
  });

  it('moves Al Umran to Al-Ahsa, makes Al Many inactive, and only lists Sudair', async () => {
    await raw().collection('facilities').insertOne({ city: 'العمران' });
    const { changes, report } = await planPlaceholderCities(db);
    await applyChanges(db, changes);
    expect((await raw().collection('facilities').findOne({}))!.city).toBe('الأحساء');
    expect(await active('sa-al-umran')).toBe(false);
    expect(await active('sa-al-many')).toBe(false);
    expect(await active('sa-sudair')).toBe(true);
    expect(report.listed_only).toEqual(['sa-sudair']);
  });

  it('rolls back to the exact before-images', async () => {
    await raw().collection('users').insertOne({ city: 'ضبا' });
    const { changes } = await planPlaceholderCities(db);
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    expect(await active('sa-central-city-1')).toBe(true);
    expect(await active('sa-duba3')).toBe(true);
    expect((await raw().collection('users').findOne({}))!.city).toBe('ضبا');
  });

  it('does not write a change when the value moved since the plan (compare-and-set)', async () => {
    await raw().collection('users').insertOne({ city: 'ضبا' });
    const { changes } = await planPlaceholderCities(db);
    await raw().collection('users').updateOne({}, { $set: { city: 'تبوك' } });
    await applyChanges(db, changes);
    expect((await raw().collection('users').findOne({}))!.city).toBe('تبوك');
  });
});
