import { SeoSearchService } from './seo-search.module';

const doc = (id: string, extra: any = {}) => ({
  id, slug: `med-${id}`, name_ar: `دواء ${id}`, category: 'الأدوية والعلاج',
  usage_count: 0, ...extra,
});

describe('publicCategoryProducts popularity ordering', () => {
  const svc = (medicines: any[], metrics: any[] = []) => {
    const cols: any = {
      medicines_master: {
        find: jest.fn().mockReturnValue({
          sort: jest.fn().mockReturnValue({
            skip: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                toArray: jest.fn().mockImplementation(async () => {
                  // emulate usage_count desc sort the service requests
                  return [...medicines].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0));
                }),
              }),
            }),
          }),
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
    // capture the requested sort
    let sortArg: any = null;
    cols.medicines_master.find.mockImplementation(() => ({
      sort: jest.fn().mockImplementation((s: any) => { sortArg = s; return {
        skip: jest.fn().mockReturnValue({ limit: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue(
          [...medicines].sort((a, b) => (b.usage_count || 0) - (a.usage_count || 0)),
        ) }) }),
      }; }),
    }));
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
    // metrics collection shape in code: .find().sort().limit().project().toArray()
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 24);
    expect(out.items.map((i: any) => i.id)).toContain('star');
  });

  it('does not boost on later pages or with search query', async () => {
    const meds = [doc('a', { usage_count: 10 })];
    const { service } = svc(meds, [{ drug_id: 'star', composite_score: 99 }]);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 2, 24);
    expect(out.items.map((i: any) => i.id)).not.toContain('star');
  });
});
