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

  it('a failed first count is not kept', async () => {
    const count = jest.fn().mockRejectedValueOnce(new Error('down')).mockResolvedValue(5);
    const svc = service(count);
    await expect(svc.publicProductSearch('', 'en', 20, 1)).rejects.toThrow('down');
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(5);
  });

  it('a total older than 5 minutes is shown at once and refreshed behind the response (stale-while-revalidate)', async () => {
    const count = jest.fn().mockResolvedValue(5);
    const svc = service(count);
    await svc.publicProductSearch('', 'en', 20, 1);
    const now = Date.now();
    const spy = jest.spyOn(Date, 'now').mockReturnValue(now + 301_000);
    count.mockResolvedValue(6);
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(5);   // stale, no wait
    await new Promise((r) => setImmediate(r));
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(6);   // refreshed
    expect(count).toHaveBeenCalledTimes(2);
    // past the stale window the visitor waits for a fresh count
    spy.mockReturnValue(now + 301_000 + 3_700_000);
    count.mockResolvedValue(7);
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(7);
    // a failing refresh keeps serving the last good total
    spy.mockReturnValue(now + 301_000 + 3_700_000 + 301_000);
    count.mockRejectedValue(new Error('down'));
    expect((await svc.publicProductSearch('', 'en', 20, 1) as any).total).toBe(7);
    jest.restoreAllMocks();
  });
});
