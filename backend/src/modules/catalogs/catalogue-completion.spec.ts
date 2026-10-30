/**
 * Catalogue completion (owner approved 2026-10-29), on an in-memory MongoDB: what is approved (only real, still-pending rows), what is added (and not twice), the review marks,
 * the nursing booking modes, a stable plan hash, a second plan that is empty after the apply, and a rollback that puts everything back.
 */
import * as fs from 'fs';
import * as path from 'path';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, countsOf, planSha, rollbackChanges, type Change, type DbLike } from './catalogue-apply.core';
import { modeOfExisting, planCatalogueCompletion, type CompletionSeed } from './catalogue-completion';
import { planRadiologyCatalogue } from './catalogue-apply.steps';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const PACKAGED = JSON.parse(fs.readFileSync(path.join(__dirname, 'seed-data/catalogue-completion.2026-10-29.json'), 'utf8')) as CompletionSeed;
const ok = { active: true, public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const pending = { active: true, public_eligibility: false, medical_review_status: 'pending' };

const small: CompletionSeed = {
  ...PACKAGED,
  radiology_approve: ['ECHO'],
  expected_pending: { radiology: 1, labs: 2, nursing: 1 },
  radiology: PACKAGED.radiology.slice(0, 2),
  labs: [PACKAGED.labs[0], { ...PACKAGED.labs[1], code: 'TSH', name_en: 'Totally different name', name_ar: 'اسم مختلف تماماً' }],
  nursing: PACKAGED.nursing.slice(0, 2),
};

async function plan(seed: CompletionSeed, duplicateChanges: Change[] = []) {
  const radiology = await planRadiologyCatalogue(db() as any, seed.radiology_approve);
  const approvedIds = radiology.changes.filter((c) => c.kind === 'set' && c.path === 'medical_review_status' && c.after === 'approved').map((c) => (c as any).key._id);
  const completion = await planCatalogueCompletion(db(), { seed, duplicateChanges, radiologyApprovedIds: approvedIds });
  return { changes: [...radiology.changes, ...completion.changes], report: completion.report };
}

async function seedDb() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('radiology_services').insertMany([
    { id: 'r-echo', short_code: 'ECHO', name_ar: 'إيكو القلب', name_en: 'Echocardiogram', ...pending, createdAt: new Date('2026-01-01') },
    { id: 'r-chest', short_code: 'XR_CHEST', name_ar: 'أشعة صدر', name_en: 'Chest X-ray', ...ok },
  ]);
  await coll('lab_services').insertMany([
    { id: 'l-real-1', short_code: 'ABC', name_ar: 'تحليل أ', name_en: 'Test A', is_package: false, ...pending },
    { id: 'l-real-2', short_code: 'DEF', name_ar: 'تحليل ب', name_en: 'Test B', is_package: false, active: true },          // flags missing: still pending
    { id: 'l-dup', short_code: 'ABC', name_ar: 'تحليل أ', name_en: 'Test A', is_package: false, ...pending },                                              // a duplicate loser of step 12
    { id: 'l-rejected', short_code: 'REJ', name_ar: 'مرفوض', name_en: 'Rejected', active: true, public_eligibility: false, medical_review_status: 'rejected' },
    { id: 'l-live', short_code: 'TSH', name_ar: 'هرمون الغدة', name_en: 'TSH', ...ok },
    { id: 'l-hidden', short_code: 'OLD', name_ar: 'قديم', name_en: 'Old', ...pending, is_deleted: true },
  ]);
  await coll('nursing_services').insertMany([
    { id: 'n-pend', code: 'NP', name_ar: 'خدمة معلقة', name_en: 'Pending Service', duration: 'hour', duration_value: 1, ...pending },
    { id: 'n-shift', code: 'SH', name_ar: 'رعاية ليلية', name_en: 'Night Shift Care', duration: 'shift', duration_value: 12, ...ok },
    { id: 'n-physio', code: 'PH', name_ar: 'علاج طبيعي', name_en: 'Physiotherapy Session', duration: 'hour', duration_value: 1, ...ok },
    { id: 'n-visit', code: 'VI', name_ar: 'زيارة', name_en: 'Some Visit', duration: 'hour', duration_value: 1, ...ok },
    { id: 'n-set', code: 'ST', name_ar: 'محدد', name_en: 'Already Set', duration: 'hour', duration_value: 1, ...ok, booking_mode: 'programme', booking_options: { sessions: [3] } },
  ]);
}

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'completion' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(seedDb);

