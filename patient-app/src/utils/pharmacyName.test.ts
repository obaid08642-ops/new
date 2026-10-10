import { readTracking } from './orderTracking';
import { orderPharmacyNames } from './pharmacyOffers';

/**
 * #366 / #514: the order detail (pharmacy-order.service.ts `detail`) carries `pharmacy_name_ar/en` per allocation and,
 * when one pharmacy fills the order, on the order. These are TEST payloads; what is proved is which names are read.
 */

const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const order = (extra: Record<string, unknown> = {}) => ({ id: 'ord-ccccdd334455', status: 'confirmed', governed_state: 'CONFIRMED', payment_status: 'paid', selected_offer_id: 'o1', fulfillment: 'delivery', items: [{ id: 'i1' }], pricing_snapshot: snap, ...extra });

describe('the filling pharmacy name', () => {
  it('reads the order\'s own names', () => {
    expect(orderPharmacyNames(order({ pharmacy_name_ar: 'صيدلية النور', pharmacy_name_en: 'Al Noor' }))).toEqual({ ar: 'صيدلية النور', en: 'Al Noor' });
  });

  it('prefers the chosen allocation\'s names', () => {
    const response = order({
      selected_allocation_id: 'a2',
      pharmacy_name_ar: null,
      pharmacy_name_en: null,
      allocations_detail: [
        { id: 'a1', pharmacy_name_ar: 'أولى', pharmacy_name_en: 'First' },
        { id: 'a2', pharmacy_name_ar: 'ثانية', pharmacy_name_en: 'Second' },
      ],
    });
    expect(orderPharmacyNames(response)).toEqual({ ar: 'ثانية', en: 'Second' });
    expect(readTracking(response)?.pharmacy).toEqual({ ar: 'ثانية', en: 'Second' });
  });

  it('is null when the server sent no name (nothing is invented, no id is shown)', () => {
    expect(orderPharmacyNames(order({ allocations_detail: [{ id: 'a1', pharmacy_account_id: 'p1', pharmacy_name_ar: null, pharmacy_name_en: null }] }))).toBeNull();
    expect(readTracking(order())?.pharmacy).toBeNull();
  });
});
