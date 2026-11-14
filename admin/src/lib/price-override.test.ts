import { describe, expect, it } from 'vitest';
import { toAuditPage, variancePct } from './price-override';

describe('price override audit mapping', () => {
  it('computes the variance against the catalogue price', () => {
    expect(variancePct(10, 12)).toBe(20);
    expect(variancePct(10, 9)).toBe(-10);
    expect(variancePct(0, 5)).toBe(0);
  });
  it('maps the server rows and the page summary', () => {
    const page = toAuditPage({
      total: 51, page: 2, limit: 25,
      items: [
        { id: 'o1', sku: 'S1', name_ar: 'دواء', catalog_price: 10, override_price: 12, pharmacy_account_id: 'ph1', reason: 'cost', changed_by: 'ph1', changed_at: '2026-11-01T00:00:00Z' },
        { id: 'o2', sku: 'S2', catalog_price: 20, override_price: 18 },
      ],
    });
    expect(page.pages).toBe(3);
    expect(page.summary).toEqual({ total_overrides: 51, flagged_overpriced: 1, avg_variance_pct: 5 });
    expect(page.data[0]).toMatchObject({ medicine_sku: 'S1', medicine_name: 'دواء', difference_pct: 20, pharmacy_id: 'ph1' });
  });
  it('an empty answer is an empty page, not a crash', () => {
    expect(toAuditPage({ items: [], total: 0, page: 1, limit: 25 }).data).toEqual([]);
  });
});
