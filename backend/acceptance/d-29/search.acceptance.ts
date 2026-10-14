// ACCEPTANCE — D-29 search (owner decision 29). Written by the reviewer before the work; the implementing
// side makes it pass and may not edit it (nor live-server.ts next to it).
//
// The whole compiled backend runs (dist/main.js) on an in-memory MongoDB replica set and a local Redis.
// No Meilisearch runs here: MEILI_URL is unset, so the server answers from its MongoDB fallback, which
// must follow the same rules (the Meilisearch adapter has its own unit test with the HTTP API mocked).
//
// Contract
//   GET  /api/v1/search?q=&section=pharmacy|consultations|labs|nursing&locale=ar|en|ur|hi|bn|fil&limit=
//        with section → { query, section, engine, items: [{ id, type, section, name, ... }] }
//        without      → { query, engine, groups: [{ type, section, items: [...] }] }   (home: grouped by type)
//   GET  /api/v1/search/suggest?q=&locale=    → { suggestions: [{ id, type, name }] }   (autocomplete)
//   POST /api/v1/admin/search/reindex         → { indexed: number }                     (admin only)
// Required
//   1. Arabic normalisation: أ/إ/آ→ا, ى→ي, ة→ه, diacritics and tatweel are ignored on both sides.
//   2. Synonyms: brand ↔ active ingredient, Arabic ↔ English names.
//   3. Six locales: every item is found by its name in any stored locale, and `locale` picks the name shown.
//   4. Each section searches only its own content; home (no section) groups the results by type.
//   5. Only active, approved items and providers appear.
//   6. Prescription-only items are never promoted or boosted (popularity and sponsorship do not lift them).
//   7. MongoDB stays the source: a write made directly to MongoDB reaches the search within seconds
//      (added, changed and taken down), and an admin rebuild re-creates the index from MongoDB.
//   8. Typo tolerance and autocomplete.
import { LiveStack } from './live-server';

jest.setTimeout(600_000);

