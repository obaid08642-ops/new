import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import fs from 'fs';
import { computePlan, PACKAGED_COMPLETION, PACKAGED_RADIOLOGY_APPROVE } from '../../scripts/catalogue-apply';
import { applyChanges } from './catalogue-apply.core';
import type { DbLike } from './catalogue-apply.core';

jest.setTimeout(180_000);
let mongod: MongoMemoryServer; let db: DbLike;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'radiology_packaged' }); db = mongoose.connection.db as unknown as DbLike; });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

const col = () => mongoose.connection.db!.collection('radiology_services');
const seed = JSON.parse(fs.readFileSync(PACKAGED_COMPLETION, 'utf8'));
const approveFile = JSON.parse(fs.readFileSync(PACKAGED_RADIOLOGY_APPROVE, 'utf8'));
const norm = (s: unknown) => String(s ?? '').toLowerCase().replace(/[^a-z0-9؀-ۿ]+/g, '');
const pending = (code: string, name_en: string, name_ar: string) => ({ id: `id-${code}`, code, short_code: code, name_en, name_ar, modality: 'xray', active: true, is_active: true, is_deleted: false, public_eligibility: false, medical_review_status: 'awaiting_approval', price: null });
const ARGS = ['plan', '--only=catalogue_completion', '--catalogue-completion=packaged', '--radiology-approve=packaged'];

describe('packaged radiology decisions and market completion (owner 2026-10-31)', () => {
  it('the packaged file approves the three scans, keeps ONE hysterosalpingography row and has no clash', () => {
    expect(approveFile.approve).toEqual(['barium_study', 'dental_panoramic', 'pet_ct_scan', 'hysterosalpingography_hsg']);
    expect(approveFile.merge).toEqual({ hsg: 'hysterosalpingography_hsg' });
    expect(approveFile.approve).not.toContain('hsg');
  });

  it('the new market rows are complete: Arabic and English names, preparation, an indicative range, no price, no duplicate code or name', () => {
    const rows: any[] = seed.radiology;
    expect(rows.length).toBeGreaterThanOrEqual(100);
    for (const r of rows) {
      expect([r.code, r.name_ar, r.name_en, r.description_ar, r.description_en].every((v) => typeof v === 'string' && v.trim())).toBe(true);
      expect(r.preparation_ar.length).toBeGreaterThan(0); expect(r.preparation_en.length).toBeGreaterThan(0);
      expect(/[؀-ۿ]/.test(r.name_ar)).toBe(true); expect(/[A-Za-z]/.test(r.name_en)).toBe(true);
    }
    const priced = rows.filter((r) => r.indicative_price_min !== undefined);
    expect(priced.length).toBeGreaterThanOrEqual(60);
    for (const r of priced) { expect(r.indicative_price_min).toBeGreaterThan(0); expect(r.indicative_price_max).toBeGreaterThanOrEqual(r.indicative_price_min); }
    expect(new Set(rows.map((r) => norm(r.code))).size).toBe(rows.length);
    expect(new Set(rows.map((r) => norm(r.name_en))).size).toBe(rows.length);
    expect(new Set(rows.map((r) => norm(r.name_ar))).size).toBe(rows.length);
  });

  it('on a catalogue with the five waiting rows: three approved, hsg merged away and removed, one HSG visible, nothing hidden, the market rows added, a second plan empty', async () => {
    await col().deleteMany({});
    await col().insertMany([
      pending('barium_study', 'Barium Study (legacy)', 'دراسة الباريوم القديمة'),
      pending('dental_panoramic', 'Dental Panoramic Film', 'صورة بانوراما الأسنان'),
      pending('pet_ct_scan', 'PET CT', 'تصوير مقطعي بالبوزيترون القديم'),
      pending('hsg', 'HSG', 'تصوير الرحم والأنابيب'),
      pending('hysterosalpingography_hsg', 'Hysterosalpingography HSG', 'تصوير الرحم بالصبغة'),
    ]);
    const p = await computePlan(db, ARGS);
    const rad = p.report.radiology_catalogue as { approved_by_file: string[]; merged_by_file: string[]; awaiting_approval: string[]; merge_target_not_visible: string[]; file_codes_not_found: string[] };
    expect(rad.approved_by_file.sort()).toEqual(['barium_study', 'dental_panoramic', 'hysterosalpingography_hsg', 'pet_ct_scan']);
    expect(rad.merged_by_file).toEqual(['hsg->hysterosalpingography_hsg']);
    expect(rad.awaiting_approval).toEqual([]);
    expect(rad.merge_target_not_visible).toEqual([]);

    const applied = await applyChanges(db, p.changes);
    expect(applied.skipped_changed_since_plan).toBe(0);

    const rows: any[] = await col().find({}).toArray();
    const live = rows.filter((r) => r.is_deleted !== true);
    const visible = (r: any) => r.active !== false && r.public_eligibility === true && r.medical_review_status === 'approved';
    expect(live.filter((r) => !visible(r)).map((r) => r.code)).toEqual([]);                 // nothing hidden is left alive
    expect(rows.some((r) => r.code === 'hsg')).toBe(false);                                // the duplicate is deleted, not hidden
    for (const code of ['barium_study', 'dental_panoramic', 'pet_ct_scan', 'hysterosalpingography_hsg']) expect(live.find((r) => r.code === code)).toBeTruthy();
    expect(live.filter((r) => /hysterosalping/i.test(String(r.name_en))).length).toBe(1); // ONE HSG: the seed's own HSG row is skipped because the kept row has its name
    const added = live.filter((r) => r.indicative_price_min !== undefined);
    expect(added.length).toBeGreaterThanOrEqual(60);
    expect(added.every((r) => r.price === null && visible(r))).toBe(true);

    const again = await computePlan(db, ARGS);
    expect(again.changes).toEqual([]);
  });
});
