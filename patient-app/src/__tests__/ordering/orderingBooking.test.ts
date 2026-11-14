import {
  createRadiologyBookings, submitBookings,
  asapAllowed, bookingErrorKey, buildBookingBody, clearDraft, eligibleOrders, getDraft, groupsMissingPick, groupsMissingTime, nextDays,
  parseAsap, parseCreated, parseWindows, paymentMethodsFor, setPick, setTime, startDraft, windowsByDay,
} from '../../utils/orderingBooking';
import { parseQuote } from '../../utils/ordering';
import { bookingHref } from '../../utils/orderingStatus';

const mockApi = jest.fn();
jest.mock('../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApi(...a), BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', newIdempotencyKey: jest.fn(() => 'k') }));

const row = (id: string, total: number) => ({ provider_id: id, name_ar: 'a', name_en: 'e', total, distance_km: 3, rating: 4, in_network: true, earliest_at: null, turnaround_hours: 24 });
const rawQuote = (modes: Array<'home' | 'facility'>) => ({
  quote_id: 'oq_1', expires_at: '2026-10-22T12:00:00Z', estimate: true,
  groups: modes.map((m) => ({ mode: m, items: [{ catalog_id: m === 'home' ? 'a' : 'c' }], from_price: { total: 100, providers_count: 1 },
    best_match: { ...row(`${m}-best`, 100), items: [{ catalog_id: 'a', price: 75, coverage: 'covered' }], estimated_insurance_share: 40, patient_share: 60 },
    compare: [row(`${m}-best`, 100), row(`${m}-other`, 120)], split_suggestion: null, empty: null })),
  from_price: null,
});
const mk = (modes: Array<'home' | 'facility'>) => startDraft({ kind: 'lab', payer: 'insurance', quote: parseQuote(rawQuote(modes))!, lat: 24.7, lng: 46.7, placeLine: 'home' });

beforeEach(() => clearDraft());

describe('windows', () => {
  it('parses home windows with the ASAP entry', () => {
    const a = parseWindows({ windows: [{ asap: true }, { start: '2026-10-23T05:00:00.000Z', end: '2026-10-23T07:00:00.000Z' }, { start: 1 }] });
    expect(a).toEqual({ kind: 'home', asapOffered: true, windows: [{ start: '2026-10-23T05:00:00.000Z', end: '2026-10-23T07:00:00.000Z' }] });
  });
  it('parses walk-in and slots, rejects the rest', () => {
    expect(parseWindows({ walk_in: true, qr: true })).toEqual({ kind: 'walk_in', qr: true });
    expect(parseWindows({ date: '2026-10-23', slots: [{ id: 's1', start: 'a', end: 'b' }, { id: 2 }] })).toEqual({ kind: 'slots', date: '2026-10-23', slots: [{ id: 's1', start: 'a', end: 'b' }] });
    expect(parseWindows({})).toBeNull();
    expect(parseWindows(null)).toBeNull();
  });
  it('groups windows by local day and lists days', () => {
    const d1 = new Date(2026, 9, 23, 8).toISOString(); const d1e = new Date(2026, 9, 23, 10).toISOString(); const d2 = new Date(2026, 9, 24, 8).toISOString();
    const g = windowsByDay([{ start: d1, end: d1e }, { start: d2, end: d2 }]);
    expect(g.map((x) => x.day)).toEqual(['2026-10-23', '2026-10-24']);
    expect(nextDays(new Date(2026, 9, 22), 3).map((x) => x.iso)).toEqual(['2026-10-22', '2026-10-23', '2026-10-24']);
  });
});

