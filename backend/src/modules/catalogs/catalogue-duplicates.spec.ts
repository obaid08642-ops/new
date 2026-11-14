/**
 * Duplicate services (QA 2026-10-29), on an in-memory MongoDB with production's shape: nursing rows twice with binary `code` bytes, labs HIV x3, a radiology legacy code,
 * and the references the merge must follow (provider offers, profile lists, capability rows, bookings, notify-me interests).
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, countsOf, type DbLike } from './catalogue-apply.core';
import { planCatalogueDuplicates } from './catalogue-duplicates';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const { Binary } = mongoose.mongo;
const ok = { active: true, public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const T = (d: string) => new Date(`2026-${d}T00:00:00Z`);

async function seed() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('nursing_services').insertMany([
    { id: 'n-im-good', code: 'IM_INJ', name_ar: 'حقنة عضلية', name_en: 'Intramuscular Injection', price: 50, category: 'injections', ...ok, createdAt: T('01-01') },
    { id: 'n-im-bin', code: new Binary(Buffer.from([0xff, 0xfe, 0x00, 0x01])), name_ar: 'حقنة عضلية', name_en: 'Intramuscular Injection', description_ar: 'وصف قديم', ...ok, medical_review_status: 'pending', createdAt: T('02-01') },
    { id: 'n-wound', code: 'WOUND', name_ar: 'تضميد جروح', name_en: 'Wound Dressing', ...ok, createdAt: T('01-02') },
    { id: 'n-solo', code: 'SOLO', name_ar: 'خدمة وحيدة', name_en: 'Single Service', ...ok, createdAt: T('01-03') },
  ]);
  await coll('lab_services').insertMany([
    { id: 'l-hiv-1', short_code: 'HIV', name_ar: 'فحص الإيدز', name_en: 'HIV', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-hiv-2', test_code: 'HIV-AB', name_ar: 'فحص الإيدز', name_en: 'HIV Ab/Ag', is_package: false, ...ok, medical_review_status: 'pending', createdAt: T('03-01') },
    { id: 'l-hiv-3', short_code: 'HIV', name_ar: 'فيروس نقص المناعة', name_en: 'HIV', is_package: false, ...ok, medical_review_status: 'pending', createdAt: T('04-01') },
    { id: 'l-cbc', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'CBC', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-cbc-pkg', short_code: 'CBC', name_ar: 'صورة دم', name_en: 'CBC', is_package: true, ...ok, createdAt: T('01-01') },     // a package is not the single test
  ]);
  await coll('radiology_services').insertMany([
    { id: 'r-xr-chest', short_code: 'XR_CHEST', name_ar: 'أشعة صدر', name_en: 'Chest X-ray', ...ok, createdAt: T('02-01') },
    { id: 'r-cxr', short_code: 'CXR', name_ar: 'أشعة الصدر القديمة', name_en: 'CXR legacy', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false, createdAt: T('01-01') },
  ]);
  // references
  await coll('provider_service_offers').insertMany([
    { provider_account_id: 'p1', vertical: 'nursing', service_id: 'n-im-bin', offered: true, price: 40 },
    { provider_account_id: 'p2', vertical: 'nursing', service_id: 'n-im-bin', offered: true, price: 45 },
    { provider_account_id: 'p2', vertical: 'nursing', service_id: 'n-im-good', offered: true, price: 55 },       // p2 already has the kept one: the loser's row is dropped
    { provider_account_id: 'p3', vertical: 'lab', service_id: 'l-hiv-3', offered: true, price: 90 },
    { provider_account_id: 'p4', vertical: 'radiology', service_id: 'r-cxr', offered: true, price: 70 },
  ]);
  await coll('provider_profiles').insertMany([
    { id: 'pp1', account_id: 'p1', type: 'home_care', nursing_services: [{ key: 'n-im-bin', price: 40 }, { key: 'n-wound', price: 60 }] },
    { id: 'pp2', account_id: 'p2', type: 'home_care', nursing_services: [{ key: 'n-im-good', price: 55 }, { key: 'n-im-bin', price: 45 }] },
    { id: 'pp3', account_id: 'p3', type: 'lab', test_categories: ['l-hiv-3', 'l-cbc'], test_prices: { 'l-hiv-3': '95' }, test_insurance_map: { 'l-hiv-3': true } },
    { id: 'pp4', account_id: 'p4', type: 'radiology', equipment_list: ['r-cxr', 'MRI'] },
  ]);
  await coll('provider_capabilities_lab').insertOne({ provider_account_id: 'p3', code: 'l-hiv-3', price: 95, available: true });
  await coll('labbookings').insertOne({ id: 'b1', items: [{ service_id: 'l-hiv-3', price: 95 }, { service_id: 'l-cbc', price: 40 }] });
  await coll('homecarebookings').insertOne({ id: 'b2', service_id: 'n-im-bin', service_ids: ['n-im-bin', 'n-wound'] });
  await coll('radiologybookings').insertOne({ id: 'b3', items: [{ service_id: 'r-cxr' }] });
  await coll('service_interests').insertMany([
    { id: 'i1', service_type: 'nursing', service_id: 'n-im-bin', user_id: 'u1' },
    { id: 'i2', service_type: 'nursing', service_id: 'n-im-bin', user_id: 'u2' }, { id: 'i3', service_type: 'nursing', service_id: 'n-im-good', user_id: 'u2' },
  ]);
}

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'catalogue_duplicates_test' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(seed);

describe('planCatalogueDuplicates', () => {
  it('groups the same service, keeps the approved coded oldest row, hides the others and fills what the kept row lacks', async () => {
    const { report } = await planCatalogueDuplicates(db());
    expect(report.nursing).toMatchObject({ groups: 1, hidden_rows: 1, sample: [{ keep: 'n-im-good', hidden: ['n-im-bin'] }] });
    expect(report.lab.groups).toBe(1);
    expect(report.lab.hidden_rows).toBe(2);
    expect(report.lab.sample[0].keep).toBe('l-hiv-1');                            // the approved, coded, oldest HIV row
    expect(report.lab.sample[0].hidden.sort()).toEqual(['l-hiv-2', 'l-hiv-3']);
    expect(report.radiology).toMatchObject({ hidden_rows: 1, sample: [{ keep: 'r-xr-chest', hidden: ['r-cxr'] }] });   // the legacy code is followed from the radiology step
    expect(report.total_hidden).toBe(4);
  });

  it('a package is not the single test, and a service with no twin is left alone', async () => {
    const { changes } = await planCatalogueDuplicates(db());
    const touched = new Set(changes.filter((c) => c.kind === 'set').map((c) => String((c.key as { _id: unknown })._id)));
    const untouched = (await coll('lab_services').find({ id: { $in: ['l-cbc', 'l-cbc-pkg'] } }).toArray()).concat(await coll('nursing_services').find({ id: { $in: ['n-solo', 'n-wound'] } }).toArray());
    expect(untouched).toHaveLength(4);
    for (const d of untouched) expect(touched.has(String(d._id))).toBe(false);
  });

  it('applies: hidden rows carry merged_into, and every reference follows to the kept row', async () => {
    const { changes } = await planCatalogueDuplicates(db());
    const res = await applyChanges(db(), changes);
    expect(res.skipped_changed_since_plan).toBe(0);
    expect((await coll('nursing_services').findOne({ id: 'n-im-bin' }))).toMatchObject({ is_deleted: true, merged_into: 'n-im-good' });
    expect((await coll('nursing_services').findOne({ id: 'n-im-good' }))!.description_ar).toBe('وصف قديم');          // content of the hidden row is not lost
    const offers = await coll('provider_service_offers').find({}).project({ _id: 0 }).toArray();
    expect(offers.filter((o) => o.vertical === 'nursing').map((o) => `${o.provider_account_id}:${o.service_id}`).sort()).toEqual(['p1:n-im-good', 'p2:n-im-good']);   // p2's loser row dropped, p1's moved
    expect(offers.find((o) => o.provider_account_id === 'p2' && o.service_id === 'n-im-good')!.price).toBe(55);
    expect(offers.find((o) => o.provider_account_id === 'p3')!.service_id).toBe('l-hiv-1');
    expect(offers.find((o) => o.provider_account_id === 'p4')!.service_id).toBe('r-xr-chest');
    expect((await coll('provider_profiles').findOne({ id: 'pp1' }))!.nursing_services).toEqual([{ key: 'n-im-good', price: 40 }, { key: 'n-wound', price: 60 }]);
    expect((await coll('provider_profiles').findOne({ id: 'pp2' }))!.nursing_services).toEqual([{ key: 'n-im-good', price: 55 }]);          // the kept entry wins
    const lab = (await coll('provider_profiles').findOne({ id: 'pp3' }))!;
    expect(lab.test_categories).toEqual(['l-hiv-1', 'l-cbc']);
    expect(lab.test_prices).toMatchObject({ 'l-hiv-1': '95' });
    expect(lab.test_insurance_map).toMatchObject({ 'l-hiv-1': true });
    expect((await coll('provider_profiles').findOne({ id: 'pp4' }))!.equipment_list).toEqual(['r-xr-chest', 'MRI']);
    expect((await coll('provider_capabilities_lab').findOne({}))!.code).toBe('l-hiv-1');
    expect((await coll('labbookings').findOne({ id: 'b1' }))!.items).toEqual([{ service_id: 'l-hiv-1', price: 95 }, { service_id: 'l-cbc', price: 40 }]);   // the price on the line is kept
    expect(await coll('homecarebookings').findOne({ id: 'b2' })).toMatchObject({ service_id: 'n-im-good', service_ids: ['n-im-good', 'n-wound'] });
    expect((await coll('radiologybookings').findOne({ id: 'b3' }))!.items).toEqual([{ service_id: 'r-xr-chest' }]);
    expect((await coll('service_interests').find({ service_type: 'nursing' }).project({ _id: 0, id: 1, service_id: 1 }).toArray()).sort((a, b) => a.id.localeCompare(b.id))).toEqual([{ id: 'i1', service_id: 'n-im-good' }, { id: 'i3', service_id: 'n-im-good' }]);   // u2 already asked for the kept one
  });

  it('a second plan after the apply is empty (idempotent)', async () => {
    await applyChanges(db(), (await planCatalogueDuplicates(db())).changes);
    expect((await planCatalogueDuplicates(db())).changes).toEqual([]);
  });

  it('rollback puts every row and reference back exactly', async () => {
    const names = ['nursing_services', 'lab_services', 'radiology_services', 'provider_service_offers', 'provider_profiles', 'provider_capabilities_lab', 'labbookings', 'homecarebookings', 'radiologybookings', 'service_interests'];
    const snap = async () => JSON.stringify(await Promise.all(names.map((n) => coll(n).find({}).sort({ id: 1, _id: 1 }).toArray())));
    const before = await snap();
    const { changes } = await planCatalogueDuplicates(db());
    await applyChanges(db(), changes);
    expect(await snap()).not.toBe(before);
    await rollbackChanges(db(), changes);
    expect(await snap()).toBe(before);
  });

  it('a row that changed after the plan is not overwritten (compare-and-set)', async () => {
    const { changes } = await planCatalogueDuplicates(db());
    await coll('provider_service_offers').updateOne({ provider_account_id: 'p1', service_id: 'n-im-bin' }, { $set: { service_id: 'n-wound' } });
    const res = await applyChanges(db(), changes);
    expect(res.skipped_changed_since_plan).toBeGreaterThan(0);
    expect((await coll('provider_service_offers').findOne({ provider_account_id: 'p1' }))!.service_id).toBe('n-wound');
  });

  it('counts of the catalogue do not change: nothing is deleted from it', async () => {
    const before = await countsOf(db(), ['nursing_services', 'lab_services', 'radiology_services']);
    await applyChanges(db(), (await planCatalogueDuplicates(db())).changes);
    expect(await countsOf(db(), ['nursing_services', 'lab_services', 'radiology_services'])).toEqual(before);
  });
});
