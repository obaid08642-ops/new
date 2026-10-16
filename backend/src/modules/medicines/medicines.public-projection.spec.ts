import { MedicinesService } from './medicines.service';
import { toPublicMedicine, toPublicProductCard } from './public-medicine';

// Issue 1555: public fields only, of published items only.
describe('public medicine projection', () => {
  const internal = {
    _id: 'x', __v: 1, provenance: 'p', source: 'master', source_product_id: 3, pending_revision: { changes: {} }, review_reason: 'r',
    created_by: 'a', updated_by: 'b', deleted_at: null, is_deleted: false, aggregate_stock: 9, pharmacies_count: 2,
    medical_review_status: 'approved', public_eligibility: true, indexing_eligibility: false, last_reviewed: new Date(),
    some_new_review_note: 'n', created_by_role: 'admin', usage_count: 4, verified: true,
  };

  it('drops every internal field at any depth and keeps the public ones', () => {
    const out = toPublicMedicine({ id: 'm1', name_ar: 'أ', price: 5, translations: { ur: { name: 'ا' } }, ...internal, alternatives: [{ id: 'm2', ...internal }], stock_status: { aggregate_stock: 9, pharmacies_count: 2, in_stock: true } });
    expect(out).toEqual({ id: 'm1', name_ar: 'أ', price: 5, translations: { ur: { name: 'ا' } }, alternatives: [{ id: 'm2' }], stock_status: { in_stock: true } });
  });

  it('withholds the old price and the discount of a prescription item', () => {
    expect(toPublicMedicine({ id: 'm', requires_prescription: true, price: 10, old_price: 20, discount_percent: 50, has_discount: true }))
      .toEqual({ id: 'm', requires_prescription: true, price: 10, discount_percent: 0, has_discount: false });
    expect(toPublicMedicine({ id: 'm', requires_prescription: false, price: 10, old_price: 20 })).toEqual({ id: 'm', requires_prescription: false, price: 10, old_price: 20 });
  });

  it('builds the /public/products card (no old price on a prescription item)', () => {
    const card = toPublicProductCard({ id: 'm', slug: 's', name_ar: 'أ', name_en: 'A', price: 10, old_price: 20, requires_prescription: true, ...internal }, 'en');
    expect(card).toMatchObject({ id: 'm', slug: 's', name: 'A', price: 10, old_price: null, is_rx: true, currency: 'SAR' });
    expect(Object.keys(card)).not.toEqual(expect.arrayContaining(['provenance', 'source', 'aggregate_stock']));
  });

  it('the typo-tolerant fallback of the public list keeps the public catalogue gate', async () => {
    const calls: Array<Record<string, unknown>> = [];
    const chain = (rows: unknown[]) => ({ sort: () => ({ limit: async () => rows }) });
    type Args = ConstructorParameters<typeof MedicinesService>;
    const model = { find: jest.fn((q: Record<string, unknown>) => { calls.push(q); return chain([]); }) } as unknown as Args[0];
    const redis = { getJson: async () => null, setJson: async () => undefined } as unknown as Args[2];
    const conn = { collection: () => ({ insertOne: () => ({ catch: () => undefined }) }) } as unknown as Args[3];
    const service = new MedicinesService(model, { emit: jest.fn() } as unknown as Args[1], redis, conn, {} as Args[4]);
    await service.list('fieldxl', undefined, false, 30);
    // No row anywhere: the last read is the letter-gap (typo-tolerant) retry.
    const tolerant = calls[calls.length - 1];
    expect(calls.length).toBeGreaterThanOrEqual(2);
    expect(tolerant).toMatchObject({ public_eligibility: true, medical_review_status: 'approved', is_deleted: { $ne: true } });
  });
});
