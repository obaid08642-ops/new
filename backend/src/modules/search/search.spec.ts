import { MeiliClient, MEILI_INDEX, meiliSettings, meiliSynonyms } from './meili.client';
import { isVisible, sourceFilter, textScore, toSearchDocument, tolerantPattern } from './search-documents';

const APPROVED = { public_eligibility: true, indexing_eligibility: true, medical_review_status: 'approved' };

describe('D-29 search documents', () => {
  it('one document per item, with every stored locale and synonym variants', () => {
    const doc = toSearchDocument('medicines', {
      _id: 'x1', id: 'med-1', name_ar: 'بنادول', name_en: 'Panadol', active_ingredient: 'paracetamol',
      translations: { ur: { name: 'پیناڈول' }, tl: { name: 'Panadol PH' } }, ...APPROVED,
    })!;
    expect(doc.names).toEqual({ ar: 'بنادول', en: 'Panadol', ur: 'پیناڈول', fil: 'Panadol PH' });
    expect(doc.section).toBe('pharmacy');
    expect(doc.text).toContain('باراسيتامول');
    expect(doc.src).toBe('medicines:x1');
  });

  it('prescription-only items never carry a popularity boost', () => {
    const rx = toSearchDocument('medicines', { id: 'a', name_en: 'A', requires_prescription: true, usage_count: 1e6, sponsored: true, ...APPROVED })!;
    const otc = toSearchDocument('medicines', { id: 'b', name_en: 'B', usage_count: 99, ...APPROVED })!;
    expect(rx.boost).toBe(0);
    expect(otc.boost).toBeGreaterThan(0);
  });

  it('rx-rules: a medicine document carries requires_prescription and online_exclusive for the result row', () => {
    const online = toSearchDocument('medicines', { id: 'o', name_en: 'O', online_exclusive: true, ...APPROVED })!;
    const rx = toSearchDocument('medicines', { id: 'r', name_en: 'R', requires_prescription: true, ...APPROVED })!;
    expect([online.requires_prescription, online.online_exclusive]).toEqual([false, true]);
    expect([rx.requires_prescription, rx.online_exclusive]).toEqual([true, false]);
  });

  it('only active, approved records are searchable', () => {
    expect(toSearchDocument('medicines', { id: 'a', name_en: 'A', ...APPROVED, medical_review_status: 'pending' })).toBeNull();
    expect(toSearchDocument('medicines', { id: 'a', name_en: 'A', ...APPROVED, is_deleted: true })).toBeNull();
    expect(isVisible('provider_profiles', { type: 'doctor', status: 'suspended', ...APPROVED })).toBe(false);
    expect(isVisible('lab_services', { active: true, category: 'imaging', ...APPROVED })).toBe(false);
    expect(isVisible('specialties', { active: false })).toBe(false);
    expect(sourceFilter('lab_services')).toMatchObject({ active: true, medical_review_status: 'approved' });
  });

  it('439: a medicine approved for publication is found on the site even when it is not indexed by search engines', () => {
    const published = { id: 'm', name_en: 'M', public_eligibility: true, medical_review_status: 'approved', indexing_eligibility: false };
    expect(isVisible('medicines', published)).toBe(true);
    expect(toSearchDocument('medicines', published)).not.toBeNull();
    expect(sourceFilter('medicines')).not.toHaveProperty('indexing_eligibility');
  });

  it('a name match ranks above an ingredient match; typos match within a word', () => {
    const name = { name_text: 'panadol', text: 'panadol | paracetamol' };
    const ingredient = { name_text: 'adol', text: 'adol | panadol extra' };
    expect(textScore(name, ['panadol'])).toBeGreaterThan(textScore(ingredient, ['panadol']));
    expect(new RegExp(tolerantPattern('amoxicilin')).test('amoxicillin 500')).toBe(true);
    expect(new RegExp(tolerantPattern('amoxicilin')).test('amox | icilin')).toBe(false);
  });
});

describe('D-29 Meilisearch adapter', () => {
  const calls: Array<{ url: string; method: string; body: any; auth?: string }> = [];
  const fake = async (url: string, init: any) => {
    calls.push({ url, method: init.method, body: init.body ? JSON.parse(init.body) : undefined, auth: init.headers.authorization });
    if (url.endsWith('/indexes') && init.method === 'POST') return { ok: false, status: 409, json: async () => ({}), text: async () => 'index_already_exists' };
    if (url.endsWith('/multi-search')) {
      return { ok: true, status: 200, text: async () => '', json: async () => ({ results: [{ hits: [{ id: 'med-1', type: 'medicine' }] }, { hits: [] }] }) };
    }
    return { ok: true, status: 202, json: async () => ({ taskUid: 1 }), text: async () => '' };
  };
  const client = new MeiliClient('http://meili:7700', 'master', fake as any);

  beforeEach(() => { calls.length = 0; });

  it('creates the index once and applies relevance-only ranking, filters and synonyms', async () => {
    await client.ensureIndex();
    const settings = calls.find((c) => c.method === 'PATCH')!;
    expect(settings.url).toBe(`http://meili:7700/indexes/${MEILI_INDEX}/settings`);
    expect(settings.auth).toBe('Bearer master');
    expect(settings.body.filterableAttributes).toEqual(['type', 'section']);
    expect(settings.body.rankingRules).toEqual(['words', 'typo', 'proximity', 'attribute', 'exactness']);
    expect(settings.body.typoTolerance.enabled).toBe(true);
    expect(settings.body.searchableAttributes).toEqual(expect.arrayContaining(['names.ar', 'names.en', 'names.ur', 'names.hi', 'names.bn', 'names.fil']));
    expect(meiliSynonyms().panadol).toEqual(expect.arrayContaining(['paracetamol', 'باراسيتامول']));
    expect(JSON.stringify(meiliSettings())).not.toMatch(/boost|usage|sponsor/);
  });

  it('pushes and removes documents and searches one type per query', async () => {
    await client.upsert([{ key: 'medicine-1' } as any]);
    await client.remove(['medicine-1']);
    const r = await client.search('panadol', ['medicine', 'doctor'], 5, ['names.en']);
    expect(calls.map((c) => `${c.method} ${c.url.replace('http://meili:7700', '')}`)).toEqual([
      `POST /indexes/${MEILI_INDEX}/documents`, `POST /indexes/${MEILI_INDEX}/documents/delete-batch`, 'POST /multi-search',
    ]);
    expect(calls[2].body.queries.map((q: any) => q.filter)).toEqual(['type = "medicine"', 'type = "doctor"']);
    expect(r.medicine[0].id).toBe('med-1');
    expect(r.doctor).toEqual([]);
  });

  it('is off without MEILI_URL', () => {
    const prev = process.env.MEILI_URL;
    delete process.env.MEILI_URL;
    expect(MeiliClient.fromEnv()).toBeNull();
    if (prev !== undefined) process.env.MEILI_URL = prev;
  });
});