describe('asap', () => {
  it('parses the stage timer and the fallback', () => {
    expect(parseAsap({ id: 'ab_1', status: 'broadcasting', stage: 2, radius_km: 5, seconds_left: 80 })).toMatchObject({ stage: 2, radius_km: 5, seconds_left: 80, booking_id: null, fallback: null });
    const e = parseAsap({ id: 'ab_1', status: 'expired', stage: 3, radius_km: 8, seconds_left: 0, fallback: { earliest_window: { provider_id: 'p', start: 's', end: 'e' } } });
    expect(e?.fallback).toEqual({ provider_id: 'p', start: 's', end: 'e' });
    expect(parseAsap({ id: 'x', status: 'weird' })).toBeNull();
    expect(parseAsap({ id: 'ab', status: 'accepted', booking_id: 'b1', seconds_left: -4 })).toMatchObject({ booking_id: 'b1', seconds_left: 0 });
  });
  it('is allowed only for a home-only quote', () => {
    expect(asapAllowed(mk(['home']))).toBe(true);
    clearDraft();
    expect(asapAllowed(mk(['home', 'facility']))).toBe(false);
  });
});

describe('draft and booking body', () => {
  it('keeps picks for the same quote, tracks what is missing', () => {
    const d = mk(['home', 'facility']);
    expect(groupsMissingPick(d)).toEqual(['home', 'facility']);
    setPick(d.quote.groups[0], d.quote.groups[0].compare[1]);
    expect(getDraft()?.picks.home?.best).toBe(false);
    expect(getDraft()?.picks.home?.insuranceShare).toBeNull();
    setPick(d.quote.groups[1], d.quote.groups[1].compare[0]);
    expect(getDraft()?.picks.facility).toMatchObject({ best: true, insuranceShare: 40, patientShare: 60 });
    expect(groupsMissingTime(getDraft()!)).toEqual(['home', 'facility']);
    setTime('home', { type: 'window', start: 's', end: 'e' });
    setTime('facility', { type: 'walk_in' });
    expect(groupsMissingTime(getDraft()!)).toEqual([]);
    mk(['home', 'facility']);
    expect(getDraft()?.picks.home).toBeDefined();
    startDraft({ ...getDraft()!, quote: { ...getDraft()!.quote, quote_id: 'oq_2' } });
    expect(getDraft()?.picks).toEqual({});
  });
  it('picking another provider drops its time', () => {
    const d = mk(['home']);
    setPick(d.quote.groups[0], d.quote.groups[0].compare[0]);
    setTime('home', { type: 'window', start: 's', end: 'e' });
    setPick(d.quote.groups[0], d.quote.groups[0].compare[1]);
    expect(getDraft()?.times.home).toBeUndefined();
  });
  it('builds the body from ids and picks only', () => {
    const d = mk(['home', 'facility']);
    setPick(d.quote.groups[0], d.quote.groups[0].compare[0]);
    setPick(d.quote.groups[1], d.quote.groups[1].compare[1]);
    setTime('home', { type: 'window', start: 's', end: 'e' });
    setTime('facility', { type: 'slot', id: '2026-10-23T09:00', start: 'a', end: 'b' });
    const body = buildBookingBody(getDraft()!, { paymentMethod: 'insurance', genderPreference: 'female', medicalOrderId: 'mo1', documents: [{ kind: 'doctor_request', url_or_b64: 'x' }] });
    expect(body).toEqual({
      quote_id: 'oq_1',
      selections: { home: { provider_id: 'home-best', window: { start: 's', end: 'e' } }, facility: { provider_id: 'facility-other', slot_id: '2026-10-23T09:00' } },
      payment_method: 'insurance', gender_preference: 'female', medical_order_id: 'mo1',
    });
    expect(JSON.stringify(body)).not.toMatch(/price|total|amount/);
  });
  it('sends documents without an order, and no gender for a centre-only basket', () => {
    const d = mk(['facility']);
    setPick(d.quote.groups[0], d.quote.groups[0].compare[0]);
    setTime('facility', { type: 'walk_in' });
    const body = buildBookingBody(getDraft()!, { paymentMethod: 'insurance', genderPreference: 'male', medicalOrderId: null, documents: [{ kind: 'doctor_request', url_or_b64: 'x' }] });
    expect(body).toMatchObject({ selections: { facility: { provider_id: 'facility-best', walk_in: true } }, documents: [{ kind: 'doctor_request', url_or_b64: 'x' }] });
    expect(body).not.toHaveProperty('gender_preference');
  });
  it('refuses a body without a time', () => {
    const d = mk(['home']);
    setPick(d.quote.groups[0], d.quote.groups[0].compare[0]);
    expect(() => buildBookingBody(getDraft()!, { paymentMethod: 'card', genderPreference: null, medicalOrderId: null, documents: [] })).toThrow('selection_required');
  });
});

