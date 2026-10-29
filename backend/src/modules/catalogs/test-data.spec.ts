/**
 * Test-data finder (read-only) and guarded removal plan (owner, 2026-10-28), on an in-memory MongoDB with production's shape:
 * three test providers (a sandbox doctor, a keyboard-mash pharmacy, a keyboard-mash clinic), one real provider, and records linked to each.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, expectedCounts, countsOf, type DbLike } from './catalogue-apply.core';
import { resolveProfileIds, findTestRecords, looksLikeMash, matchedPatterns, planTestDataRemoval, scanDb, REMOVAL_CAP } from './test-data';
import { run as runFinder } from '../../scripts/test-data-find';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const TEST = { doctor: '7210a983-1111-4111-8111-000000000001', pharmacy: 'c142700b-1111-4111-8111-000000000002', clinic: 'f3dee443-1111-4111-8111-000000000003' };
const REAL = 'aaaa0001-1111-4111-8111-000000000009';
const SECRET_EMAIL = 'owner.secret@example.com';

async function seed() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('provider_profiles').insertMany([
    { id: TEST.doctor, user_id: 'u-doc', account_id: 'a-doc', type: 'doctor', name_ar: 'د. اختبار ساندبوكس', name_en: 'Dr Sandbox' },
    { id: TEST.pharmacy, user_id: 'u-ph', account_id: 'a-ph', type: 'pharmacy', name_ar: 'لنبتبت' },
    { id: TEST.clinic, user_id: 'u-cl', account_id: 'a-cl', type: 'clinic', name_ar: 'مسينيزيزسزس اال' },
    { id: REAL, user_id: 'u-real', account_id: 'a-real', type: 'pharmacy', name_ar: 'صيدلية الشفاء', name_en: 'Al Shifa Pharmacy' },
  ]);
  await coll('provider_accounts').insertMany([
    { id: 'a-doc', user_id: 'u-doc', email: 'sandbox.doctor@example.com' }, { id: 'a-ph', user_id: 'u-ph', email: SECRET_EMAIL },
    { id: 'a-cl', user_id: 'u-cl', email: 'clinic@example.com' }, { id: 'a-real', user_id: 'u-real', email: 'real@pharmacy.sa' },
  ]);
  await coll('users').insertMany([{ id: 'u-doc', role: 'doctor' }, { id: 'u-ph', role: 'pharmacy' }, { id: 'u-cl', role: 'clinic' }, { id: 'u-real', role: 'pharmacy' }, { id: 'patient-1', role: 'patient', name: 'Real Patient' }]);
  await coll('provider_sessions').insertMany([{ id: 's1', provider_account_id: 'a-doc', status: 'active' }, { id: 's2', provider_account_id: 'a-real', status: 'active' }]);
  await coll('orders').insertMany([{ id: 'o1', provider_id: TEST.pharmacy, user_id: 'patient-1' }, { id: 'o2', pharmacy_id: 'a-ph' }, { id: 'o-real', provider_id: REAL }]);
  await coll('doctor_appointments').insertMany([{ id: 'b1', doctor_id: 'a-doc', patient_id: 'patient-1' }, { id: 'b-real', doctor_id: 'a-real' }]);
  await coll('reviews').insertOne({ id: 'r1', provider_account_id: 'a-cl', rating: 5 });
  await coll('media_assets').insertOne({ id: 'f1', owner_account_id: 'a-doc', kind: 'document' });
  await coll('provider_audit_logs').insertOne({ id: 'l1', provider_account_id: 'a-doc', action: 'x' });       // the audit trail is never removed
  await coll('medicines').insertMany([{ id: 'm1', name_en: 'Test Product', name_ar: 'منتج' }, { id: 'm2', name_en: 'Panadol', name_ar: 'بنادول' }]);
}

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'test_data_test' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(seed);

describe('pattern helpers', () => {
  it('matches the words, Arabic included, and keyboard mash; a real name is left alone', () => {
    expect(matchedPatterns(['Test Clinic', 'x'], false)).toEqual(['test']);
    expect(matchedPatterns(['د. اختبار ساندبوكس'])).toEqual(['ar_test']);
    expect(matchedPatterns(['Demo Pharmacy', 'Lorem ipsum'], false)).toEqual(['demo', 'lorem']);
    expect(looksLikeMash('لنبتبت')).toBe(true);
    expect(looksLikeMash('مسينيزيزسزس اال')).toBe(true);
    for (const real of ['صيدلية الشفاء', 'مستشفى الملك فهد', 'Al Shifa Pharmacy', 'عيادات الأمل الطبية']) expect(looksLikeMash(real)).toBe(false);
    expect(matchedPatterns(['صيدلية الشفاء', 'Al Shifa Pharmacy'])).toEqual([]);
  });
});

describe('findTestRecords (read-only)', () => {
  it('finds the three test providers by pattern, the listed ids, and test catalogue rows; not the real provider', async () => {
    const before = JSON.stringify(await Promise.all(['provider_profiles', 'orders', 'users'].map((n) => coll(n).find({}).toArray())));
    const res = await findTestRecords(scanDb(raw()), []);
    const profiles = res.candidates.filter((c) => c.collection === 'provider_profiles').map((c) => c.id).sort();
    expect(profiles).toEqual([TEST.doctor, TEST.pharmacy, TEST.clinic].sort());
    expect(res.candidates.some((c) => c.id === REAL)).toBe(false);
    expect(res.candidates.find((c) => c.collection === 'medicines')).toMatchObject({ id: 'm1', matched: ['test'] });
    expect(res.candidates.find((c) => c.id === 'a-doc' && c.collection === 'provider_accounts')?.matched).toEqual(['sandbox']);
    // what each is linked to
    expect(res.links[TEST.pharmacy]).toMatchObject({ orders: 2 });
    expect(res.links[TEST.doctor]).toMatchObject({ doctor_appointments: 1, provider_sessions: 1, media_assets: 1 });
    expect(res.links[TEST.clinic]).toMatchObject({ reviews: 1 });
    expect(Object.keys(res.links[TEST.doctor])).not.toContain('provider_audit_logs');
    expect(JSON.stringify(await Promise.all(['provider_profiles', 'orders', 'users'].map((n) => coll(n).find({}).toArray())))).toBe(before);   // nothing written
  });

  it('a listed id that matches no pattern is still reported', async () => {
    const res = await findTestRecords(scanDb(raw()), [REAL]);
    expect(res.candidates.find((c) => c.id === REAL)).toMatchObject({ matched: ['listed'] });
  });

  it('the tool prints ids, patterns and counts only: no name, e-mail or document', async () => {
    const lines: string[] = [];
    const spy = jest.spyOn(console, 'log').mockImplementation((l: string) => { lines.push(String(l)); });
    try { expect(await runFinder(scanDb(raw()), [])).toBe(0); } finally { spy.mockRestore(); }
    const text = lines.join('\n');
    for (const secret of [SECRET_EMAIL, 'اختبار ساندبوكس', 'Dr Sandbox', 'Real Patient', 'صيدلية الشفاء', 'sandbox.doctor@example.com']) expect(text).not.toContain(secret);
    expect(lines.every((l) => JSON.parse(l).step)).toBe(true);
    expect(text).toContain(TEST.doctor);
    expect(JSON.parse(lines[lines.length - 1])).toMatchObject({ step: 'summary', providers: 3, writes: false });
    // the owner's three ids were given by prefix and were resolved to the full ids
    expect(lines.filter((l) => JSON.parse(l).step === 'links')).toHaveLength(3);
  });
});

describe('planTestDataRemoval', () => {
  const ids = [TEST.doctor, TEST.pharmacy, TEST.clinic];

  it('removes only the listed providers, their accounts and logins, sessions and linked records; the real provider and the patient stay', async () => {
    const { changes, report } = await planTestDataRemoval(scanDb(raw()), ids);
    expect(report.profiles_found.sort()).toEqual([...ids].sort());
    expect(report.deletes).toMatchObject({ provider_profiles: 3, provider_accounts: 3, users: 3, provider_sessions: 1, orders: 2, doctor_appointments: 1, reviews: 1, media_assets: 1 });
    expect(Object.keys(report.deletes)).not.toContain('provider_audit_logs');
    expect(Object.keys(report.deletes)).not.toContain('medicines');
    const before = await countsOf(db(), [...new Set(changes.map((c) => c.collection))]);
    const res = await applyChanges(db(), changes);
    expect(res.skipped_changed_since_plan).toBe(0);
    expect(await countsOf(db(), Object.keys(before))).toEqual(expectedCounts(before, changes));
    expect(await coll('provider_profiles').find({}).toArray()).toHaveLength(1);
    expect((await coll('provider_profiles').findOne({}))!.id).toBe(REAL);
    expect(await coll('users').find({}).project({ id: 1, _id: 0 }).toArray()).toEqual(expect.arrayContaining([{ id: 'u-real' }, { id: 'patient-1' }]));
    expect(await coll('users').countDocuments({})).toBe(2);
    expect(await coll('orders').find({}).project({ id: 1, _id: 0 }).toArray()).toEqual([{ id: 'o-real' }]);
    expect(await coll('provider_sessions').find({}).project({ id: 1, _id: 0 }).toArray()).toEqual([{ id: 's2' }]);   // the real provider's session is untouched
    expect(await coll('provider_audit_logs').countDocuments({})).toBe(1);
  });

  it('rollback puts every deleted document back exactly', async () => {
    const snapshot = async () => JSON.stringify(await Promise.all(['provider_profiles', 'provider_accounts', 'users', 'orders', 'provider_sessions', 'reviews', 'media_assets', 'doctor_appointments'].map((n) => coll(n).find({}).sort({ id: 1 }).toArray())));
    const before = await snapshot();
    const { changes } = await planTestDataRemoval(scanDb(raw()), ids);
    await applyChanges(db(), changes);
    expect(await snapshot()).not.toBe(before);
    await rollbackChanges(db(), changes);
    expect(await snapshot()).toBe(before);
  });

  it('a second plan after the apply is empty; an id that does not exist is reported, nothing else is touched', async () => {
    const first = await planTestDataRemoval(scanDb(raw()), ids);
    await applyChanges(db(), first.changes);
    const second = await planTestDataRemoval(scanDb(raw()), [...ids, 'deadbeef-0000']);
    expect(second.changes).toEqual([]);
    expect(second.report.profiles_not_found.sort()).toEqual([...ids, 'deadbeef-0000'].sort());
  });

  it('refuses a plan larger than the cap', async () => {
    await coll('orders').insertMany(Array.from({ length: REMOVAL_CAP + 1 }, (_, i) => ({ id: `bulk${i}`, provider_id: TEST.pharmacy })));
    await expect(planTestDataRemoval(scanDb(raw()), [TEST.pharmacy])).rejects.toThrow(/cap/);
  });
});

describe('8-character id prefixes (the owner lists providers the way the finder prints them)', () => {
  it('a prefix is resolved to the one exact id and the plan reports it; a whole id still works', async () => {
    const { report } = await planTestDataRemoval(scanDb(raw()), ['7210a983', 'c142700b', TEST.clinic]);
    expect(report.resolved_ids).toEqual({ '7210a983': TEST.doctor, c142700b: TEST.pharmacy });
    expect(report.profiles_found.sort()).toEqual([TEST.clinic, TEST.doctor, TEST.pharmacy].sort());
  });
  it('a prefix that names no profile is reported, never guessed; one that names two stops the plan', async () => {
    expect((await resolveProfileIds(scanDb(raw()), ['00000000'])).notFound).toEqual(['00000000']);
    await coll('provider_profiles').insertOne({ id: '7210a983-2222-4222-8222-000000000099', type: 'doctor', name_ar: 'x' });
    await expect(resolveProfileIds(scanDb(raw()), ['7210a983'])).rejects.toThrow(/names 2 provider profiles/);
  });
  it('a prefix is never used as a pattern: letters outside hex and short tokens find nothing', async () => {
    expect((await resolveProfileIds(scanDb(raw()), ['.*', 'a', 'zzzzzzzz'])).ids).toEqual([]);
  });
  it('real products whose names only match the word test are not in scope: the catalogue is never touched', async () => {
    await coll('lab_services').insertOne({ id: 'hiv', name_en: 'HIV test', name_ar: 'فحص' });
    const { report } = await planTestDataRemoval(scanDb(raw()), ['7210a983', 'c142700b']);
    expect(Object.keys(report.deletes)).not.toEqual(expect.arrayContaining(['medicines']));
    expect(Object.keys(report.deletes)).not.toContain('lab_services');
  });
});
