import { SeoSearchService } from './seo-search.module';

const doc = (id: string, extra: any = {}) => ({
  id, slug: `med-${id}`, name_ar: `دواء ${id}`, category: 'الأدوية والعلاج',
  usage_count: 0, ...extra,
});

describe('publicCategoryProducts popularity ordering', () => {
  const svc = (medicines: any[], metrics: any[] = []) => {
    const cols: any = {
      medicines_master: {
        find: jest.fn().mockImplementation((filter: any) => {
          // Respect id/category constraints like Mongo would (incl. $or regex).
          const matchClause = (m: any, clause: any): boolean =>
            Object.entries(clause || {}).every(([field, cond]: [string, any]) => {
              const v = (m as any)[field];
              if (typeof cond === 'string') return v === cond;
              if (cond && typeof cond.$regex === 'string') return new RegExp(cond.$regex, cond.$options || '').test(String(v ?? ''));
              return true;
            });
          let rows = [...medicines];
          if (filter?.id?.$in) rows = rows.filter((m: any) => filter.id.$in.includes(m.id));
          if (filter?.category && typeof filter.category === 'string') rows = rows.filter((m: any) => m.category === filter.category);
          if (Array.isArray(filter?.$or)) rows = rows.filter((m: any) => filter.$or.some((c: any) => matchClause(m, c)));
          rows = rows.sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
          const toArray = jest.fn().mockResolvedValue(rows);
          // Support both chains: base sort().skip().limit() and per-cat sort().limit().
          const limitObj = { toArray };
          const skipObj = { limit: jest.fn().mockReturnValue(limitObj) };
          return { sort: jest.fn().mockReturnValue({ skip: jest.fn().mockReturnValue(skipObj), limit: jest.fn().mockReturnValue(limitObj) }) };
        }),
        countDocuments: jest.fn().mockResolvedValue(medicines.length),
      },
      product_ranking_metrics: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            limit: jest.fn().mockReturnValue({
              project: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(metrics) }),
              toArray: jest.fn().mockResolvedValue(metrics),
            }),
          }),
        }),
      },
    };
    const conn: any = { collection: jest.fn((n: string) => cols[n]) };
    const service = new SeoSearchService(conn);
    let sortArg: any = null;
    const origFind = cols.medicines_master.find;
    cols.medicines_master.find = jest.fn().mockImplementation((filter: any) => {
      const cursor = (origFind as any)(filter);
      const withSort = cursor.sort;
      cursor.sort = jest.fn().mockImplementation((s: any) => { if (!sortArg) sortArg = s; return (withSort as any)(s); });
      return cursor;
    });
    return { service, getSort: () => sortArg };
  };

  it('sorts by usage_count first (no image bias — medicines surface on All)', async () => {
    const meds = [doc('cosmo', { usage_count: 1, image_1: 'x' }), doc('cibrax', { usage_count: 500 }), doc('baby', { usage_count: 2, image_1: 'y' })];
    const { service, getSort } = svc(meds);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 24);
    expect(getSort().usage_count).toBe(-1);
    expect(getSort().image_1).toBeUndefined();
    expect(out.items[0].id).toBe('cibrax');
  });

  it('pins top composite-score drugs on page 1 when absent', async () => {
    const meds = [doc('a', { usage_count: 10 }), doc('star', { usage_count: 0 })];
    const { service } = svc(meds, [{ drug_id: 'star', composite_score: 99 }]);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 24);
    expect(out.items.map((i: any) => i.id)).toContain('star');
  });

  it('does not boost on later pages or with search query', async () => {
    const meds = [doc('a', { usage_count: 10 })];
    const { service } = svc(meds, [{ drug_id: 'star', composite_score: 99 }]);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 2, 24);
    expect(out.items.map((i: any) => i.id)).not.toContain('star');
  });

  it('NEVER pins another category\'s top drug into a specific category page', async () => {
    const meds = [
      doc('med-a', { usage_count: 5, category: 'الأدوية والعلاج' }),
      doc('cosmo-star', { usage_count: 1, image_1: 'x', category: 'العناية والتجميل' }),
    ];
    // cosmo-star is the GLOBAL composite champion (e.g. bought 1000×).
    const { service } = svc(meds, [
      { drug_id: 'cosmo-star', composite_score: 999 },
      { drug_id: 'med-a', composite_score: 10 },
    ]);
    const out: any = await service.publicCategoryProducts('ar', 'الأدوية والعلاج', undefined, 1, 24);
    const ids = out.items.map((i: any) => i.id);
    expect(ids).toContain('med-a');
    expect(ids).not.toContain('cosmo-star');
  });

  it('pins the global champion on All regardless of its category', async () => {
    const meds = [
      doc('med-a', { usage_count: 5, category: 'الأدوية والعلاج' }),
      doc('cosmo-star', { usage_count: 1, image_1: 'x', category: 'العناية والتجميل' }),
    ];
    const { service } = svc(meds, [
      { drug_id: 'cosmo-star', composite_score: 999 },
      { drug_id: 'med-a', composite_score: 10 },
    ]);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 24);
    expect(out.items[0].id).toBe('cosmo-star');
  });

  it('diversifies ALL page-1 across categories (max 2 per active ingredient)', async () => {
    const meds = [
      doc('para-1', { usage_count: 100, category: 'الأدوية والعلاج', active_ingredient: 'باراسيتامول' }),
      doc('para-2', { usage_count: 90, category: 'الأدوية والعلاج', active_ingredient: 'باراسيتامول' }),
      doc('para-3', { usage_count: 80, category: 'الأدوية والعلاج', active_ingredient: 'باراسيتامول' }),
      doc('ibu-1', { usage_count: 70, category: 'الأدوية والعلاج', active_ingredient: 'ايبوبروفين' }),
      doc('cream-1', { usage_count: 5, category: 'العناية بالبشرة', active_ingredient: 'زنك' }),
      doc('shampoo-1', { usage_count: 4, category: 'العناية بالشعر', active_ingredient: 'كيراتين' }),
      doc('vit-1', { usage_count: 3, category: 'الفيتامينات والتغذية الصحية', active_ingredient: 'فيتامين د' }),
    ];
    const { service } = svc(meds, []);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 8);
    const ids = out.items.map((i: any) => i.id);
    // No more than 2 paracetamol despite 3 dominating by usage.
    expect(ids.filter((id: string) => id.startsWith('para-')).length).toBeLessThanOrEqual(2);
    // Minority categories surface on page 1.
    expect(ids).toContain('cream-1');
    expect(ids).toContain('shampoo-1');
    expect(ids).toContain('vit-1');
  });
});