const now = () => new Date();
const APPROVED = { is_deleted: false, public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved' };
const SERVICE_OK = { active: true, is_deleted: false, public_eligibility: true, medical_review_status: 'approved' };

const MEDICINES = [
  { id: 'med-amox', name_ar: 'أموكسيسيلين ٥٠٠', name_en: 'Amoxicillin 500', active_ingredient: 'amoxicillin', requires_prescription: true, usage_count: 50,
    translations: { ur: { name: 'اموکسیسلن ۵۰۰' }, hi: { name: 'एमोक्सिसिलिन 500' }, bn: { name: 'অ্যামোক্সিসিলিন ৫০০' }, tl: { name: 'Amoksisilin 500' } }, ...APPROVED },
  { id: 'med-panadol', name_ar: 'بنادول اكسترا', name_en: 'Panadol Extra', active_ingredient: 'paracetamol', requires_prescription: false, usage_count: 10, ...APPROVED },
  { id: 'med-insulin', name_ar: 'إنسولين سريع', name_en: 'Rapid Insulin', active_ingredient: 'insulin aspart', requires_prescription: true, usage_count: 5, ...APPROVED },
  { id: 'med-vitamin', name_ar: 'فيتامين د للأطفال', name_en: 'Vitamin D Kids', active_ingredient: 'cholecalciferol', requires_prescription: false, usage_count: 1, ...APPROVED },
  { id: 'med-qatra', name_ar: 'قطرة عين مرطبة', name_en: 'Lubricant Eye Drops', active_ingredient: 'carmellose', requires_prescription: false, usage_count: 2, ...APPROVED },
  // Two items whose names match the same query equally; the prescription one is far more popular and
  // marked sponsored, and still must not be ranked above the other one.
  { id: 'med-derma-otc', name_ar: 'ديرماكول كريم', name_en: 'Dermacool Cream', active_ingredient: 'menthol', requires_prescription: false, usage_count: 0, ...APPROVED },
  { id: 'med-derma-rx', name_ar: 'ديرماكول أقراص', name_en: 'Dermacool Tablets', active_ingredient: 'prednisolone', requires_prescription: true, usage_count: 100000, sponsored: true, ...APPROVED },
  // Not approved / taken down: never in results.
  { id: 'med-draft', name_ar: 'أموكسيسيلين مسودة', name_en: 'Amoxicillin Draft', active_ingredient: 'amoxicillin', requires_prescription: true, is_deleted: false, public_eligibility: false, indexing_eligibility: false, medical_review_status: 'pending' },
  { id: 'med-deleted', name_ar: 'بنادول محذوف', name_en: 'Panadol Removed', active_ingredient: 'paracetamol', ...APPROVED, is_deleted: true },
];
const DOCTORS = [
  { id: 'doc-card', type: 'doctor', name_ar: 'د. سارة القلب', name_en: 'Dr. Sara Heart', specialty: 'cardiology', status: 'active', public_eligibility: true, medical_review_status: 'approved' },
  { id: 'doc-off', type: 'doctor', name_ar: 'د. سارة المعلقة', name_en: 'Dr. Sara Suspended', specialty: 'cardiology', status: 'suspended', public_eligibility: true, medical_review_status: 'approved' },
];
const SPECIALTIES = [
  { id: 'spec-cardiology', code: 'cardiology', name_ar: 'أمراض القلب', name_en: 'Cardiology', active: true, translations: { ur: { name: 'امراض قلب' } } },
  { id: 'spec-old', code: 'old', name_ar: 'تخصص موقوف', name_en: 'Retired Specialty', active: false },
];
const LABS = [
  { id: 'lab-cbc', name_ar: 'صورة دم كاملة', name_en: 'Complete Blood Count', short_code: 'CBC', price: 80, ...SERVICE_OK },
  { id: 'lab-pkg', name_ar: 'باقة فحص شامل', name_en: 'Full Checkup Package', is_package: true, price: 400, ...SERVICE_OK },
  { id: 'lab-off', name_ar: 'تحليل موقوف', name_en: 'Disabled Test', price: 10, ...SERVICE_OK, active: false },
];
const RADIOLOGY = [{ id: 'rad-chest', name_ar: 'أشعة صدر', name_en: 'Chest X-Ray', body_part: 'chest', price: 150, ...SERVICE_OK }];
const NURSING = [{ id: 'nur-inj', name_ar: 'حقنة في المنزل', name_en: 'Injection at Home', price: 120, ...SERVICE_OK }];

const ids = (r: any) => (r.body?.items || []).map((i: any) => i.id);
const allIds = (r: any) => (r.body?.groups || []).flatMap((g: any) => g.items.map((i: any) => i.id));

describe('D-29: search', () => {
  const stack = new LiveStack();
  let admin = '';
  let patient = '';
  const search = (qs: string) => stack.call(0, 'GET', `/api/v1/search?${qs}`);
  const waitFor = async (check: () => Promise<boolean>, ms = 15_000) => {
    const until = Date.now() + ms;
    while (Date.now() < until) { if (await check()) return true; await new Promise((r) => setTimeout(r, 500)); }
    return false;
  };

  beforeAll(async () => {
    LiveStack.build();
    await stack.start(1, async (db) => {
      const put = async (coll: string, docs: any[]) => { for (const d of docs) await db.collection(coll).insertOne({ createdAt: now(), updatedAt: now(), ...d }); };
      await put('medicines', MEDICINES);
      await put('provider_profiles', DOCTORS);
      await put('specialties', SPECIALTIES);
      await put('lab_services', LABS);
      await put('radiology_services', RADIOLOGY);
      await put('nursing_services', NURSING);
    });
    admin = await stack.admin();
    patient = await stack.patient();
    // The index is built from MongoDB at boot; wait until it answers.
    await waitFor(async () => ids(await search('q=amoxicillin&section=pharmacy')).includes('med-amox'), 60_000);
  });
  afterAll(async () => { await stack.stop(); });

  it('Arabic normalisation: hamza forms, alef maqsura, teh marbuta, diacritics and tatweel are ignored', async () => {
    for (const q of ['اموكسيسيلين', 'إموكسيسيلين', 'أَمُوكْسِيسِيلِين', 'أمـــوكسيسيلين']) {
      expect([q, ids(await search(`q=${encodeURIComponent(q)}&section=pharmacy`))]).toEqual([q, expect.arrayContaining(['med-amox'])]);
    }
    expect(ids(await search(`q=${encodeURIComponent('انسولين')}&section=pharmacy`))).toContain('med-insulin');
    expect(ids(await search(`q=${encodeURIComponent('قطره')}&section=pharmacy`))).toContain('med-qatra');
    expect(ids(await search(`q=${encodeURIComponent('فيتامين د للاطفال')}&section=pharmacy`))).toContain('med-vitamin');
  });

  it('synonyms: brand ↔ active ingredient and Arabic ↔ English', async () => {
    expect(ids(await search('q=paracetamol&section=pharmacy'))).toContain('med-panadol');
    expect(ids(await search(`q=${encodeURIComponent('باراسيتامول')}&section=pharmacy`))).toContain('med-panadol');
    expect(ids(await search('q=panadol&section=pharmacy'))).toContain('med-panadol');
    expect(ids(await search(`q=${encodeURIComponent('بنادول')}&section=pharmacy`))).toContain('med-panadol');
  });

  it('six locales: found by the name stored in every locale, and `locale` picks the name shown', async () => {
    const names: Record<string, string> = { ur: 'اموکسیسلن', hi: 'एमोक्सिसिलिन', bn: 'অ্যামোক্সিসিলিন', fil: 'Amoksisilin', en: 'Amoxicillin', ar: 'أموكسيسيلين' };
    for (const [locale, q] of Object.entries(names)) {
      const r = await search(`q=${encodeURIComponent(q)}&section=pharmacy&locale=${locale}`);
      const hit = (r.body?.items || []).find((i: any) => i.id === 'med-amox');
      expect([locale, hit?.name]).toEqual([locale, expect.stringContaining(q)]);
    }
  });

  it('each section searches only its own content', async () => {
    const pharmacy = await search('q=sara&section=pharmacy');
    expect(ids(pharmacy)).toEqual([]);
    const consult = await search('q=cardiology&section=consultations');
    expect(ids(consult)).toEqual(expect.arrayContaining(['doc-card', 'spec-cardiology']));
    expect((consult.body.items as any[]).every((i) => ['doctor', 'specialty'].includes(i.type))).toBe(true);
    const labs = await search('q=chest&section=labs');
    expect(ids(labs)).toContain('rad-chest');
    expect(ids(await search(`q=${encodeURIComponent('باقة فحص')}&section=labs`))).toContain('lab-pkg');
    expect(ids(await search('q=cbc&section=labs'))).toContain('lab-cbc');
    // The backend seeds its nursing catalogue at boot, so other nursing services may match too.
    const nursing = await search('q=injection&section=nursing');
    expect(ids(nursing)).toContain('nur-inj');
    expect((nursing.body.items as any[]).every((i) => i.type === 'nursing')).toBe(true);
    expect(ids(await search('q=injection&section=labs'))).not.toContain('nur-inj');
  });

  it('home search groups the results by type', async () => {
    const r = await search(`q=${encodeURIComponent('سارة')}`);
    expect(r.status).toBe(200);
    expect(r.body.groups.map((g: any) => g.type)).toContain('doctor');
    const mixed = await search('q=a');
    expect(mixed.status).toBe(200);
    const types = new Set<string>((mixed.body.groups || []).map((g: any) => g.type));
    for (const g of mixed.body.groups || []) expect(g.items.every((i: any) => i.type === g.type)).toBe(true);
    expect(types.size).toBeGreaterThan(1);
  });

  it('only active, approved items and providers appear', async () => {
    const hidden = ['med-draft', 'med-deleted', 'doc-off', 'spec-old', 'lab-off'];
    for (const q of ['amoxicillin', 'panadol', 'sara', 'retired', 'disabled', 'draft', 'removed', 'suspended']) {
      const found = allIds(await search(`q=${q}`));
      expect([q, found.filter((id: string) => hidden.includes(id))]).toEqual([q, []]);
    }
  });

  it('prescription-only items are never promoted or boosted', async () => {
    const r = await search('q=dermacool&section=pharmacy');
    const order = ids(r);
    expect(order).toEqual(expect.arrayContaining(['med-derma-otc', 'med-derma-rx']));
    expect(order.indexOf('med-derma-rx')).toBeGreaterThan(order.indexOf('med-derma-otc'));
    for (const i of r.body.items) expect([i.id, i.sponsored ?? false]).toEqual([i.id, false]);
  });

  it('typo tolerance and autocomplete', async () => {
    expect(ids(await search('q=amoxicilin&section=pharmacy'))).toContain('med-amox');
    const s = await stack.call(0, 'GET', '/api/v1/search/suggest?q=amox&locale=en');
    expect(s.status).toBe(200);
    expect((s.body.suggestions || []).map((x: any) => x.id)).toContain('med-amox');
  });

  it('a write made directly to MongoDB reaches the search: added, changed, taken down', async () => {
    await stack.db.collection('medicines').insertOne({
      id: 'med-new', name_ar: 'زنجبيل طبيعي', name_en: 'Natural Ginger', active_ingredient: 'ginger', requires_prescription: false,
      createdAt: now(), updatedAt: now(), ...APPROVED,
    });
    expect(await waitFor(async () => ids(await search('q=ginger&section=pharmacy')).includes('med-new'))).toBe(true);
    await stack.db.collection('medicines').updateOne({ id: 'med-new' }, { $set: { name_en: 'Natural Turmeric', updatedAt: now() } });
    expect(await waitFor(async () => ids(await search('q=turmeric&section=pharmacy')).includes('med-new'))).toBe(true);
    await stack.db.collection('medicines').updateOne({ id: 'med-new' }, { $set: { medical_review_status: 'pending', public_eligibility: false, updatedAt: now() } });
    expect(await waitFor(async () => !ids(await search('q=turmeric&section=pharmacy')).includes('med-new'))).toBe(true);
    await stack.db.collection('nursing_services').deleteOne({ id: 'nur-inj' });
    expect(await waitFor(async () => !ids(await search('q=injection&section=nursing')).includes('nur-inj'))).toBe(true);
  });

  it('an admin rebuilds the index from MongoDB; others may not', async () => {
    expect((await stack.call(0, 'POST', '/api/v1/admin/search/reindex', patient, {})).status).toBe(403);
    await stack.db.collection('search_index').deleteMany({});
    const r = await stack.call(0, 'POST', '/api/v1/admin/search/reindex', admin, {});
    expect([r.status, typeof r.body?.indexed]).toEqual([expect.any(Number), 'number']);
    expect(r.status).toBeLessThan(300);
    expect(r.body.indexed).toBeGreaterThanOrEqual(10);
    expect(ids(await search('q=cbc&section=labs'))).toContain('lab-cbc');
  });

  it('bad input is refused or answered empty, never a server error', async () => {
    expect((await search('q=x&section=nope')).status).toBe(400);
    expect((await search('q=x&locale=zz')).status).toBe(400);
    const odd = await search(`q=${encodeURIComponent('[(*+?\\')}&section=pharmacy`);
    expect(odd.status).toBe(200);
    expect((await search('q=')).status).toBe(200);
  });
});
