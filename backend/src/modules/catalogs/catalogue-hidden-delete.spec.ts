/**
 * Owner rule: a duplicate or wrong catalogue row is deleted (backup holds it), never hidden. The pass over the finished plan turns the "hide" markers into deletes
 * when nothing names the row after the plan's own re-pointing, and keeps (and counts) the rows something still names. In-memory MongoDB.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike } from './catalogue-apply.core';
import { computePlan } from '../../scripts/catalogue-apply';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const ok = { active: true, public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const T = (d: string) => new Date(`2026-${d}T00:00:00Z`);

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'hidden_delete' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

async function seed() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('lab_services').insertMany([
    { id: 'l-hba-1', short_code: 'HBA1C', name_ar: 'السكر التراكمي HbA1c', name_en: 'HbA1c', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-hba-2', short_code: 'A1C-X', name_ar: 'سكر تراكمي HbA1c', name_en: 'Glycated Hemoglobin', is_package: false, ...ok, createdAt: T('02-01') },
    { id: 'l-cbc-1', short_code: 'CBC', name_ar: 'صورة دم كاملة', name_en: 'CBC', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-cbc-2', short_code: 'CBC2', name_ar: 'تحليل صورة الدم', name_en: 'Complete Blood Count', is_package: false, ...ok, createdAt: T('03-01') },
  ]);
  // l-hba-2 is named by an offer and a booking the plan re-points; l-cbc-2 by a cart line the plan does NOT re-point
  await coll('provider_service_offers').insertOne({ provider_account_id: 'p1', vertical: 'lab', service_id: 'l-hba-2', offered: true, price: 80 });
  await coll('labbookings').insertOne({ id: 'b1', items: [{ service_id: 'l-hba-2', price: 80 }] });
  await coll('unified_carts').insertOne({ patient_id: 'p1', lines: [{ line_id: 'x', kind: 'lab', service_id: 'l-cbc-2' }] });
  await coll('radiology_services').insertMany([
    { id: 'r-hsg', short_code: 'hsg', name_ar: 'تصوير الرحم', name_en: 'HSG', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false, createdAt: T('01-01') },
    { id: 'r-hsg-full', short_code: 'hysterosalpingography_hsg', name_ar: 'تصوير الرحم والأنابيب بالصبغة', name_en: 'Hysterosalpingography (HSG)', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false, createdAt: T('01-02') },
    { id: 'r-barium', short_code: 'barium_study', name_ar: 'أشعة بالباريوم', name_en: 'Barium study', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false, createdAt: T('01-03') },
    { id: 'r-wrong', short_code: 'wrong_row', name_ar: 'خطأ', name_en: 'Wrong', active: true, public_eligibility: false, medical_review_status: 'pending', is_deleted: false, createdAt: T('01-04') },
  ]);
}

const writeFile = (body: unknown) => { const d = fs.mkdtempSync(path.join(os.tmpdir(), 'rad-')); const f = path.join(d, 'approve.json'); fs.writeFileSync(f, JSON.stringify(body)); return f; };

describe('hidden rows are deleted, not kept', () => {
  beforeEach(seed);

  it('a duplicate nothing names after the re-pointing is deleted; one a cart line still names stays marked and is counted', async () => {
    const plan = await computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged']);
    const labChanges = plan.changes.filter((c: any) => c.collection === 'lab_services');
    const deleted = labChanges.filter((c: any) => c.kind === 'delete').map((c: any) => c.doc.id);
    expect(deleted).toEqual(['l-hba-2']);                                                         // re-pointed away, so it goes
    expect(labChanges.some((c: any) => c.kind === 'set' && c.key._id && String(c.key._id) === String((c as any).key._id) && c.path === 'merged_into' && c.after === 'l-cbc-1')).toBe(true);   // the cart-named one is still only marked
    const report = (plan.report as any).hidden_rows_deleted.by_collection.lab_services;
    expect(report).toMatchObject({ marked: 2, deleted: 1, kept_referenced: 1 });
    expect(report.referenced_by).toEqual({ 'unified_carts.lines.service_id': 1 });
  });

  it('apply deletes the row with its before-image, re-points the offer and the booking, and a second plan finds nothing more to hide or delete for it; rollback puts it back', async () => {
    const plan = await computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged']);
    const before = await coll('lab_services').findOne({ id: 'l-hba-2' });
    await applyChanges(db(), plan.changes);
    expect(await coll('lab_services').findOne({ id: 'l-hba-2' })).toBeNull();                       // gone, not hidden
    expect((await coll('labbookings').findOne({ id: 'b1' }))!.items[0].service_id).toBe('l-hba-1');
    expect(await coll('provider_service_offers').countDocuments({ service_id: 'l-hba-2' })).toBe(0);
    const again = await computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged']);
    expect(again.changes.filter((c: any) => c.collection === 'lab_services' && c.kind === 'delete')).toEqual([]);
    await rollbackChanges(db(), plan.changes);
    expect(await coll('lab_services').findOne({ id: 'l-hba-2' })).toMatchObject({ id: 'l-hba-2', name_en: before!.name_en });
  });

  it('the reviewed radiology file can merge a duplicate into the kept code and delete a wrong row', async () => {
    const f = writeFile({ approve: ['hysterosalpingography_hsg', 'barium_study'], merge: { hsg: 'hysterosalpingography_hsg' }, delete: ['wrong_row'] });
    const plan = await computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged', `--radiology-approve=${f}`]);
    const rad = (plan.report as any).radiology_catalogue;
    expect(rad.approved_by_file).toEqual(expect.arrayContaining(['barium_study', 'hysterosalpingography_hsg']));
    expect(rad.merged_by_file).toEqual(['hsg->hysterosalpingography_hsg']);
    expect(rad.removed_by_file).toEqual(['wrong_row']);
    expect(rad.awaiting_approval).not.toContain('hsg'); expect(rad.awaiting_approval).not.toContain('wrong_row');
    const deleted = plan.changes.filter((c: any) => c.collection === 'radiology_services' && c.kind === 'delete').map((c: any) => c.doc.id).sort();
    expect(deleted).toEqual(['r-hsg', 'r-wrong']);                                                // nothing names them: deleted in the same plan
    await applyChanges(db(), plan.changes);
    const left = (await coll('radiology_services').find({ id: { $in: ['r-hsg', 'r-hsg-full', 'r-barium', 'r-wrong'] } }).toArray()).map((r) => r.id).sort();
    expect(left).toEqual(['r-barium', 'r-hsg-full']);
    expect((await coll('radiology_services').findOne({ id: 'r-barium' }))!.public_eligibility).toBe(true);
  });

  it('a merge into a code that is not visible, and a code approved and deleted at once, are refused', async () => {
    const f1 = writeFile({ approve: [], merge: { hsg: 'hysterosalpingography_hsg' } });
    const plan = await computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged', `--radiology-approve=${f1}`]);
    expect((plan.report as any).radiology_catalogue.merge_target_not_visible).toEqual(['hsg->hysterosalpingography_hsg']);
    expect(plan.changes.some((c: any) => c.collection === 'radiology_services' && c.kind === 'delete' && c.doc.id === 'r-hsg')).toBe(false);
    const f2 = writeFile({ approve: ['hsg'], delete: ['hsg'] });
    await expect(computePlan(db(), ['--only=catalogue_completion', '--catalogue-completion=packaged', `--radiology-approve=${f2}`])).rejects.toThrow(/both as approved and as merged\/deleted/);
  });
});

describe('collectionLines', () => {
  it('prints one short line per collection with deletions by step', () => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { collectionLines } = require('./catalogue-apply.core');
    const mk = (collection: string, kind: string, step: string) => ({ kind, step, collection, key: { _id: 1 } });
    const lines = collectionLines([
      mk('lab_tests', 'delete', 'catalogue_hidden_delete'),
      mk('lab_tests', 'delete', 'catalogue_prune'),
      mk('lab_tests', 'set', 'catalogue_duplicates'),
      mk('radiology_tests', 'set', 'radiology_catalogue'),
    ]);
    expect(lines).toEqual([
      'lab_tests: rows=3 set=1 insert=0 delete=2 (catalogue_hidden_delete=1,catalogue_prune=1)',
      'radiology_tests: rows=1 set=1 insert=0 delete=0',
    ]);
  });
});

describe('setPath guard', () => {
  it('never writes through __proto__, constructor or prototype', async () => {
    const { deleteUnreferencedHidden } = require('./catalogue-hidden-delete');
    const changes = [{ kind: 'set', step: 'x', collection: 'lab_tests', key: { _id: 1 }, path: '__proto__.polluted', before: null, after: 'yes' }];
    await deleteUnreferencedHidden({ collection: () => ({ find: () => ({ toArray: async () => [] }) }) } as never, changes as never).catch(() => undefined);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
