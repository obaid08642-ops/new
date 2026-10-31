import { readLegacyTracking, readTracking } from './orderTracking';
import { statusLook } from './orderCenter';

/**
 * PT-25: every delivery/pickup stage the tracking screen can draw, and what is drawn (nothing invented) when a field is
 * missing, malformed, or the status is one the client does not know (e.g. a failed delivery). TEST payloads only.
 */
const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const order = (extra: Record<string, unknown> = {}) => ({ id: 'ord-ccccdd334455', status: 'confirmed', governed_state: 'CONFIRMED', payment_status: 'paid', selected_offer_id: 'o1', fulfillment: 'delivery', items: [{ id: 'i1' }], pricing_snapshot: snap, ...extra });
const view = (extra: Record<string, unknown> = {}) => {
  const v = readTracking(order(extra));
  if (!v) throw new Error('unreadable');
  return v;
};
const states = (extra: Record<string, unknown>) => view(extra).steps.map((s) => `${s.id}:${s.state}`);

describe('stage table, delivery', () => {
  const rows: Array<[string, string[]]> = [
    ['confirmed', ['accepted:current', 'preparing:upcoming', 'onTheWay:upcoming', 'delivered:upcoming']],
    ['in_fulfillment', ['accepted:done', 'preparing:current', 'onTheWay:upcoming', 'delivered:upcoming']],
    ['out_for_delivery', ['accepted:done', 'preparing:done', 'onTheWay:current', 'delivered:upcoming']],
    ['delivered', ['accepted:done', 'preparing:done', 'onTheWay:done', 'delivered:done']],
    ['completed', ['accepted:done', 'preparing:done', 'onTheWay:done', 'delivered:done']],
  ];
  it.each(rows)('%s', (status, expected) => {
    expect(states({ status })).toEqual(expected);
  });
});

describe('stage table, pickup', () => {
  const pickup = { fulfillment: 'pickup' };
  it('has no on-the-way step and no courier or arrival time even if the server sent one', () => {
    const v = view({ ...pickup, status: 'out_for_delivery', delivery: { courier_name: 'Test courier', courier_eta: '2026-10-06T13:30:00Z' } });
    expect(v.steps.map((s) => s.id)).toEqual(['accepted', 'preparing', 'ready', 'collected']);
    expect(v.eta).toBeNull();
  });
  it('preparing until an allocation is ready_for_pickup, then ready', () => {
    expect(states({ ...pickup, status: 'in_fulfillment' })).toEqual(['accepted:done', 'preparing:current', 'ready:upcoming', 'collected:upcoming']);
    expect(states({ ...pickup, status: 'in_fulfillment', allocations_detail: [{ status: 'ready_for_pickup' }] })).toEqual(['accepted:done', 'preparing:done', 'ready:current', 'collected:upcoming']);
  });
  it('delivered is collected', () => {
    expect(states({ ...pickup, status: 'delivered' }).at(-1)).toBe('collected:done');
  });
});

describe('cancelled, failed and unknown statuses', () => {
  it('cancelled: flagged, no step is current or done, no eta', () => {
    const v = view({ status: 'cancelled', delivery: { courier_eta: '2026-10-06T13:30:00Z' } });
    expect(v.cancelled).toBe(true);
    expect(v.steps.every((s) => s.state === 'upcoming')).toBe(true);
    expect(v.eta).toBeNull();
    expect(v.notStarted).toBe(false);
  });
  it('a status the client does not know (a failed delivery) shows no progress, no eta, and the neutral status word', () => {
    const v = view({ status: 'delivery_failed', delivery: { courier_name: 'Test courier', courier_eta: '2026-10-06T13:30:00Z' } });
    expect(v.done).toBe(false);
    expect(v.cancelled).toBe(false);
    expect(v.steps.every((s) => s.state === 'upcoming' && s.at === null)).toBe(true);
    expect(v.eta).toBeNull();
    expect(statusLook('pharmacy', 'delivery_failed')).toBe(statusLook('pharmacy', 'no-such-status'));
  });
  it('effective_status wins over status', () => {
    expect(states({ status: 'confirmed', effective_status: 'out_for_delivery' })[2]).toBe('onTheWay:current');
  });
});

describe('missing or malformed fields draw nothing', () => {
  const moving = { status: 'out_for_delivery' };
  it('no delivery object: no courier, no eta', () => {
    const v = view(moving);
    expect(v.courier).toBeNull();
    expect(v.eta).toBeNull();
  });
  it('courier name only: shown without a phone; blank name: no courier', () => {
    expect(view({ ...moving, delivery: { courier_name: 'Test courier' } }).courier).toEqual({ name: 'Test courier', phone: null });
    expect(view({ ...moving, delivery: { courier_name: '   ', courier_phone: '+966500000000' } }).courier).toBeNull();
  });
  it('a too short phone gives no call number', () => {
    expect(view({ ...moving, delivery: { courier_name: 'T', courier_phone: '123' } }).courier?.phone).toBeNull();
  });
  it('an unreadable eta is dropped, a valid one kept', () => {
    expect(view({ ...moving, delivery: { courier_name: 'T', courier_eta: 'soon' } }).eta).toBeNull();
    expect(view({ ...moving, delivery: { courier_name: 'T', courier_eta: '2026-10-06T13:30:00Z' } }).eta).toBe(Date.parse('2026-10-06T13:30:00Z'));
  });
  it('a step has no time when the timeline is missing or malformed', () => {
    expect(view({ ...moving, timeline: undefined }).steps.every((s) => s.at === null)).toBe(true);
    expect(view({ ...moving, timeline: [null, 'x', { ts: 'bad', event: 'fulfillment_started' }] }).steps.every((s) => s.at === null)).toBe(true);
  });
  it('not an order: null', () => {
    expect(readTracking(null)).toBeNull();
    expect(readTracking({})).toBeNull();
  });
});

describe('legacy tracking', () => {
  const legacy = (delivery: unknown) => readLegacyTracking({ order_id: 'o1', state: 'OUT_FOR_DELIVERY', delivery });
  it('minutes only when a positive number', () => {
    expect(legacy({ eta_minutes: 12.4 })?.etaMinutes).toBe(12);
    expect(legacy({ eta_minutes: 0 })?.etaMinutes).toBeNull();
    expect(legacy({ eta_minutes: -3 })?.etaMinutes).toBeNull();
    expect(legacy({ eta_minutes: '12' })?.etaMinutes).toBeNull();
    expect(legacy(undefined)?.courier).toBeNull();
  });
  it('without an id or a state it is not tracking', () => {
    expect(readLegacyTracking({ state: 'NEW' })).toBeNull();
    expect(readLegacyTracking({ order_id: 'o1' })).toBeNull();
  });
});