describe('methods and orders', () => {
  it('limits the payment methods like the server', () => {
    const home = parseQuote(rawQuote(['home']))!.groups; const centre = parseQuote(rawQuote(['facility']))!.groups;
    expect(paymentMethodsFor('insurance', home)).toEqual(['insurance']);
    expect(paymentMethodsFor('cash', home)).toEqual(['card']);
    expect(paymentMethodsFor('cash', centre)).toEqual(['card', 'cash']);
  });
  it('lists only valid orders that cover every item', () => {
    const o = (id: string, valid: string, expired: boolean, ids: string[]) => ({ id, valid_until: valid, expired, expires_soon: false, notes: null, prescription_id: null, groups: {}, items: ids.map((c, i) => ({ id: `${id}${i}`, group: 'labs' as const, catalog_id: c, status: 'open' as const })) });
    const now = Date.parse('2026-10-22T00:00:00Z');
    const list = eligibleOrders([o('ok', '2026-11-01T00:00:00Z', false, ['a', 'b']), o('old', '2026-10-01T00:00:00Z', false, ['a']), o('flag', '2026-11-01T00:00:00Z', true, ['a']), o('part', '2026-11-01T00:00:00Z', false, ['a'])], ['a', 'b'], now);
    expect(list.map((x) => x.id)).toEqual(['ok']);
  });
});

describe('created group and errors', () => {
  it('parses the server answer, keeps server totals', () => {
    const c = parseCreated({ order_group_id: 'og_1', bookings: [{ id: 'b1', mode: 'home', status: 'awaiting_approval', total: 165, items: [{ catalog_id: 'a', price: 140, coverage: 'needs_approval' }] }, { id: 'b2', mode: 'x', total: 1 }], payment: { amount: 165, status: 'pending' } });
    expect(c).toEqual({ order_group_id: 'og_1', amount: 165, paymentStatus: 'pending', bookings: [{ id: 'b1', kind: 'lab', mode: 'home', status: 'awaiting_approval', total: 165, items: [{ catalog_id: 'a', price: 140, coverage: 'needs_approval' }] }] });
    expect(parseCreated({ order_group_id: 'og_1', bookings: [] })).toBeNull();
    expect(parseCreated({})).toBeNull();
  });
  it('maps stable codes to keys', () => {
    expect(bookingErrorKey(new Error('{"message":"quote_already_booked"}'))).toBe('ordering.err.quoteBooked');
    expect(bookingErrorKey(new Error('window_not_offered'))).toBe('ordering.err.windowGone');
    expect(bookingErrorKey(new Error('medical_order_required'))).toBe('ordering.err.orderRequired');
    expect(bookingErrorKey(new Error('asap_open'))).toBe('ordering.err.asapOpen');
    expect(bookingErrorKey('boom')).toBe('ordering.err.generic');
  });
});

