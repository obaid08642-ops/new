import { MedicinesService } from './medicines.service';

/** #450/#472: the pharmacy screens' filters and orders are applied by the server, on the governed catalogue. */
function serviceWith(rows: any[] = []) {
  const calls: any = {};
  const service: any = Object.create(MedicinesService.prototype);
  const chain: any = {
    sort: (o: any) => { calls.sort = o; return chain; },
    skip: (n: number) => { calls.skip = n; return chain; },
    limit: (n: number) => { calls.limit = n; return chain; },
    then: (resolve: any) => resolve(rows),
  };
  service.model = {
    find: (q: any) => { calls.query = q; return chain; },
    countDocuments: jest.fn().mockResolvedValue(41),
  };
  service.withBadges = (m: any) => m;
  service.normalizeSearchText = (s: string) => s.toLowerCase();
  service.expandSynonyms = () => [];
  return { service, calls };
}

describe('MedicinesService.filtered', () => {
  it('applies forms, brands, prescription-only and the price range on the published catalogue', async () => {
    const { service, calls } = serviceWith([{ id: 'm1' }]);
    const out = await service.filtered('panadol', undefined, { forms: ['Tablet'], brands: ['GSK'], rx_only: true, min_price: 5, max_price: 50 }, 'price_asc', undefined, 20);
    expect(out).toEqual([{ id: 'm1' }]);
    const q = calls.query;
    expect(q).toMatchObject({ public_eligibility: true, medical_review_status: 'approved', requires_prescription: true, price: { $gt: 0, $gte: 5, $lte: 50 } });
    expect(JSON.stringify(q.$and)).toContain('form');
    expect(JSON.stringify(q.$and)).toContain('manufacturer');
    expect(calls.sort).toEqual({ price: 1, id: 1 });
  });

  it('orders by newest or price, skips items without a price for a price order, and pages with a total', async () => {
    const { service, calls } = serviceWith([{ id: 'a' }]);
    const page = await service.filtered(undefined, undefined, { forms: [], brands: [], rx_only: false }, 'price_desc', 2, 20);
    expect(calls.query.price).toEqual({ $gt: 0 });
    expect(calls.sort).toEqual({ price: -1, id: 1 });
    expect(calls.skip).toBe(20);
    expect(page).toEqual({ data: [{ id: 'a' }], total: 41, page: 2, limit: 20, total_pages: 3 });
    await service.filtered(undefined, undefined, { forms: [], brands: [], rx_only: false }, 'newest', undefined, 20);
    expect(calls.sort).toEqual({ createdAt: -1, id: 1 });
  });

  it('escapes the filter text (a regex character is matched literally)', async () => {
    const { service, calls } = serviceWith();
    await service.filtered(undefined, undefined, { forms: ['a+(b'], brands: [], rx_only: false }, 'relevant', undefined, 20);
    expect(JSON.stringify(calls.query.$and)).toContain('a\\\\+\\\\(b');
  });
});
