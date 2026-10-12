import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { buildMedicineReport, medicineGapsByLocale, medicineReportMarkdown } from './medicine-publication-report';

jest.setTimeout(120_000);

const full = (id: string) => ({
  id, name_ar: 'دواء', name_en: 'Drug', category: 'pain', active_ingredient: 'x', form: 'tab', strength: '500mg',
  translations: Object.fromEntries(['ar', 'en', 'ur', 'hi', 'bn', 'tl'].map((l) => [l, {
    name: `n-${l}`, slug: `s-${l}-${id}`, main_category: 'c', active_ingredient: 'a', dosage_form: 'f', strength: 's',
  }])),
});

describe('medicine SEO report', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'medrep' }).asPromise();
    const ok = { public_eligibility: true, medical_review_status: 'approved' };
    const noUrdu = full('m-no-ur');
    delete (noUrdu.translations as any).ur;
    const noFilSlug = full('m-no-fil-slug');
    delete (noFilSlug.translations as any).tl.slug;
    const noHindiForm = full('m-no-hi-form');
    delete (noHindiForm.translations as any).hi.dosage_form;
    await conn.collection('medicines').insertMany([
      { ...full('m-complete'), ...ok, indexing_eligibility: true },
      { ...noUrdu, ...ok },
      { ...noFilSlug, ...ok, indexing_eligibility: true },
      { ...noHindiForm, ...ok },
      { ...full('m-pending'), public_eligibility: true, medical_review_status: 'pending' },
      { ...full('m-not-eligible'), public_eligibility: false, medical_review_status: 'approved' },
      { ...full('m-deleted'), ...ok, is_deleted: true },
    ]);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('counts approved-for-publication with the public page filter', async () => {
    const r = await buildMedicineReport(conn);
    expect(r.total).toBe(7);
    expect(r.deleted).toBe(1);
    expect(r.public_eligibility).toBe(5);
    expect(r.medical_review_approved).toBe(5);
    expect(r.approved_for_publication).toBe(4);
    expect(r.indexable).toBe(2);
    expect(r.by_review_status).toEqual({ approved: 5, pending: 1 });
  });

  it('counts translation gaps per locale among the approved, without filling them', async () => {
    const r = await buildMedicineReport(conn);
    expect(r.translations.complete_in_all_locales).toBe(1);
    expect(r.translations.missing_in_any_locale).toBe(3);
    const t = r.translations.per_locale;
    expect(t.ur).toMatchObject({ missing_any: 1, missing_name: 1, missing_slug: 1, sample_ids: ['m-no-ur'] });
    expect(t.fil).toMatchObject({ missing_any: 1, missing_name: 0, missing_slug: 1, sample_ids: ['m-no-fil-slug'] });
    expect(t.hi).toMatchObject({ missing_any: 1, missing_fields: { dosage_form: 1 } });
    expect(t.ar.missing_any).toBe(0);
    expect(t.en.missing_any).toBe(0);
    // nothing was written
    expect((await conn.collection('medicines').findOne({ id: 'm-no-ur' }))?.translations?.ur).toBeUndefined();
  });

  it('a medicine with only Arabic and English names misses the four other locales', () => {
    const gaps = medicineGapsByLocale({ name_ar: 'x', name_en: 'y' });
    expect(gaps.ur).toEqual(['name', 'slug']);
    expect(gaps.fil).toEqual(['name', 'slug']);
    expect(gaps.ar).toEqual(['slug']);
  });

  it('renders the numbers as markdown', async () => {
    const md = medicineReportMarkdown(await buildMedicineReport(conn));
    expect(md).toContain('**Approved for publication (both)** | **4**');
    expect(md).toContain('| ur | 1 | 1 | 1 |');
  });
});