describe('radiology baskets are booked on the radiology route', () => {
  const radiologyDraft = (modes: Array<'home' | 'facility'>) => {
    startDraft({ kind: 'radiology', payer: 'cash', quote: parseQuote({ ...rawQuote(modes), groups: rawQuote(modes).groups.map((g) => ({ ...g, items: [{ catalog_id: 'scan-a' }, { catalog_id: 'scan-b' }] })) })!, lat: 24.7, lng: 46.7, placeLine: null });
    for (const g of getDraft()!.quote.groups) setPick(g, g.compare[0]);
    setTime('home', { type: 'window', start: '2030-01-02T08:00:00.000Z', end: '2030-01-02T10:00:00.000Z' });
    return setTime('facility', { type: 'slot', id: 's1', start: '2030-01-03T09:00:00.000Z', end: '2030-01-03T09:30:00.000Z' })!;
  };
  const choices = { paymentMethod: 'card' as const, genderPreference: null, medicalOrderId: null, documents: [] };
  beforeEach(() => { mockApi.mockReset(); mockApi.mockImplementation(async (_p: string, init: { body: string }) => ({ id: `rb-${JSON.parse(init.body).service_id}`, total_price: 200 })); });

  it('makes one radiology booking per scan with the provider the quote named, the chosen time and place, and never touches /ordering', async () => {
    const d = radiologyDraft(['facility', 'home']);
    const made = await createRadiologyBookings(d, choices);
    const sent = mockApi.mock.calls.map(([path, init]) => ({ path, body: JSON.parse(init.body) }));
    expect(sent.every((s) => s.path === '/radiology/bookings')).toBe(true);
    expect(sent.map((s) => s.body)).toEqual(expect.arrayContaining([
      expect.objectContaining({ service_id: 'scan-a', provider_id: 'facility-best', location_type: 'facility', scheduled_at: '2030-01-03T09:00:00.000Z', payment_method: 'card' }),
      expect.objectContaining({ service_id: 'scan-b', provider_id: 'home-best', location_type: 'home', scheduled_at: '2030-01-02T08:00:00.000Z' }),
    ]));
    expect(made.bookings).toHaveLength(4);
    expect(made.bookings.every((b) => b.kind === 'radiology' && b.status === 'pending' && b.total === 200)).toBe(true);
    expect(made.amount).toBe(800);
  });

  it('submitBookings sends a radiology draft to the radiology route and a lab draft to the ordering route', async () => {
    mockApi.mockImplementation(async (path: string, init: { body: string }) => (path === '/ordering/bookings' ? { order_group_id: 'og', bookings: [{ id: 'b', mode: 'facility', total: 10, items: [] }] } : { id: 'rb', total_price: 10, __b: init.body }));
    await submitBookings(radiologyDraft(['facility']), choices);
    expect(mockApi.mock.calls.every(([p]) => p === '/radiology/bookings')).toBe(true);
    mockApi.mockClear();
    clearDraft();
    mk(['facility']);
    setPick(getDraft()!.quote.groups[0], getDraft()!.quote.groups[0].compare[0]);
    const lab = setTime('facility', { type: 'walk_in' })!;
    await submitBookings(lab, choices);
    expect(mockApi.mock.calls[0][0]).toBe('/ordering/bookings');
  });

  it('an insured radiology booking waits for the centre\'s decision; a home booking sends the doctor\'s request along', async () => {
    const made = await createRadiologyBookings(radiologyDraft(['facility']), { ...choices, paymentMethod: 'insurance', documents: [{ kind: 'doctor_request', url_or_b64: 'data:x', filename: 'r.jpg' }] });
    expect(made.bookings.every((b) => b.status === 'awaiting_approval')).toBe(true);
    expect(JSON.parse(mockApi.mock.calls[0][1].body).documents).toEqual([{ kind: 'doctor_request', url_or_b64: 'data:x', filename: 'r.jpg' }]);
  });

  it('refuses a draft with a missing pick or time, and an answer without an id', async () => {
    const d = radiologyDraft(['facility']);
    d.times.facility = undefined;
    await expect(createRadiologyBookings(d, choices)).rejects.toThrow('selection_required');
    mockApi.mockResolvedValue({});
    await expect(createRadiologyBookings(radiologyDraft(['facility']), choices)).rejects.toThrow('invalid_booking');
  });

  it('the radiology route\'s own codes read in the localized words, and a radiology booking is followed on its order page', () => {
    expect(bookingErrorKey(new Error('provider_cannot_perform_scan'))).toBe('ordering.err.providerGone');
    expect(bookingErrorKey(new Error('slot_expired'))).toBe('ordering.err.windowGone');
    expect(bookingErrorKey(new Error('payment_method_cash_not_allowed_for_home_visit'))).toBe('ordering.err.cashHome');
    expect(bookingErrorKey(new Error('insurance_home_requires_doctor_request_or_preauth'))).toBe('ordering.err.orderRequired');
    expect(bookingHref({ id: 'rb-1', kind: 'radiology' }, [{ id: 'rb-1' }])).toBe('/diagnostics/order/rb-1');
    expect(bookingHref({ id: 'b-1', kind: 'lab' }, [{ id: 'b-1' }, { id: 'b-2' }])).toBe('/diagnostics/booking-status?id=b-1&group=b-2');
  });
});
