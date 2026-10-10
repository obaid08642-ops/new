import { translations } from '../i18n';
import { STATUS_LABELS, buildRows, inBucket, listOf, statusLook, type OrderSources } from './orderCenter';

/**
 * The order list is built from each service's own answer. These are TEST payloads shaped like the backend's (stored order,
 * appointment, booking, claim and return); what is proved is where each row goes, which fields reach
 * the screen and which never do (a status the table does not know, an amount the server did not send).
 */

const pick = (ar: unknown, en: unknown) => (typeof en === 'string' ? en : typeof ar === 'string' ? ar : null);
const rows = (src: OrderSources) => buildRows(src, pick);

describe('pharmacy order rows (the list sends the stored order: no governed_state)', () => {
  const base = { id: 'ord-aaaaaa111111', createdAt: '2026-10-01T10:00:00Z', items: [{ id: 'i1' }, { id: 'i2' }] };

  it('an order still looking for offers opens the offers screen, not the tracking screen', () => {
    const [r] = rows({ pharmacyOrders: [{ ...base, status: 'broadcasting' }] });
    expect(r.route).toEqual({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'ord-aaaaaa111111' } });
    expect(r.action).toBe('details');
    expect(r.look).toMatchObject({ label: 'findingOffers', bucket: 'current' });
  });

  it('a chosen offer that waits for payment opens the final price; an insurance one opens the decision', () => {
    const [pay] = rows({ pharmacyOrders: [{ ...base, status: 'cash_card_payment_pending', selected_offer_id: 'o1' }] });
    expect(pay.route?.pathname).toBe('/pharmacy/final-quote');
    const [ins] = rows({ pharmacyOrders: [{ ...base, status: 'insurance_decision_pending', selected_offer_id: 'o1', payment_method: 'insurance' }] });
    expect(ins.route?.pathname).toBe('/pharmacy/insurance-decision');
  });

  it('a moving order is tracked; a delivered one offers "order again" and is in the previous tab', () => {
    const [moving] = rows({ pharmacyOrders: [{ ...base, status: 'out_for_delivery', selected_offer_id: 'o1', payment_status: 'paid' }] });
    expect(moving).toMatchObject({ action: 'track', route: { pathname: '/pharmacy/order-tracking' } });
    const [done] = rows({ pharmacyOrders: [{ ...base, status: 'delivered', selected_offer_id: 'o1', payment_status: 'paid' }] });
    expect(done).toMatchObject({ action: 'reorder', route: { pathname: '/pharmacy/reorder', params: { orderId: 'ord-aaaaaa111111' } } });
    expect(done.look.bucket).toBe('previous');
  });

  it('draws the amount only from the chosen quote snapshot and never from the default zero totals', () => {
    const [none] = rows({ pharmacyOrders: [{ ...base, status: 'broadcasting', totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' } }] });
    expect(none.amount).toBeNull();
    const [priced] = rows({ pharmacyOrders: [{ ...base, status: 'confirmed', pricing_snapshot: { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' } } }] });
    expect(priced.amount).toEqual({ value: 80, currency: 'SAR' });
    expect(priced.number).toBe('111111');
    expect(priced.sub).toEqual({ key: 'pharmacy.hub.items', n: 2 });
  });
});

describe('the other services', () => {
  it('maps each source to its kind, title, amount and screen without inventing any of them', () => {
    const all = rows({
      appointments: [{ id: 'a1', status: 'CONFIRMED', doctor_name: 'Dr Test', service_type: 'video', slot_start: '2026-10-05T09:00:00Z', total_price: 150 }],
      labs: [{ id: 'l1', state: 'SAMPLE_COLLECTED', service_name_en: 'CBC', visit_type: 'home', scheduled_at: '2026-10-04T09:00:00Z', total: 90 }],
      claims: [{ id: 'c1', status: 'pending', service: 'Test service', amount: 200, date: '2026-10-03' }],
      returns: [{ id: 'r1', status: 'processing', reason: 'Wrong item', order_id: 'ord-bbbbbb222222', amount: 25, createdAt: '2026-10-02T09:00:00Z' }],
    });
    expect(all.map((r) => r.kind)).toEqual(['doctors', 'labs', 'insurance', 'returns']);
    const byKind = Object.fromEntries(all.map((r) => [r.kind, r]));
    expect(byKind.doctors).toMatchObject({ title: 'Dr Test', amount: { value: 150, currency: null }, sub: { key: 'orders.sub.video' }, route: { pathname: '/consultations/appointment-detail', params: { appointmentId: 'a1' } } });
    expect(byKind.labs).toMatchObject({ title: 'CBC', amount: { value: 90 }, sub: { key: 'orders.sub.labHome' } });
    expect(byKind.insurance).toMatchObject({ title: 'Test service', amount: { value: 200 } });
    expect(byKind.returns).toMatchObject({ title: 'Wrong item', sub: { key: 'orders.sub.returnOf', ref: '222222' } });
  });

  it('a claim or a return that is "pending" or "processing" is under review, an appointment that is PENDING awaits confirmation', () => {
    expect(statusLook('insurance', 'pending').label).toBe('underReview');
    expect(statusLook('returns', 'processing').label).toBe('underReview');
    expect(statusLook('doctors', 'PENDING').label).toBe('awaitingConfirmation');
  });

  it('a legacy order opens the tracking screen (issue 368)', () => {
    const [r] = rows({ legacyOrders: [{ id: 'old-123456', state: 'PREPARING', items: [{}], createdAt: '2026-09-01T00:00:00Z' }] });
    expect(r).toMatchObject({ kind: 'pharmacy', route: { pathname: '/pharmacy/order-tracking', params: { orderId: 'old-123456' } }, action: 'track' });
  });

  it('lists the newest first, skips rows without an id, and splits current from previous', () => {
    const list = rows({
      appointments: [
        { id: 'old', status: 'COMPLETED', slot_start: '2026-01-01T00:00:00Z' },
        { status: 'PENDING', slot_start: '2026-12-01T00:00:00Z' },
        { id: 'new', status: 'PENDING', slot_start: '2026-11-01T00:00:00Z' },
      ],
    });
    expect(list.map((r) => r.id)).toEqual(['new', 'old']);
    expect(inBucket(list, 'current').map((r) => r.id)).toEqual(['new']);
    expect(inBucket(list, 'previous').map((r) => r.id)).toEqual(['old']);
  });
});

describe('status', () => {
  it('shows "status not available" for a code it does not know, never the raw code', () => {
    expect(statusLook('doctors', 'SOMETHING_NEW')).toMatchObject({ label: 'unknown', tone: 'neutral' });
    expect(statusLook('doctors', undefined).label).toBe('unknown');
  });

  it('has a real translation of every status label in all six languages', () => {
    const bucket = translations as unknown as Record<string, Record<string, string>>;
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil']) {
      for (const label of STATUS_LABELS) {
        const text = bucket[lang]?.[`orders.status.${label}`];
        expect(text && text.trim()).toBeTruthy();
      }
    }
  });
});

describe('listOf', () => {
  it('reads a bare array, { data } and { items }, and ignores anything else', () => {
    expect(listOf([{ id: 1 }, 2, null])).toEqual([{ id: 1 }]);
    expect(listOf({ data: [{ id: 2 }] })).toEqual([{ id: 2 }]);
    expect(listOf({ items: [{ id: 3 }] })).toEqual([{ id: 3 }]);
    expect(listOf('x')).toEqual([]);
    expect(listOf(null)).toEqual([]);
  });
});
