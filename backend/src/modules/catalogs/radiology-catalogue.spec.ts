/**
 * Radiology catalogue step (owner, 2026-10-28): the 49 production rows against the 23 the patient list shows, on an in-memory MongoDB.
 * The fixture has production's shape: 23 visible scans under the new codes, 14 pending legacy duplicates under the old codes, 7 scans that exist only as
 * a pending row, and 5 extra rows of four of those codes with no flags at all.
 */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, rollbackChanges, type DbLike } from './catalogue-apply.core';
import { LEGACY_RADIOLOGY_CODES, planRadiologyCatalogue } from './catalogue-apply.steps';

jest.setTimeout(120_000);

let mongod: MongoMemoryServer;
let db: DbLike;
const raw = () => mongoose.connection.db!;
const rows = () => raw().collection('radiology_services');
const VISIBLE = ['XR_CHEST', 'XR_ABDOMEN', 'XR_KNEE', 'XR_SPINE', 'XR_PELVIS', 'XR_SINUS', 'CT_BRAIN', 'CT_CHEST', 'CT_ABDOMEN', 'CT_SINUS', 'CT_SPINE', 'MRI_BRAIN', 'MRI_KNEE', 'MRI_LSPINE', 'MRI_SHOULDER',
  'US_ABDOMEN', 'US_BREAST', 'US_DOPPLER_CAROTID', 'US_DOPPLER_LEG', 'US_KIDNEY', 'US_PELVIS_TV', 'US_PREG', 'US_THYROID'];
const NEW_ONLY = ['ECHO', 'MAMMO', 'DEXA', 'HSG', 'PANOREX', 'BARIUM', 'PETCT'];
const pendingRow = (code: string, createdAt: string) => ({ short_code: code, code, active: true, is_deleted: false, public_eligibility: false, medical_review_status: 'pending', createdAt: new Date(createdAt) });

async function seedProduction() {
  await rows().deleteMany({});
  await rows().insertMany([
    ...VISIBLE.map((c) => ({ short_code: c, active: true, public_eligibility: true, medical_review_status: 'approved' })),
    ...Object.keys(LEGACY_RADIOLOGY_CODES).map((c) => pendingRow(c, '2026-10-15T17:25:37Z')),
    ...NEW_ONLY.map((c) => pendingRow(c, '2026-10-15T17:25:37Z')),
    // a second and third insert of four of those codes, with no flags at all
    ...['PETCT', 'BARIUM', 'HSG', 'HSG', 'PANOREX'].map((c) => ({ short_code: c, code: c, active: true, createdAt: new Date('2026-10-20T10:00:00Z') })),
  ]);
}
const shown = async () => (await rows().find({ is_deleted: { $ne: true }, active: true, public_eligibility: true, medical_review_status: 'approved' }).toArray()).map((r) => r.short_code).sort();

beforeAll(async () => {
  mongod = await MongoMemoryServer.create();
  await mongoose.connect(mongod.getUri(), { dbName: 'radiology_catalogue_test' });
  db = raw() as unknown as DbLike;
});
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });
beforeEach(seedProduction);

describe('radiology catalogue step', () => {
  it('counts production as 49 rows, 23 visible, and says why the other 26 are hidden; nothing is approved without the reviewed file', async () => {
    const { changes, report } = await planRadiologyCatalogue(db);
    expect(report).toMatchObject({ rows: 49, visible: 23, legacy_duplicates_hidden: 14, extra_rows_hidden: 5, approved_by_file: [], file_codes_not_found: [] });
    expect(report.awaiting_approval).toEqual([...NEW_ONLY].sort());
    expect(changes.every((c) => c.kind === 'set' && ['is_deleted', 'merged_into'].includes(c.path))).toBe(true);   // only hiding, no approval
    expect(changes).toHaveLength((14 + 5) * 2);
    await applyChanges(db, changes);
    expect(await shown()).toEqual([...VISIBLE].sort());                  // still the same 23: approval is a medical decision
  });

  it('the reviewed file approves only the codes it lists, the oldest pending row of each, and the list then shows them', async () => {
    const { changes, report } = await planRadiologyCatalogue(db, ['MAMMO', 'DEXA', 'HSG', 'PETCT', 'NOPE']);
    expect(report.approved_by_file).toEqual(['DEXA', 'HSG', 'MAMMO', 'PETCT']);
    expect(report.awaiting_approval).toEqual(['BARIUM', 'ECHO', 'PANOREX']);
    expect(report.file_codes_not_found).toEqual(['NOPE']);
    const res = await applyChanges(db, changes);
    expect(res.skipped_changed_since_plan).toBe(0);
    expect(await shown()).toEqual([...VISIBLE, 'DEXA', 'HSG', 'MAMMO', 'PETCT'].sort());
    // one visible row per code: the flagless duplicates stay hidden
    expect(await rows().countDocuments({ short_code: 'HSG', is_deleted: { $ne: true } })).toBe(1);
    expect(await rows().countDocuments({ short_code: 'PETCT', is_deleted: { $ne: true } })).toBe(1);
    const legacy = await rows().findOne({ short_code: 'CXR' });
    expect(legacy).toMatchObject({ is_deleted: true, merged_into: 'XR_CHEST', public_eligibility: false });
  });

  it('a second plan after the apply has nothing left to do (idempotent)', async () => {
    const first = await planRadiologyCatalogue(db, NEW_ONLY);
    await applyChanges(db, first.changes);
    const second = await planRadiologyCatalogue(db, NEW_ONLY);
    expect(second.changes).toEqual([]);
    expect(await shown()).toEqual([...VISIBLE, ...NEW_ONLY].sort());
  });

  it('a row an admin touched since the dry run is skipped, not overwritten', async () => {
    const { changes } = await planRadiologyCatalogue(db, ['MAMMO']);
    await rows().updateOne({ short_code: 'MAMMO' }, { $set: { medical_review_status: 'rejected' } });
    const res = await applyChanges(db, changes);
    expect(res.skipped_changed_since_plan).toBeGreaterThan(0);
    expect(await shown()).not.toContain('MAMMO');
  });

  it('rollback restores the 49 rows exactly', async () => {
    const before = await rows().find({}).toArray();
    const { changes } = await planRadiologyCatalogue(db, NEW_ONLY);
    await applyChanges(db, changes);
    await rollbackChanges(db, changes);
    const after = await rows().find({}).toArray();
    expect(after).toEqual(before);
  });

  it('a legacy code whose canonical scan is not visible is left alone (nothing is hidden that has no replacement)', async () => {
    await rows().deleteMany({ short_code: 'XR_CHEST' });
    const { report } = await planRadiologyCatalogue(db);
    expect(report.legacy_duplicates_hidden).toBe(13);
    expect(report.awaiting_approval).not.toContain('CXR');
  });
});
