import { SeoSearchService } from './seo-search.module';

describe('publicMerchantFeedPage (Merchant Center feed rows)', () => {
  function build(rows: any[]) {
    const find = jest.fn(() => ({ sort: () => ({ skip: () => ({ limit: () => ({ batchSize: () => ({ toArray: async () => rows }) }) }) }) }));
    const conn: any = { collection: jest.fn(() => ({ find, countDocuments: jest.fn(async () => rows.length) })) };
    return { svc: new SeoSearchService(conn), find };
  }
  const row = (o: Record<string, unknown>) => ({
    id: 'm1', sku: 1001, slug: 'panadol', name_ar: 'بنادول', name_en: 'Panadol', price: 12.5, image: 'p/a.webp',
    manufacturer: 'GSK', barcode: '6281000000012', availability_status: 'none', ...o,
  });

  it('queries only indexable, non-Rx, non-controlled, priced products', async () => {
    const { svc, find } = build([row({})]);
    await svc.publicMerchantFeedPage('en', 1, 10);
    const filter: any = (find.mock.calls[0] as unknown as any[])[0];
    expect(filter.indexing_eligibility).toBe(true);
    expect(filter.requires_prescription).toEqual({ $ne: true });
    expect(filter.controlled).toEqual({ $ne: true });
    expect(filter.price).toEqual({ $gt: 0 });
  });

  it('drops a prescription row even if one reaches the mapper, and sends gtin only when it is a valid GTIN length', async () => {
    const { svc } = build([
      row({}),
      row({ id: 'm2', sku: 1002, slug: 'rx', requires_prescription: true }),
      row({ id: 'm3', sku: 1003, slug: 'bad', barcode: '123' }),
    ]);
    const out: any = await svc.publicMerchantFeedPage('en', 1, 10);
    expect(out.items.map((i: any) => i.id)).toEqual(['1001', '1003']);
    expect(out.items[0]).toMatchObject({ gtin: '6281000000012', brand: 'GSK', currency: 'SAR', available: true, price: 12.5 });
    expect(out.items[1].gtin).toBeNull();
  });
});
