import {
  allocationLines,
  defaultCoverage,
  errorMeansStale,
  idemKey,
  lowestPriceIds,
  mayHaveReachedServer,
  offerErrorKey,
  offerName,
  pharmacyDisplayName,
  offerPhase,
  orderIdParam,
  parseOffer,
  parseOffers,
  parseOrder,
  postSelectionRoute,
  quoteView,
  secondsLeft,
  selectionKey,
  sortOffers,
} from './pharmacyOffers';

/**
 * Batch 1c: the offers and the final quote are read from what the server sends. These tests use values shaped like the
 * backend's `patientDtoAsync` (pharmacy-offer.service.ts) and `governedView` (pharmacy-order.service.ts); the numbers
 * are TEST values.
 */

const offer = (over: Record<string, unknown> = {}) => ({
  id: 'o1',
  status: 'open',
  pharmacy_name_ar: 'صيدلية اختبار',
  pharmacy_name_en: 'Test pharmacy',
  approx_distance_km: 2.5,
  preparation_minutes: 25,
  expires_at: '2026-10-05T10:10:00.000Z',
  insurance_ready: true,
  totals: { subtotal: 80, delivery_fee: 10, total: 90, currency: 'SAR' },
  lines: [
    { order_item_id: 'a', name: 'Item A', available: true, offered_qty: 2, unit_price: 20 },
    { order_item_id: 'b', name: 'Item B', available: true, offered_qty: 1, unit_price: 40, alternative: 'Item B2' },
  ],
  provider_note: 'Ready at the counter',
  ...over,
});

describe('parseOffers', () => {
  it('reads a bare array and a { data } wrapper', () => {
    expect(parseOffers([offer()])).toHaveLength(1);
    expect(parseOffers({ data: [offer(), offer({ id: 'o2' })] })).toHaveLength(2);
    expect(parseOffers(null)).toEqual([]);
    expect(parseOffers({})).toEqual([]);
  });

  it('keeps the server numbers as they are and nothing else', () => {
    const [o] = parseOffers([offer()]);
    expect(o.totals).toEqual({ subtotal: 80, deliveryFee: 10, total: 90, currency: 'SAR' });
    expect(o.distanceKm).toBe(2.5);
    expect(o.prepMinutes).toBe(25);
    expect(o.expiresAt).toBe(Date.parse('2026-10-05T10:10:00.000Z'));
    expect(o.allAvailable).toBe(true);
    expect(o.availableCount).toBe(2);
    expect(o.lines[1].alternative).toBe('Item B2');
    expect(o.note).toBe('Ready at the counter');
  });

  it('does not invent a number the server did not send', () => {
    const [o] = parseOffers([offer({ totals: { total: null, delivery_fee: '' }, approx_distance_km: null, preparation_minutes: undefined, expires_at: 'not a date', lines: undefined })]);
    expect(o.totals.total).toBeNull();
    expect(o.totals.deliveryFee).toBeNull();
    expect(o.totals.subtotal).toBeNull();
    expect(o.distanceKm).toBeNull();
    expect(o.prepMinutes).toBeNull();
    expect(o.expiresAt).toBeNull();
    expect(o.lines).toEqual([]);
    expect(o.allAvailable).toBe(false);
  });

  it('a partly available offer is not "all available"', () => {
    const [o] = parseOffers([offer({ lines: [{ order_item_id: 'a', name: 'A', available: true }, { order_item_id: 'b', name: 'B', available: false }] })]);
    expect(o.allAvailable).toBe(false);
    expect(o.availableCount).toBe(1);
  });

  it('drops a row without an id', () => {
    expect(parseOffers([{ totals: { total: 5 } }, offer()])).toHaveLength(1);
  });

  it('insurance is ready unless the server says otherwise', () => {
    expect(parseOffers([offer({ insurance_ready: false })])[0].insuranceReady).toBe(false);
    expect(parseOffers([offer({ insurance_ready: undefined })])[0].insuranceReady).toBe(true);
  });

  it('a submitted-looking status other than open is not selectable', () => {
    expect(parseOffers([offer({ status: 'selected' })])[0].open).toBe(false);
  });
});

