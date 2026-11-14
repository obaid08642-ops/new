/** The duplicate step with the semantic keys, on an in-memory MongoDB: the owner's HbA1c pair, an abbreviation pair, a radiology pair, and what must NOT merge. */
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyChanges, type DbLike } from './catalogue-apply.core';
import { planCatalogueDuplicates } from './catalogue-duplicates';

jest.setTimeout(120_000);
let mongod: MongoMemoryServer;
const raw = () => mongoose.connection.db!;
const coll = (n: string) => raw().collection(n);
const db = () => raw() as unknown as DbLike;
const ok = { active: true, public_eligibility: true, medical_review_status: 'approved', is_deleted: false };
const T = (d: string) => new Date(`2026-${d}T00:00:00Z`);

beforeAll(async () => { mongod = await MongoMemoryServer.create(); await mongoose.connect(mongod.getUri(), { dbName: 'dup_semantic' }); });
afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

async function seed() {
  for (const c of await raw().listCollections().toArray()) await raw().collection(c.name).deleteMany({});
  await coll('lab_services').insertMany([
    { id: 'l-hba-1', short_code: 'HBA1C', name_ar: 'السكر التراكمي HbA1c', name_en: 'HbA1c', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-hba-2', short_code: 'A1C-X', name_ar: 'سكر تراكمي HbA1c', name_en: 'Glycated Hemoglobin', is_package: false, ...ok, createdAt: T('02-01') },
    { id: 'l-cbc-1', short_code: 'CBC', name_ar: 'صورة دم كاملة', name_en: 'CBC', is_package: false, ...ok, createdAt: T('01-01') },
    { id: 'l-cbc-2', short_code: 'CBC2', name_ar: 'تحليل صورة الدم', name_en: 'Complete Blood Count', is_package: false, ...ok, createdAt: T('03-01') },
    { id: 'l-psa', short_code: 'PSA', name_ar: 'مستضد البروستاتا (PSA)', name_en: 'Prostate Specific Antigen', is_package: false, ...ok },
    { id: 'l-fpsa', short_code: 'FPSA', name_ar: 'PSA الحر', name_en: 'Free PSA', is_package: false, ...ok },
  ]);
  await coll('radiology_services').insertMany([
    { id: 'r-chest-1', short_code: 'XR_CHEST', name_ar: 'أشعة الصدر', name_en: 'Chest X-Ray', modality: 'xray', body_part: 'chest', ...ok, createdAt: T('01-01') },
    { id: 'r-chest-2', short_code: 'CHEST_XRAY2', name_ar: 'اشعه صدر', name_en: 'X-Ray Chest', modality: 'xray', body_part: 'chest', ...ok, createdAt: T('04-01') },
    { id: 'r-us-ab', short_code: 'US_AB', name_ar: 'سونار بطن', name_en: 'Abdominal Ultrasound', modality: 'ultrasound', body_part: 'abdomen', ...ok },
    { id: 'r-us-fs', short_code: 'FIBRO', name_ar: 'فايبروسكان الكبد', name_en: 'Liver FibroScan', modality: 'ultrasound', body_part: 'abdomen', ...ok },   // same modality + body part, a different scan
  ]);
  await coll('nursing_services').insertMany([
    { id: 'n-1', code: 'IM', name_ar: 'حقنة عضلية', name_en: 'Intramuscular Injection', ...ok, createdAt: T('01-01') },
    { id: 'n-2', code: 'IM2', name_ar: 'الحقنة العضلية', name_en: 'IM Injection', ...ok, createdAt: T('05-01') },
  ]);
  await coll('provider_service_offers').insertMany([
    { provider_account_id: 'p1', vertical: 'lab', service_id: 'l-hba-2', offered: true, price: 80 },
    { provider_account_id: 'p2', vertical: 'radiology', service_id: 'r-chest-2', offered: true, price: 120 },
  ]);
  await coll('labbookings').insertOne({ id: 'b1', items: [{ service_id: 'l-hba-2', price: 80 }] });
}

describe('catalogue_duplicates, semantic', () => {
  beforeEach(seed);

  it('merges the HbA1c pair, the CBC pair, the chest X-ray pair and the nursing pair; keeps PSA / Free PSA and the two ultrasounds', async () => {
    const { changes, report } = await planCatalogueDuplicates(db());
    expect(report.lab.groups).toBe(2);
    expect(report.lab.hidden_rows).toBe(2);
    expect(report.radiology.hidden_rows).toBe(1);
    expect(report.nursing.hidden_rows).toBe(1);
    const hidden = (c: string) => changes.filter((x: any) => x.collection === c && x.path === 'is_deleted').length;
    expect(hidden('lab_services')).toBe(2);
    expect(changes.some((x: any) => x.collection === 'lab_services' && /l-psa|l-fpsa/.test(JSON.stringify(x)))).toBe(false);
    // the radiology rows that only share modality + body part are reported, not merged
    expect(report.radiology_same_scan_candidates).toEqual([['r-us-ab', 'r-us-fs']]);
    expect(hidden('radiology_services')).toBe(1);
  });

  it('applies: the later row is hidden into the first, offers and bookings follow, and a second plan is empty', async () => {
    const first = await planCatalogueDuplicates(db());
    await applyChanges(db(), first.changes);
    const hba2: any = await coll('lab_services').findOne({ id: 'l-hba-2' });
    expect(hba2).toMatchObject({ is_deleted: true, merged_into: 'l-hba-1' });
    expect(await coll('provider_service_offers').findOne({ provider_account_id: 'p1' })).toMatchObject({ service_id: 'l-hba-1' });
    expect(await coll('provider_service_offers').findOne({ provider_account_id: 'p2' })).toMatchObject({ service_id: 'r-chest-1' });
    expect((await coll('labbookings').findOne({ id: 'b1' }))!.items[0].service_id).toBe('l-hba-1');
    const second = await planCatalogueDuplicates(db());
    expect(second.changes).toEqual([]);
    expect(second.report.total_hidden).toBe(0);
  });
});
