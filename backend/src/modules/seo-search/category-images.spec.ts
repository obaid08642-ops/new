import { SeoSearchService } from './seo-search.module';

/** A product card with more than one picture turns through them: the category listing sends them (at most five). */
describe('publicCategoryProducts pictures', () => {
  const svc = (rows: any[]) => {
    const col = {
      find: () => ({ sort: () => ({ skip: () => ({ limit: () => ({ toArray: async () => rows }) }) }) }),
      countDocuments: async () => rows.length,
    };
    const service: any = Object.create(SeoSearchService.prototype);
    service.conn = { collection: () => col };
    service.publicProductFilter = () => ({});
    service.publicListingCount = async () => rows.length;
    return service as SeoSearchService;
  };
  const url = (n: string) => `https://cdn.nabd.plus/${n}.png`;
  const doc = (id: string, images: string[]) => ({ id, slug: id, name_ar: id, price: 5, category: 'x', images: images.map(url) });

  it('sends `images` when there are at least two, at most five', async () => {
    const out: any = await svc([doc('many', ['a', 'b', 'c', 'd', 'e', 'f', 'g']), doc('two', ['a', 'b'])]).publicCategoryProducts('ar', 'all', undefined, 1, 24, undefined, 'price_asc');
    const byId = Object.fromEntries(out.items.map((i: any) => [i.id, i]));
    expect(byId.many.images).toHaveLength(5);
    expect(byId.two.images).toHaveLength(2);
  });

  it('sends no `images` for a product with one picture or none', async () => {
    const out: any = await svc([doc('one', ['a']), doc('none', [])]).publicCategoryProducts('ar', 'all', undefined, 1, 24, undefined, 'price_asc');
    for (const item of out.items) expect(item.images).toBeUndefined();
  });
});
