import { NotFoundException } from '@nestjs/common';
import { SeoSearchService } from './seo-search.module';

// Run 116: the product page's "equivalents" read must not hit mongod once per visitor, and a slow query must not become a 5xx.
describe('publicProductEquivalents under load', () => {
  function service(opts: { findOne?: any; find?: any }) {
    const col = { findOne: jest.fn(opts.findOne ?? (async () => ({ id: 'p1', active_ingredient: 'Paracetamol', strength: '500 mg', form: 'Tablets', category: 'Medicine' }))), find: jest.fn(opts.find ?? (() => chain([]))) };
    return { svc: new SeoSearchService({ collection: () => col } as never), col };
  }
  const chain = (rows: any[], fail = false) => {
    const c: any = { sort: () => c, limit: () => c, maxTimeMS: jest.fn(() => c), toArray: async () => { if (fail) throw new Error('operation exceeded time limit'); return rows; } };
    return c;
  };

  it('concurrent visitors of one product share one computation, and the next ones read the cache', async () => {
    const { svc, col } = service({});
    await Promise.all([svc.publicProductEquivalents('en', 'p1'), svc.publicProductEquivalents('en', 'p1'), svc.publicProductEquivalents('en', 'p1')]);
    await svc.publicProductEquivalents('en', 'p1');
    expect(col.findOne).toHaveBeenCalledTimes(1);
  });

  it('every list query carries a time limit', async () => {
    const limits: any[] = [];
    const { svc } = service({ find: () => { const c = chain([]); c.maxTimeMS = jest.fn((n: number) => { limits.push(n); return c; }); return c; } });
    await svc.publicProductEquivalents('en', 'p1');
    expect(limits.length).toBeGreaterThanOrEqual(2);
    expect(limits.every((n) => n === SeoSearchService.EQUIVALENTS_MAX_TIME_MS)).toBe(true);
  });

  it('a query that is too slow degrades to nothing to show (not an error) and is remembered for a minute', async () => {
    const { svc, col } = service({ find: () => chain([], true) });
    expect(await svc.publicProductEquivalents('en', 'p1')).toEqual({ locale: 'en', id: 'p1', equivalents: [], similar: [] });
    await svc.publicProductEquivalents('en', 'p1');
    expect(col.findOne).toHaveBeenCalledTimes(1);
  });

  it('an unknown product is still a 404 and is never cached', async () => {
    const { svc, col } = service({ findOne: async () => null });
    await expect(svc.publicProductEquivalents('en', 'x')).rejects.toBeInstanceOf(NotFoundException);
    await expect(svc.publicProductEquivalents('en', 'x')).rejects.toBeInstanceOf(NotFoundException);
    expect(col.findOne).toHaveBeenCalledTimes(2);
  });
});