describe('names, sorting, the lowest price, expiry', () => {
  const list = parseOffers([
    offer({ id: 'a', totals: { total: 90 }, approx_distance_km: 5, preparation_minutes: 20 }),
    offer({ id: 'b', totals: { total: 70 }, approx_distance_km: null, preparation_minutes: 40 }),
    offer({ id: 'c', totals: { total: 70 }, approx_distance_km: 1, preparation_minutes: null }),
  ]);

  it('the pharmacy name follows the reader language, falls back to the other one, else null', () => {
    const [o] = parseOffers([offer()]);
    expect(offerName(o, 'ar')).toBe('صيدلية اختبار');
    expect(offerName(o, 'en')).toBe('Test pharmacy');
    const [onlyEn] = parseOffers([offer({ pharmacy_name_ar: null })]);
    expect(offerName(onlyEn, 'ar')).toBe('Test pharmacy');
    const [none] = parseOffers([offer({ pharmacy_name_ar: null, pharmacy_name_en: null })]);
    expect(offerName(none, 'en')).toBeNull();
  });

  it('the pharmacy name is Arabic for ar and English for every other language; no names, no line', () => {
    const names = { ar: 'صيدلية النور', en: 'Al Noor' };
    expect(pharmacyDisplayName(names, 'ar')).toBe('صيدلية النور');
    for (const lang of ['en', 'ur', 'hi', 'bn', 'tl']) expect(pharmacyDisplayName(names, lang)).toBe('Al Noor');
    expect(pharmacyDisplayName({ ar: 'صيدلية النور', en: null }, 'ur')).toBe('صيدلية النور');
    expect(pharmacyDisplayName(null, 'en')).toBeNull();
  });

  it('sorts by the server number; an offer without it goes last; the input is not changed', () => {
    expect(sortOffers(list, 'price').map((o) => o.id)).toEqual(['b', 'c', 'a']);
    expect(sortOffers(list, 'nearest').map((o) => o.id)).toEqual(['c', 'a', 'b']);
    expect(sortOffers(list, 'fastest').map((o) => o.id)).toEqual(['a', 'b', 'c']);
    expect(list.map((o) => o.id)).toEqual(['a', 'b', 'c']);
  });

  it('marks the cheapest only when there is something to compare, and ties both', () => {
    expect([...lowestPriceIds(list)].sort()).toEqual(['b', 'c']);
    expect(lowestPriceIds(list.slice(0, 1)).size).toBe(0);
  });

  it('counts the seconds to the server expiry, never below 0, null without an expiry', () => {
    const [o] = parseOffers([offer({ expires_at: '2026-10-05T10:00:30.000Z' })]);
    const t0 = Date.parse('2026-10-05T10:00:00.000Z');
    expect(secondsLeft(o, t0)).toBe(30);
    expect(secondsLeft(o, t0 + 29_500)).toBe(1);
    expect(secondsLeft(o, t0 + 31_000)).toBe(0);
    expect(secondsLeft(parseOffers([offer({ expires_at: undefined })])[0], t0)).toBeNull();
  });
});

describe('order state', () => {
  const order = (over: Record<string, unknown> = {}) => parseOrder({ id: 'x', status: 'broadcasting', ...over });

  it('phases come from the order status and the selected offer', () => {
    expect(offerPhase(null)).toBe('searching');
    expect(offerPhase(order())).toBe('searching');
    expect(offerPhase(order({ status: 'awaiting_full_acceptance' }))).toBe('searching');
    expect(offerPhase(order({ status: 'offer_selection_pending' }))).toBe('searching');
    expect(offerPhase(order({ status: 'draft' }))).toBe('draft');
    expect(offerPhase(order({ status: 'manual_review' }))).toBe('review');
    expect(offerPhase(order({ status: 'cancelled' }))).toBe('cancelled');
    expect(offerPhase(order({ selected_offer_id: 'o1' }))).toBe('selected');
    expect(offerPhase(order({ status: 'cash_card_payment_pending' }))).toBe('selected');
    expect(offerPhase(order({ status: 'delivered' }))).toBe('selected');
  });

  it('reads the order from a bare object or { data }', () => {
    expect(parseOrder({ data: { status: 'draft' } })?.status).toBe('draft');
    expect(parseOrder({})).toBeNull();
    expect(parseOrder(null)).toBeNull();
  });

  it('continues a chosen order where the order list and confirmation send it', () => {
    expect(postSelectionRoute(order({ governed_state: 'OFFER_SELECTED' }))).toBe('/pharmacy/final-quote');
    expect(postSelectionRoute(order({ governed_state: 'COD_REGISTERED' }))).toBe('/pharmacy/final-quote');
    expect(postSelectionRoute(order({ governed_state: 'INSURANCE_PROCESSING' }))).toBe('/pharmacy/insurance-decision');
    expect(postSelectionRoute(order({ governed_state: 'CONFIRMED' }))).toBe('/pharmacy/order-tracking');
    expect(postSelectionRoute(null)).toBe('/pharmacy/order-tracking');
  });

  it('the default coverage is the order own payment mode', () => {
    expect(defaultCoverage(order({ payment_mode: 'insurance' }))).toBe('insurance');
    expect(defaultCoverage(order({ payment_method: 'insurance' }))).toBe('insurance');
    expect(defaultCoverage(order({ payment_mode: 'cash' }))).toBe('cash');
    expect(defaultCoverage(null)).toBe('cash');
  });

  it('the order id comes from orderId, or requestId from an older link, first value of an array', () => {
    expect(orderIdParam({ orderId: 'a' })).toBe('a');
    expect(orderIdParam({ requestId: 'b' })).toBe('b');
    expect(orderIdParam({ orderId: ['c', 'd'] })).toBe('c');
    expect(orderIdParam({ orderId: 'a', requestId: 'b' })).toBe('a');
    expect(orderIdParam({})).toBeUndefined();
    expect(orderIdParam({ orderId: '' })).toBeUndefined();
  });
});

