import { SeoSearchService } from './seo-search.module';
import { POPULAR_ORDER_STAGES } from '../product-ranking/product-ranking.service';

const doc = (id: string, extra: any = {}) => ({ id, slug: `med-${id}`, name_ar: `دواء ${id}`, category: 'الأدوية والعلاج', usage_count: 0, ...extra });

describe('publicCategoryProducts popularity ordering', () => {
  const svc = (medicines: any[]) => {
    const pipelines: any[][] = [];
    const finds: any[] = [];
    const cols: any = {
      medicines: {
        aggregate: jest.fn().mockImplementation((pipeline: any[]) => {
          pipelines.push(pipeline);
          return { toArray: jest.fn().mockResolvedValue(medicines) };
        }),
        find: jest.fn().mockImplementation(() => {
          const sort = jest.fn().mockImplementation((s: any) => { finds.push(s); return { skip: () => ({ limit: () => ({ toArray: () => Promise.resolve(medicines) }) }) }; });
          return { sort };
        }),
        countDocuments: jest.fn().mockResolvedValue(medicines.length),
      },
      product_ranking_metrics: { find: jest.fn() },
    };
    const conn: any = { collection: jest.fn((n: string) => cols[n]) };
    return { service: new SeoSearchService(conn), pipelines, finds, cols };
  };

  it('orders the default list by the composite score stages, in stock and with an image as tie-breakers', async () => {
    const { service, pipelines, finds } = svc([doc('a'), doc('b')]);
    const out: any = await service.publicCategoryProducts('ar', 'all', undefined, 1, 24);
    expect(out.items.map((i: any) => i.id)).toEqual(['a', 'b']); // the database order is kept as it is
    expect(finds).toEqual([]);
    const stages = pipelines[0];
    expect(stages[0]).toHaveProperty('$match');
    expect(stages.slice(1, 1 + POPULAR_ORDER_STAGES.length)).toEqual(POPULAR_ORDER_STAGES);
    const sortStage = POPULAR_ORDER_STAGES.find((s) => '$sort' in s) as any;
    expect(Object.keys(sortStage.$sort).slice(0, 3)).toEqual(['_rank', '_in_stock', '_has_image']);
    expect(stages).toContainEqual({ $skip: 0 });
    expect(stages).toContainEqual({ $limit: 24 });
  });

  it('pages with skip and limit and never pins or re-orders page 1 afterwards', async () => {
    const { service, pipelines, cols } = svc([doc('a')]);
    await service.publicCategoryProducts('ar', 'all', undefined, 3, 10);
    expect(pipelines[0]).toContainEqual({ $skip: 20 });
    expect(pipelines[0]).toContainEqual({ $limit: 10 });
    expect(cols.product_ranking_metrics.find).not.toHaveBeenCalled();
  });

  it('an explicit price order keeps the plain sort', async () => {
    const { service, pipelines, finds } = svc([doc('a')]);
    await service.publicCategoryProducts('ar', 'all', undefined, 1, 24, undefined, 'price_asc');
    expect(pipelines).toEqual([]);
    expect(finds[0]).toEqual({ price: 1, _id: 1 });
  });

  it('a prescription-only item keeps its natural place (its score does not count)', () => {
    const add = POPULAR_ORDER_STAGES[0] as any;
    expect(JSON.stringify(add.$addFields._rank)).toContain('requires_prescription');
  });
});
