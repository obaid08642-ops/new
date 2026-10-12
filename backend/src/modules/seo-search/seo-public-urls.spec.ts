import { isPublicIndexable, localizedPaths, publicUrlsFor, radiologyToken, SITE_LOCALES } from './seo-public-urls';

describe('public URLs of an entity in the six locales (SEO, IndexNow)', () => {
  const ORIGIN = 'https://nabd.plus';
  beforeAll(() => { process.env.NABD_PUBLIC_URL = ORIGIN; });

  const medicine = {
    id: 'm1', slug: 'panadol-m1',
    translations: { ar: { slug: 'بنادول-m1' }, en: { slug: 'panadol-500-m1' }, ur: { slug: 'panadol-ur' }, hi: { slug: 'panadol-hi' }, bn: { slug: 'panadol-bn' }, tl: { slug: 'panadol-tl' } },
  };
  const cases: Array<[string, any, (l: string) => string[], string[]]> = [
    ['medicine', medicine, (l) => [`/${l}/p/${encodeURIComponent((medicine.translations as any)[l === 'fil' ? 'tl' : l].slug)}`], []],
    ['doctor', { id: 'd1', slug: 'dr-sara-d1' }, (l) => [`/${l}/doctor/dr-sara-d1`], []],
    ['facility', { id: 'f1', slug: 'kfsh' }, (l) => [`/${l}/facility/kfsh`], []],
    ['pharmacy', { id: 'ph1', slug: 'al-dawaa-1' }, (l) => [`/${l}/pharmacy/al-dawaa-1`], []],
    ['article', { id: 'a1', slug: 'vitamin-d-a1' }, (l) => [`/${l}/articles/vitamin-d-a1`], []],
    ['condition', { code: 'headache' }, (l) => [`/${l}/condition/headache`], []],
    ['lab_service', { id: 'l1', short_code: 'CBC' }, (l) => [`/${l}/labs/CBC/riyadh`, `/${l}/labs/CBC/jeddah`], ['riyadh', 'jeddah']],
    ['radiology_service', { id: 'r1', short_code: 'MRI Brain' }, (l) => [`/${l}/diagnostics/radiology/r1`], ['riyadh']],
    ['home_care_service', { id: 'h1' }, (l) => [`/${l}/home-care/services/h1`], []],
  ];

  it.each(cases)('%s: one page per locale (ar, en, ur, hi, bn, fil)', (type, entity, expected, cities) => {
    for (const l of SITE_LOCALES) expect(localizedPaths(type as any, entity, l, cities)).toEqual(expected(l));
    const urls = publicUrlsFor(type as any, entity, cities);
    expect(urls.length).toBe(SITE_LOCALES.length * expected('ar').length);
    for (const u of urls) expect(u.startsWith(`${ORIGIN}/`)).toBe(true);
    for (const l of SITE_LOCALES) expect(urls.some((u) => u.startsWith(`${ORIGIN}/${l}/`))).toBe(true);
  });

  it('a medicine without a localized slug falls back to its shared slug (the page resolves both)', () => {
    expect(localizedPaths('medicine', { id: 'm2', slug: 'x-m2' }, 'bn')).toEqual(['/bn/p/x-m2']);
  });

  it('no identifier, no URL (never a /undefined page)', () => {
    expect(publicUrlsFor('article', { id: 'a2' })).toEqual([]);
    expect(publicUrlsFor('lab_service', { id: 'l2' }, [])).toEqual([]);
    expect(publicUrlsFor('doctor', {})).toEqual([]);
  });

  it('never builds the old /s/ share URLs, which the web does not serve', () => {
    for (const [type, entity, , cities] of cases) {
      for (const u of publicUrlsFor(type as any, entity, cities)) expect(u).not.toMatch(/\/s\//);
    }
  });

  it('radiology token matches the web sitemap rule', () => {
    expect(radiologyToken({ short_code: 'CT  Chest/Abdomen' })).toBe('ct-chest-abdomen');
  });

  it('sitemaps list only public, reviewed, index-eligible entities', () => {
    const ok = { public_eligibility: true, medical_review_status: 'approved', indexing_eligibility: true };
    expect(isPublicIndexable('medicine', { ...ok })).toBe(true);
    expect(isPublicIndexable('medicine', { ...ok, medical_review_status: 'pending' })).toBe(false);
    expect(isPublicIndexable('doctor', { ...ok, type: 'doctor', status: 'active' })).toBe(true);
    expect(isPublicIndexable('doctor', { ...ok, type: 'doctor', status: 'suspended' })).toBe(false);
    expect(isPublicIndexable('pharmacy', { ...ok, type: 'pharmacy', status: 'active', indexing_eligibility: false })).toBe(false);
    expect(isPublicIndexable('article', { status: 'DRAFT' })).toBe(false);
    expect(isPublicIndexable('lab_service', { ...ok, active: true, is_deleted: true })).toBe(false);
  });
});