describe('errors and keys', () => {
  it('maps the server codes of the offers flow to sentences, never to the raw text', () => {
    expect(offerErrorKey(new Error('offer_not_selectable'))).toBe('pharmacy.offers.err.unavailable');
    expect(offerErrorKey(new Error('another_offer_already_selected'))).toBe('pharmacy.offers.err.unavailable');
    expect(offerErrorKey(new Error('offer_stock_changed_requote_required'))).toBe('pharmacy.offers.err.stock');
    expect(offerErrorKey(new Error('prescription_required_for_insurance_orders'))).toBe('pharmacy.offers.err.rxInsurance');
    expect(offerErrorKey(new Error('quote_hash_or_revision_mismatch'))).toBe('pharmacy.quote.err.changed');
    expect(offerErrorKey(new Error('insurance_orders_follow_insurance_decision_flow'))).toBe('pharmacy.quote.err.insurance');
    expect(offerErrorKey(new Error('cannot_cancel_in_delivered'))).toBe('pharmacy.offers.err.notActionable');
    expect(offerErrorKey(new Error('OFFLINE_ERROR'))).toBe('errors.offline');
    expect(offerErrorKey(new Error('AUTH_ERROR_401: Unauthorized'))).toBe('pharmacy.offers.err.session');
    expect(offerErrorKey(new Error('something we do not know'))).toBe('pharmacy.offers.err.generic');
    expect(offerErrorKey(new Error('something we do not know'), 'pharmacy.quote.err.accept')).toBe('pharmacy.quote.err.accept');
    expect(offerErrorKey(undefined)).toBe('pharmacy.offers.err.generic');
  });

  it('a stale list is read again after the codes that say the offer is gone', () => {
    expect(errorMeansStale(new Error('offer_not_selectable'))).toBe(true);
    expect(errorMeansStale(new Error('offer_stock_changed_requote_required'))).toBe(true);
    expect(errorMeansStale(new Error('invalid_coverage_mode'))).toBe(false);
  });

  it('only a request with no answer may have reached the server', () => {
    expect(mayHaveReachedServer(new Error('OFFLINE_ERROR'))).toBe(true);
    expect(mayHaveReachedServer(new Error('REQUEST_ABORTED'))).toBe(true);
    expect(mayHaveReachedServer(new Error('offer_not_selectable'))).toBe(false);
  });

  it('an idempotency key is accepted by the server pattern and is stable for the same parts', () => {
    const k = selectionKey('order-1', 'offer-1', 'cash', 'app-abc123');
    expect(k).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
    expect(selectionKey('order-1', 'offer-1', 'cash', 'app-abc123')).toBe(k);
    expect(selectionKey('order-1', 'offer-1', 'insurance', 'app-abc123')).not.toBe(k);
    expect(idemKey('x', ['a b', 'c/d'], 'n'.repeat(200)).length).toBeLessThanOrEqual(128);
  });
});