describe('the packaged seed', () => {
  it('has the rows the lead listed, unique codes, ar+en names and preparation, valid modes', () => {
    expect([PACKAGED.radiology.length, PACKAGED.labs.length, PACKAGED.nursing.length]).toEqual([34, 60, 14]);
    const codes = [...PACKAGED.radiology, ...PACKAGED.labs, ...PACKAGED.nursing].map((r) => r.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const r of [...PACKAGED.radiology, ...PACKAGED.labs, ...PACKAGED.nursing]) {
      expect(r.name_ar && r.name_en && r.description_ar && r.description_en).toBeTruthy();
      expect(r.preparation_ar.length).toBeGreaterThan(0);
      expect(r.preparation_en.length).toBe(r.preparation_ar.length);
      expect(/[؀-ۿ]/.test(r.name_ar)).toBe(true);
    }
    for (const n of PACKAGED.nursing) expect(['visit', 'continuous', 'programme']).toContain(n.booking_mode);
    expect(PACKAGED.radiology_approve).toEqual(['ECHO', 'MAMMO', 'DEXA', 'HSG', 'PANOREX', 'BARIUM', 'PETCT']);
    expect(PACKAGED.reviewed_by).toBe('lead-market-review-2026-10-29');
    expect(Object.keys(PACKAGED.booking_options.continuous)).toEqual(['hours', 'shift', 'period']);
    expect(PACKAGED.booking_options.continuous.hours).toEqual([4, 8, 12, 24]);
  });
});

