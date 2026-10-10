import { nextKey, readLegacyTracking, readTracking } from './orderTracking';

/**
 * Tracking reads one pharmacy order the way GET /patient/pharmacy/orders/:id sends it (pharmacy-order.service.ts `detail`):
 * `status`, `effective_status`, `timeline[]`, `delivery`, `allocations_detail[]`. These are TEST payloads. What is proved:
 * the steps follow the order's own status, a time exists only where the server recorded the event, the arrival time and the
 * courier are the pharmacy's own, and nothing is drawn for an order that has not started or was cancelled.
 */

const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const order = (extra: Record<string, unknown> = {}) => ({ id: 'ord-ccccdd334455', status: 'confirmed', governed_state: 'CONFIRMED', payment_status: 'paid', selected_offer_id: 'o1', fulfillment: 'delivery', items: [{ id: 'i1' }, { id: 'i2' }], pricing_snapshot: snap, ...extra });
const view = (extra: Record<string, unknown> = {}) => {
  const v = readTracking(order(extra));
  if (!v) throw new Error('unreadable');
  return v;
};
const states = (extra: Record<string, unknown>) => view(extra).steps.map((s) => `${s.id}:${s.state}`);

describe('steps follow the order status', () => {
  it('confirmed: accepted is the current step, the rest are ahead', () => {
    expect(states({})).toEqual(['accepted:current', 'preparing:upcoming', 'onTheWay:upcoming', 'delivered:upcoming']);
  });

  it('being prepared, on the way and delivered', () => {
    expect(states({ status: 'in_fulfillment', governed_state: 'IN_FULFILLMENT' })).toEqual(['accepted:done', 'preparing:current', 'onTheWay:upcoming', 'delivered:upcoming']);
    expect(states({ status: 'out_for_delivery', governed_state: 'OUT_FOR_DELIVERY' })).toEqual(['accepted:done', 'preparing:done', 'onTheWay:current', 'delivered:upcoming']);
    const done = view({ status: 'delivered', governed_state: 'DELIVERED' });
    expect(done.steps.every((s) => s.state === 'done')).toBe(true);
    expect(done.done).toBe(true);
  });

  it('the allocations\' progress (effective_status) wins over the stored status', () => {
    expect(states({ status: 'confirmed', effective_status: 'out_for_delivery' })[2]).toBe('onTheWay:current');
  });

  it('a pickup order has its own last two steps, and "ready" comes from the pharmacy\'s allocation', () => {
    const preparing = view({ fulfillment: 'pickup', status: 'in_fulfillment', governed_state: 'IN_FULFILLMENT' });
    expect(preparing.steps.map((s) => s.id)).toEqual(['accepted', 'preparing', 'ready', 'collected']);
    expect(preparing.steps[1].state).toBe('current');
    const ready = view({ fulfillment: 'pickup', status: 'in_fulfillment', governed_state: 'IN_FULFILLMENT', allocations_detail: [{ id: 'al1', status: 'ready_for_pickup', timeline: [{ ts: '2026-10-06T11:00:00Z', event: 'ready_for_pickup' }] }] });
    expect(ready.steps[2]).toMatchObject({ id: 'ready', state: 'current', at: Date.parse('2026-10-06T11:00:00Z') });
  });

  it('an order the pharmacy has not accepted has not started: every step is ahead', () => {
    const v = view({ status: 'cash_card_payment_pending', governed_state: 'FINAL_QUOTE_ACCEPTED', payment_status: undefined });
    expect(v.notStarted).toBe(true);
    expect(v.steps.every((s) => s.state === 'upcoming')).toBe(true);
  });

  it('a cancelled order shows no progress', () => {
    const v = view({ status: 'cancelled', governed_state: 'CANCELLED' });
    expect(v.cancelled).toBe(true);
    expect(v.notStarted).toBe(false);
    expect(v.steps.every((s) => s.state === 'upcoming')).toBe(true);
  });
});

