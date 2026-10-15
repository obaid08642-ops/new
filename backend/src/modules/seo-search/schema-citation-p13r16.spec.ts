import { SeoSearchService } from './seo-search.module';

// P13-R16: "Cite this" block and JSON-LD by page type (Drug, FAQPage).
// Red on the base: medicine pages emit a single Product node (no Drug),
// no citation block exists anywhere, and the site FAQPage is hardcoded
// instead of collection-driven.
describe('P13-R16 citation and schema extras', () => {
  function svcWith(opts: { med?: any; faqs?: any[] } = {}) {
    const med = opts.med || {
      id: 'med-1', slug: 'panadol-extra-abcdef', name_ar: 'بنادول', name_en: 'Panadol',
      active_ingredient: 'Paracetamol', manufacturer: 'GSK', price: 12,
      updatedAt: new Date('2026-09-01T00:00:00.000Z'),
    };
    const conn: any = {
      collection: jest.fn((name: string) => {
        if (name === 'medicines') return { findOne: jest.fn(async () => med), estimatedDocumentCount: jest.fn(async () => 1) };
        if (name === 'faqs') {
          return {
            find: jest.fn(() => ({ sort: () => ({ limit: () => ({ toArray: async () => opts.faqs || [] }) }) })),
          };
        }
        return { findOne: jest.fn(async () => null), estimatedDocumentCount: jest.fn(async () => 0) };
      }),
    };
    return new SeoSearchService(conn);
  }

  it('a medicine page emits Product (unchanged) plus a Drug node', async () => {
    const svc = svcWith();
    const out: any = await svc.metadata('medicine', 'med-1');
    const graph = out.json_ld['@graph'] || [out.json_ld];
    const product = graph.find((n: any) => n['@type'] === 'Product');
    const drug = graph.find((n: any) => n['@type'] === 'Drug');
    expect(product).toMatchObject({ name: 'بنادول' });
    expect(product.offers).toMatchObject({ price: 12, priceCurrency: 'SAR' });
    expect(drug).toMatchObject({ name: 'بنادول', activeIngredient: 'Paracetamol' });
  });

  it('every metadata response carries a citable reference', async () => {
    const svc = svcWith();
    const out: any = await svc.metadata('medicine', 'med-1');
    expect(typeof out.citation.text).toBe('string');
    expect(out.citation.text).toContain('https://');
    expect(out.citation.text).toContain('GSK');
    expect(out.citation.bibtex).toContain('@online');
    expect(out.citation.bibtex).toContain('https://');
  });

  it('the site FAQPage is driven by the faqs collection', async () => {
    const svc = svcWith({
      faqs: [{ id: 'f1', question_ar: 'س؟', answer_ar: 'ج.', sort: 0, active: true }],
    });
    const out: any = await svc.siteFaqJsonLd();
    expect(out).toMatchObject({ '@type': 'FAQPage' });
    expect(out.mainEntity.map((q: any) => q.name)).toContain('س؟');
  });

  it('the site FAQPage falls back when the collection is empty', async () => {
    const svc = svcWith({ faqs: [] });
    const out: any = await svc.siteFaqJsonLd();
    expect(out).toMatchObject({ '@type': 'FAQPage' });
    expect(out.mainEntity.length).toBeGreaterThan(0);
  });
});