describe('planning', () => {
  it('approves only real pending rows, never a duplicate loser, a rejected row or a hidden one, and marks them for the clinical review', async () => {
    const dupLoser: Change = { kind: 'set', step: 'catalogue_duplicates', collection: 'lab_services', key: { _id: (await coll('lab_services').findOne({ id: 'l-dup' }))!._id }, path: 'is_deleted', before: false, after: true };
    const { changes, report } = await plan(small, [dupLoser]);
    const labsApproved = changes.filter((c) => c.kind === 'set' && c.collection === 'lab_services' && c.path === 'medical_review_status' && c.after === 'approved');
    const approvedLabIds = await Promise.all(labsApproved.map(async (c) => (await coll('lab_services').findOne({ _id: (c as any).key._id }))!.id));
    expect(approvedLabIds.sort()).toEqual(['l-real-1', 'l-real-2']);
    expect(report.labs.approved).toBe(2);
    expect(report.nursing.approved).toBe(1);
    expect(report.radiology.approved).toBe(1);
    expect(report.pending_counts_match_expected).toBe(true);
    // review marks on every approved row
    const marked = changes.filter((c) => c.kind === 'set' && c.path === 'reviewed_by' && c.after === 'lead-market-review-2026-10-29');
    expect(marked.length).toBe(1 + 2 + 1);
    expect(changes.filter((c) => c.kind === 'set' && c.path === 'needs_clinical_review' && c.after === true).length).toBe(4);
    // a rejected / hidden / lost row has no change at all
    for (const id of ['l-rejected', 'l-hidden', 'l-dup']) {
      const row = (await coll('lab_services').findOne({ id }))!;
      expect(changes.some((c) => c.kind === 'set' && c.collection === 'lab_services' && c.step === 'catalogue_completion' && (c as any).key._id.equals(row._id))).toBe(false);
    }
  });

  it('adds new rows once (skips a code or name already live), with ids derived from the code, is_deleted false and the review marks', async () => {
    const { changes, report } = await plan(small);
    const inserts = changes.filter((c) => c.kind === 'insert') as Array<Extract<Change, { kind: 'insert' }>>;
    expect(report.labs.skipped_existing).toEqual(['TSH']);
    expect(report.labs.added).toBe(1);
    expect(report.radiology.added).toBe(2);
    expect(report.nursing.added).toBe(2);
    for (const i of inserts) {
      expect(i.doc.is_deleted).toBe(false);
      expect(i.doc.public_eligibility).toBe(true);
      expect(i.doc.medical_review_status).toBe('approved');
      expect(i.doc.reviewed_by).toBe('lead-market-review-2026-10-29');
      expect(i.doc.needs_clinical_review).toBe(true);
      expect(i.doc.price).toBeNull();
      expect(typeof i.doc.code).toBe('string');
      expect(typeof i.doc.id).toBe('string');
    }
    const again = await plan(small);
    expect(planSha(again.changes, {})).toBe(planSha(changes, {}));
  });

  it('gives every live nursing row a booking mode with its options, only where it has none', () => {
    expect(modeOfExisting({ name_en: 'Physiotherapy Session', duration: 'hour', duration_value: 1 }, PACKAGED)).toBe('programme');
    expect(modeOfExisting({ name_en: 'Elderly Overnight Care', duration: 'shift', duration_value: 12 }, PACKAGED)).toBe('continuous');
    expect(modeOfExisting({ name_en: 'Anything', duration: 'shift', duration_value: 8 }, PACKAGED)).toBe('continuous');
    expect(modeOfExisting({ name_en: 'Anything', duration: 'hour', duration_value: 4 }, PACKAGED)).toBe('continuous');
    expect(modeOfExisting({ name_en: 'Anything', duration: 'hour', duration_value: 1 }, PACKAGED)).toBe('visit');
  });

  it('writes booking_mode and booking_options on existing nursing rows (not on one that has them) and counts the modes', async () => {
    const { changes, report } = await plan(small);
    const byId = async (path: string) => {
      const out: Record<string, unknown> = {};
      for (const c of changes.filter((x) => x.kind === 'set' && x.collection === 'nursing_services' && x.path === path)) out[(await coll('nursing_services').findOne({ _id: (c as any).key._id }))!.id] = (c as any).after;
      return out;
    };
    const modes = await byId('booking_mode');
    expect(modes).toEqual({ 'n-shift': 'continuous', 'n-physio': 'programme', 'n-visit': 'visit', 'n-pend': 'visit' });
    expect(Object.keys(await byId('booking_options')).sort()).toEqual(['n-pend', 'n-physio', 'n-shift', 'n-visit']);
    expect(report.nursing_booking_modes.continuous).toBeGreaterThanOrEqual(1);
  });
});

describe('apply, second plan, rollback', () => {
  it('applies, leaves nothing for a second plan, and a rollback restores the documents', async () => {
    const before = await countsOf(db(), ['lab_services', 'radiology_services', 'nursing_services']);
    const beforeLab = await coll('lab_services').find({}).toArray();
    const { changes } = await plan(PACKAGED);
    const res = await applyChanges(db(), changes);
    expect(res.skipped_changed_since_plan).toBe(0);
    const after = await countsOf(db(), ['lab_services', 'radiology_services', 'nursing_services']);
    expect(after.radiology_services).toBe(before.radiology_services + 34);
    expect(after.nursing_services).toBe(before.nursing_services + 14);
    expect(after.lab_services).toBe(before.lab_services + 60);
    const second = await plan(PACKAGED);
    expect(second.changes).toEqual([]);
    const visibleRadiology = await coll('radiology_services').countDocuments({ is_deleted: false, active: true, public_eligibility: true, medical_review_status: 'approved' });
    expect(visibleRadiology).toBeGreaterThanOrEqual(34 + 1);                             // the new scans and the approved ECHO
    await rollbackChanges(db(), changes);
    expect(await countsOf(db(), ['lab_services', 'radiology_services', 'nursing_services'])).toEqual(before);
    expect(await coll('lab_services').find({}).toArray()).toEqual(beforeLab);
  });
});