describe('final quote', () => {
  const snapshot = { offer_id: 'o1', offer_version: 3, totals: { subtotal: 80, delivery_fee: 10, total: 90, currency: 'SAR' }, hash: 'a'.repeat(64) };
  const base = { id: 'x', status: 'cash_card_payment_pending', coverage_mode: 'cash', selected_offer_snapshot: snapshot, selected_offer_hash: snapshot.hash, selected_offer_revision: 3 };

  it('a selected offer can be accepted with its own hash, revision and total', () => {
    const q = quoteView({ ...base, governed_state: 'OFFER_SELECTED' });
    expect(q?.kind).toBe('accept');
    expect(q?.hash).toBe(snapshot.hash);
    expect(q?.revision).toBe(3);
    expect(q?.totals.total).toBe(90);
  });

  it('a pending final quote is read from its own snapshot, hash and revision', () => {
    const pending = { totals: { total: 75, currency: 'SAR' }, hash: 'b'.repeat(64), offer_version: 4 };
    const q = quoteView({ ...base, governed_state: 'FINAL_QUOTE_READY', pending_final_quote_snapshot: pending, pending_final_quote_hash: pending.hash, pending_final_quote_revision: 4 });
    expect(q?.kind).toBe('accept');
    expect(q?.totals.total).toBe(75);
    expect(q?.hash).toBe('b'.repeat(64));
    expect(q?.revision).toBe(4);
  });

  it('there is nothing to accept without a hash, a revision or a total', () => {
    expect(quoteView({ ...base, governed_state: 'OFFER_SELECTED', selected_offer_hash: undefined })?.kind).toBe('none');
    expect(quoteView({ ...base, governed_state: 'OFFER_SELECTED', selected_offer_revision: undefined })?.kind).toBe('none');
    expect(quoteView({ ...base, governed_state: 'OFFER_SELECTED', selected_offer_snapshot: { totals: {} } })?.kind).toBe('none');
    expect(quoteView({ ...base, governed_state: 'OFFER_SELECTED', selected_offer_revision: 1.5 })?.kind).toBe('none');
  });

  it('accepted, cash on delivery registered, cancelled and other states', () => {
    const accepted = quoteView({ ...base, governed_state: 'FINAL_QUOTE_ACCEPTED', accepted_quote_snapshot: { ...snapshot, cod_allowed: true } });
    expect(accepted?.kind).toBe('accepted');
    expect(accepted?.codAllowed).toBe(true);
    expect(accepted?.cashCoverage).toBe(true);
    expect(quoteView({ ...base, governed_state: 'FINAL_QUOTE_ACCEPTED' })?.codAllowed).toBe(false);
    expect(quoteView({ ...base, governed_state: 'COD_REGISTERED', accepted_quote_snapshot: { ...snapshot, cod_allowed: true } })?.kind).toBe('cod');
    expect(quoteView({ ...base, governed_state: 'CANCELLED' })?.kind).toBe('cancelled');
    expect(quoteView({ ...base, governed_state: 'INSURANCE_PROCESSING' })?.kind).toBe('none');
    expect(quoteView({ ...base, governed_state: null })?.kind).toBe('none');
    expect(quoteView(null)).toBeNull();
  });

  it('the lines are the chosen allocation items as stored', () => {
    const lines = allocationLines(
      {
        allocations_detail: [
          { id: 'other', items: [{ order_item_id: 'z', name: 'Not this', qty_offered: 9, unit_price: 1, action: 'available' }] },
          { id: 'al1', items: [{ order_item_id: 'a', name: 'Item A', qty_offered: 2, unit_price: 20, action: 'available' }, { order_item_id: 'b', name: 'Item B', qty_offered: 0, unit_price: 5, action: 'unavailable' }, { order_item_id: 'c', name: 'Item C', qty_offered: 1, unit_price: 7, action: 'substitute' }] },
        ],
      },
      'al1',
    );
    expect(lines.map((l) => [l.name, l.qty, l.unitPrice, l.action])).toEqual([
      ['Item A', 2, 20, 'available'],
      ['Item B', 0, 5, 'unavailable'],
      ['Item C', 1, 7, 'substitute'],
    ]);
    expect(allocationLines({ allocations_detail: [] }, 'al1')).toEqual([]);
    expect(allocationLines({}, null)).toEqual([]);
  });
});

describe('issue 512: the countdown runs on the server clock', () => {
  it('moves the expiry onto this phone clock using server_time', () => {
    const realNow = Date.now;
    Date.now = () => Date.parse('2026-10-09T10:00:00.000Z'); // the phone is 5 minutes behind the server
    try {
      const offer = parseOffer({ id: 'o1', status: 'open', lines: [], expires_at: '2026-10-09T10:15:00.000Z', server_time: '2026-10-09T10:05:00.000Z' });
      // 10 minutes left on the server's clock, so 10 minutes from the phone's "now"
      expect(offer?.expiresAt).toBe(Date.parse('2026-10-09T10:10:00.000Z'));
      const noServerTime = parseOffer({ id: 'o2', status: 'open', lines: [], expires_at: '2026-10-09T10:15:00.000Z' });
      expect(noServerTime?.expiresAt).toBe(Date.parse('2026-10-09T10:15:00.000Z'));
    } finally {
      Date.now = realNow;
    }
  });
});
