import { SeoSearchService } from './seo-search.module';

describe('publicProductSitemapPage cache (R49)', () => {
  it('serves the second identical page from cache without hitting DB twice', async () => {
    const toArray = jest.fn().mockResolvedValue([{ slug: 'a', updatedAt: new Date('2026-01-01') }]);
    const batchSize = jest.fn(() => ({ toArray }));
    const conn: any = {
      collection: jest.fn(() => ({
        find: jest.fn(() => ({ sort: jest.fn(() => ({ skip: jest.fn(() => ({ limit: jest.fn(() => ({ batchSize })) })) })) })),
      })),
    };
    const svc = new SeoSearchService(conn);
    const first: any = await svc.publicProductSitemapPage('ar', 1, 10);
    const second: any = await svc.publicProductSitemapPage('ar', 1, 10);
    expect(first).toEqual(second);
    expect(toArray).toHaveBeenCalledTimes(1);
    // the whole page is fetched in one batch, not the driver default of 101 documents per getMore (Sentry NABD-BACKEND-1V)
    expect(batchSize).toHaveBeenCalledWith(10);
    expect(conn.collection).toHaveBeenCalledTimes(1);
  });
});
