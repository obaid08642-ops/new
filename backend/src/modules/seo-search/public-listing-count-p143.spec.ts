import { SeoSearchService } from './seo-search.module';

// P14.3: the catalogue listing's total is counted once per minute per process, not on every page.
function service(count: jest.Mock) {
  const rows = Array.from({ length: 3 }, (_, i) => ({ id: `m${i}`, name_en: `M${i}`, translations: { en: { slug: `m${i}` } } }));
  const cursor = { sort: () => cursor, skip: () => cursor, limit: () => cursor, toArray: async () => rows };
  const conn: any = { collection: () => ({ find: () => cursor, countDocuments: count }) };
  return new SeoSearchService(conn);
}

describe('public catalogue total (P14.3)', () => {
  it('concurrent and repeated pages without a term share one count', async () => {
    const count = jest.fn().mockResolvedValue(21000);
    const svc = service(count);
    const pages = await Promise.all([1, 2, 3].map((p) => svc.publicProductSearch('', 'en', 20, p)));
    await svc.publicProductSearch('', 'ar', 20, 1);
    expect(pages.map((x: any) => x.total)).toEqual([21000, 21000, 21000]);
    expect(count).toHaveBeenCalledTimes(1);
  });

  it('counts again after a minute, and a failed count is not kept', async () => {
    const count = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(5);
    const svc = service(count);
    await expect(svc.publicProductSearch('', 'en', 20, 1)).rejects.toThrow('down');
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(5);
    const now = Date.now();
    jest.spyOn(Date, 'now').mockReturnValue(now + 61_000);
    count.mockResolvedValue(6);
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(6);
    jest.restoreAllMocks();
  });
});