describe('times, arrival and courier come from the server', () => {
  it('a step has a time only when the order\'s timeline recorded its event, and a step not reached has none', () => {
    const v = view({
      status: 'in_fulfillment',
      governed_state: 'IN_FULFILLMENT',
      timeline: [
        { ts: '2026-10-06T08:00:00Z', event: 'created' },
        { ts: '2026-10-06T09:00:00Z', event: 'all_allocations_confirmed' },
        { ts: '2026-10-06T10:00:00Z', event: 'fulfillment_started' },
        { ts: '2026-10-06T12:00:00Z', event: 'first_out_for_delivery' },
      ],
    });
    expect(v.steps.map((s) => s.at)).toEqual([Date.parse('2026-10-06T09:00:00Z'), Date.parse('2026-10-06T10:00:00Z'), null, null]);
    expect(view({}).steps.map((s) => s.at)).toEqual([null, null, null, null]);
  });

  it('the arrival time is the courier\'s own estimate and only while the order is on its way', () => {
    const delivery = { courier_name: 'Test courier', courier_phone: '+966 50 000 0000', courier_eta: '2026-10-06T13:30:00Z' };
    const onTheWay = view({ status: 'out_for_delivery', governed_state: 'OUT_FOR_DELIVERY', delivery });
    expect(onTheWay.eta).toBe(Date.parse('2026-10-06T13:30:00Z'));
    expect(onTheWay.courier).toEqual({ name: 'Test courier', phone: '+966500000000' });
    expect(view({ status: 'in_fulfillment', governed_state: 'IN_FULFILLMENT', delivery }).eta).toBeNull();
    expect(view({ status: 'out_for_delivery', governed_state: 'OUT_FOR_DELIVERY' }).eta).toBeNull();
    expect(view({ status: 'out_for_delivery', governed_state: 'OUT_FOR_DELIVERY' }).courier).toBeNull();
  });

  it('a courier without a usable phone number is shown without a call button', () => {
    expect(view({ delivery: { courier_name: 'Test courier', courier_phone: '12' } }).courier).toEqual({ name: 'Test courier', phone: null });
  });

  it('the quote\'s own numbers and the item count are passed on, nothing is added up', () => {
    const v = view({});
    expect(v.totals).toEqual({ subtotal: 70, deliveryFee: 10, total: 80, currency: 'SAR' });
    expect(v.itemCount).toBe(2);
  });
});

describe('where an order that still needs the patient goes', () => {
  it('offers a way on while a price is waiting for acceptance or an insurance decision is open, and not otherwise', () => {
    const quote = view({ status: 'cash_card_payment_pending', governed_state: 'FINAL_QUOTE_READY', payment_status: undefined });
    expect(quote.next?.pathname).toBe('/pharmacy/final-quote');
    expect(nextKey(quote.next!)).toBe('orders.track.continueQuote');
    const ins = view({ status: 'insurance_decision_pending', governed_state: 'INSURANCE_DECISION_READY', payment_status: undefined, payment_method: 'insurance' });
    expect(nextKey(ins.next!)).toBe('orders.track.continueInsurance');
    expect(view({}).next).toBeNull();
    expect(view({ status: 'cod_due_on_delivery', governed_state: 'COD_REGISTERED', payment_status: undefined }).next).toBeNull();
    expect(view({ status: 'cancelled', governed_state: 'CANCELLED' }).next).toBeNull();
  });

  it('is null for an answer that is not an order', () => {
    expect(readTracking(null)).toBeNull();
    expect(readTracking({ id: 'x' })).toBeNull();
  });
});

describe('a legacy order (issue 368)', () => {
  it('reads state, pharmacy, total, courier and the delivery estimate; nothing else is invented', () => {
    const v = readLegacyTracking({ order_id: 'old-1', state: 'OUT_FOR_DELIVERY', pharmacy_name: 'Al Noor', total: 42, delivery: { eta_minutes: 18, courier_name: 'Sami', courier_phone: '+966 50 123 4567' } });
    expect(v).toEqual({ id: 'old-1', state: 'OUT_FOR_DELIVERY', pharmacyName: 'Al Noor', total: 42, courier: { name: 'Sami', phone: '+966501234567' }, etaMinutes: 18 });
    expect(readLegacyTracking({ order_id: 'old-2', state: 'PENDING', delivery: null })).toEqual({ id: 'old-2', state: 'PENDING', pharmacyName: null, total: null, courier: null, etaMinutes: null });
    expect(readLegacyTracking({ state: 'PENDING' })).toBeNull();
  });
});
