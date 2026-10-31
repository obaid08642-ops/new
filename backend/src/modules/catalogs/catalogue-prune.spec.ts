/** catalogue_prune on an in-memory MongoDB: delete-only, a referenced row stays, a draft stays, the backup puts a deleted row back. */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike } from './catalogue-apply.core';
import { planCataloguePrune, pruneReason, isUnpublishedDraft } from './catalogue-prune';
import { computePlan } from '../../scripts/catalogue-apply';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const live = { active: true, public_eligibility: true, medical_review_status: 'approved', is_deleted: false };

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'prune' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

async function seed() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('lab_services').insertMany([
    { id: 'l-live', name_ar: 'حي', ...live },
    { id: 'l-dup-free', name_ar: 'مكرر', ...live, is_deleted: true, merged_into: 'l-live' },            // duplicate, unreferenced -> deleted
    { id: 'l-dup-ref', name_ar: 'مكرر مستخدم', ...live, is_deleted: true, merged_into: 'l-live' },       // duplicate with a booking -> kept
    { id: 'l-inactive', name_ar: 'غير فعال', ...live, active: false },                                    // inactive -> deleted
    { id: 'l-rejected', name_ar: 'مرفوض', ...live, public_eligibility: false, medical_review_status: 'rejected' },
    { id: 'l-hidden-ref', name_ar: 'مخفي', ...live, public_eligibility: false },                           // approved but hidden, in a cart -> kept
    { id: 'l-draft', name_ar: 'مسودة', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false },   // an admin draft -> never deleted
    { id: 'l-off-offer', name_ar: 'له عرض', ...live, active: false },                                      // inactive but a provider offers it -> kept
  ]);
  await coll('radiology_services').insertMany([
    { id: 'r-live', ...live },
    { id: 'r-deleted', ...live, is_deleted: true },
    { id: 'r-keeper-target', ...live, active: false },                                                    // inactive; the only row merged into it is deleted in the same plan -> deleted with it (one pass)
    { id: 'r-merged', ...live, is_deleted: true, merged_into: 'r-keeper-target' },
    { id: 'r-keeper-2', ...live, active: false },                                                         // inactive; the row merged into it is still booked -> kept
    { id: 'r-merged-ref', ...live, is_deleted: true, merged_into: 'r-keeper-2' },
  ]);
  await coll('nursing_services').insertMany([
    { id: 'n-live', ...live },
    { id: 'n-rejected', ...live, medical_review_status: 'rejected' },
    { id: 'n-profile', ...live, active: false },
  ]);
  await coll('radiologybookings').insertOne({ id: 'rb1', items: [{ service_id: 'r-merged-ref' }] });
  await coll('labbookings').insertOne({ id: 'b1', items: [{ service_id: 'l-dup-ref' }, { service_id: 'l-live' }] });
  await coll('unified_carts').insertOne({ patient_id: 'p1', lines: [{ line_id: 'x', kind: 'lab', service_id: 'l-hidden-ref' }] });
  await coll('provider_service_offers').insertOne({ provider_account_id: 'a', vertical: 'lab', service_id: 'l-off-offer' });
  await coll('provider_profiles').insertOne({ id: 'pp', nursing_services: [{ key: 'n-profile', price: 10 }] });
}

describe('catalogue_prune', () => {
  beforeEach(seed);

  it('deletes only what is hidden / duplicate / rejected / inactive AND referenced by nothing; counts the rest per place', async () => {
    const { changes, report } = await planCataloguePrune(db());
    const deleted = changes.map((c: any) => `${c.collection}:${c.doc.id}`).sort();
    expect(deleted).toEqual(['lab_services:l-dup-free', 'lab_services:l-inactive', 'lab_services:l-rejected', 'nursing_services:n-rejected', 'radiology_services:r-deleted', 'radiology_services:r-merged', 'radiology_services:r-keeper-target'].sort());
    expect(changes.every((c) => c.kind === 'delete' && c.step === 'catalogue_prune')).toBe(true);     // delete only: no set, no insert, no archive flag
    expect(report.lab).toMatchObject({ deleted_rows: 3, kept_referenced: 3, kept_unpublished_pending: 1 });
    expect(report.lab.referenced_by).toMatchObject({ 'labbookings.items.service_id': 1, 'unified_carts.lines.service_id': 1, 'provider_service_offers.service_id': 1 });
    expect(report.radiology).toMatchObject({ deleted_rows: 3, kept_referenced: 2 });
    expect(report.radiology.referenced_by).toMatchObject({ 'radiology_services.merged_into': 1, 'radiologybookings.items.service_id': 1 });
    expect(report.nursing).toMatchObject({ deleted_rows: 1, kept_referenced: 1 });
    expect(report.nursing.referenced_by).toMatchObject({ 'provider_profiles.nursing_services.key': 1 });
    expect(report.total_deleted).toBe(7);
    expect(deleted.some((d) => /l-live|r-live|n-live|l-draft/.test(d))).toBe(false);    // a live row and an unpublished draft are never touched
  });

  it('applies, keeps the before-image in the backup (rollback puts the rows back), and a second plan is empty', async () => {
    const { changes } = await planCataloguePrune(db());
    await applyChanges(db(), changes);
    expect(await coll('lab_services').countDocuments({})).toBe(5);
    expect(await coll('radiology_services').countDocuments({})).toBe(3);   // live + the kept keeper + its booked merged row
    expect(await coll('lab_services').findOne({ id: 'l-dup-free' })).toBeNull();
    expect((await planCataloguePrune(db())).changes).toEqual([]);
    await rollbackChanges(db(), changes);
    expect(await coll('lab_services').countDocuments({})).toBe(8);
    expect(await coll('lab_services').findOne({ id: 'l-dup-free' })).toMatchObject({ name_ar: 'مكرر', merged_into: 'l-live' });
  });

  it('is reachable as --only=catalogue_prune and prints its report', async () => {
    const p = await computePlan(db(), ['plan', '--only=catalogue_prune']);
    expect(Object.keys(p.report)).toEqual(['catalogue_prune', 'self_conflicts']);
    expect(p.changes).toHaveLength(7);
  });

  it('pruneReason / isUnpublishedDraft', () => {
    expect(pruneReason({ merged_into: 'x' })).toBe('duplicate');
    expect(pruneReason({ is_deleted: true })).toBe('deleted');
    expect(pruneReason({ is_active: false })).toBe('inactive');
    expect(pruneReason({ medical_review_status: 'rejected' })).toBe('rejected');
    expect(pruneReason({ public_eligibility: false, medical_review_status: 'approved' })).toBe('hidden');
    expect(pruneReason({ public_eligibility: true, medical_review_status: 'approved' })).toBeNull();
    expect(isUnpublishedDraft({ public_eligibility: false, medical_review_status: 'pending' })).toBe(true);
    expect(isUnpublishedDraft({ public_eligibility: true, medical_review_status: 'approved' })).toBe(false);
  });
});
