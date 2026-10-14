import {
  acceptanceAlreadyRecorded,
  checkoutErrorKey,
  checkoutLines,
  insuranceErrorKey,
  noAnswerYet,
  orderRoute,
  payBlock,
  payErrorKey,
  paymentPhase,
  paymentView,
  readCapabilities,
  readIntent,
  readPayOrder,
  readPaymentResult,
  readResultParams,
} from './pharmacyCheckout';

const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const base = { id: 'order-0001', status: 'cash_card_payment_pending', governed_state: 'FINAL_QUOTE_ACCEPTED', accepted_quote_snapshot: snap, selected_offer_snapshot: snap };
const order = (extra: Record<string, unknown> = {}) => {
  const parsed = readPayOrder({ ...base, ...extra });
  if (!parsed) throw new Error('unreadable');
  return parsed;
};
const caps = (amount: unknown = 80, methods: string[] = ['card', 'apple-pay']) => readCapabilities({ booking_id: 'o', amount, currency: 'SAR', methods: methods.map((id) => ({ id, kind: 'online' })) });

describe('checkoutLines', () => {
  const rx = [{ id: 'm1', sku: 'm1', name: 'Panadol 500', qty: 1, intake_source: 'prescription' }];
  it('keeps the cart lines that are not in the prescription and counts the ones that are', () => {
    const r = checkoutLines(rx, [
      { id: 'm1', name: 'anything', qty: 2 },
      { id: 'c2', name: '  panadol   500 ', qty: 1 },
      { id: 'c3', name: 'Vitamin C', qty: 3 },
    ]);
    expect(r.cart.map((l) => l.id)).toEqual(['c3']);
    expect(r.duplicates).toBe(2);
    expect(r.all.map((l) => l.name)).toEqual(['Panadol 500', 'Vitamin C']);
    expect(r.cart[0]).toMatchObject({ qty: 3, sku: 'c3', intake_source: 'cart' });
  });
  it('with no prescription the whole cart is sent (the old screen dropped it when a prescription was chosen)', () => {
    expect(checkoutLines([], [{ id: 'a', name: 'A', qty: 1 }, { id: 'b', name: 'B', qty: 2 }]).all).toHaveLength(2);
  });
});

describe('errors and idempotency', () => {
  it('a missing answer keeps the key, a server answer replaces it', () => {
    expect(noAnswerYet(new Error('OFFLINE_ERROR'))).toBe(true);
    expect(noAnswerYet(new Error('REQUEST_ABORTED'))).toBe(true);
    expect(noAnswerYet(new Error('idempotency_request_in_progress'))).toBe(true);
    expect(noAnswerYet(new Error('booking_already_paid'))).toBe(false);
    expect(noAnswerYet(new Error('Internal server error'))).toBe(false);
  });
  it('maps server codes to translation keys and never to the raw text', () => {
    expect(payErrorKey(new Error('booking_already_paid'))).toBe('pharmacy.pay.err.alreadyPaid');
    expect(payErrorKey(new Error('{"code":"payment_gateway_unavailable","message":"الدفع غير متاح حالياً"}'))).toBe('pharmacy.pay.err.gateway');
    expect(payErrorKey(new Error('copay_acceptance_required'))).toBe('pharmacy.pay.err.notPayable');
    expect(payErrorKey(new Error('OFFLINE_ERROR'))).toBe('errors.offline');
    expect(payErrorKey(new Error('secret gateway text pk_live_123'))).toBe('pharmacy.pay.err.generic');
    expect(checkoutErrorKey(new Error('AUTH_ERROR_403: Insufficient role'))).toBe('pharmacy.checkout.err.signIn');
    expect(checkoutErrorKey(new Error('items_required'))).toBe('pharmacy.checkout.err.items');
    expect(checkoutErrorKey(new Error('boom'))).toBe('pharmacy.checkout.err.send');
    expect(insuranceErrorKey(new Error('insurance_acceptance_conflict'))).toBe('pharmacy.ins.err.state');
    expect(insuranceErrorKey(new Error('weird'))).toBe('pharmacy.ins.err.accept');
    expect(acceptanceAlreadyRecorded(new Error('insurance_acceptance_already_recorded'))).toBe(true);
  });
});

describe('payment view (decided by the server flags)', () => {
  it('an order the server says is paid is paid, whatever the capabilities say', () => {
    expect(paymentView(order({ payment_status: 'paid' }), caps(), null)).toEqual({ kind: 'paid' });
  });
  it('payable only with a positive server amount and an advertised method; the amount is the capabilities one', () => {
    expect(paymentView(order(), caps(30), null)).toEqual({ kind: 'payable', amount: 30, currency: 'SAR', methods: ['card', 'apple-pay'] });
    expect(paymentView(order(), caps(80, []), null)).toMatchObject({ kind: 'noMethods', amount: 80 });
    expect(paymentView(order(), caps(0), null)).toEqual({ kind: 'blocked', reason: 'other' });
    expect(paymentView(order(), caps('80'), null)).toMatchObject({ kind: 'payable', amount: 80 });
    expect(paymentView(order(), null, null)).toEqual({ kind: 'blocked', reason: 'other' });
  });
  it('a refusal code of the server becomes its own state', () => {
    expect(payBlock(new Error('final_quote_acceptance_required'))).toBe('acceptQuote');
    expect(payBlock(new Error('copay_acceptance_required'))).toBe('insurance');
    expect(payBlock(new Error('insurance_rejected_acceptance_required'))).toBe('insurance');
    expect(payBlock(new Error('selected_quote_required'))).toBe('noSelection');
    expect(payBlock(new Error('cod_orders_do_not_require_online_payment'))).toBe('cod');
    expect(payBlock(new Error('Internal server error'))).toBe('other');
    expect(paymentView(order({ governed_state: 'OFFER_SELECTED' }), null, 'acceptQuote')).toEqual({ kind: 'blocked', reason: 'acceptQuote' });
    expect(paymentView(order(), null, 'cod')).toEqual({ kind: 'cod' });
  });
  it('cod, cancelled and covered orders are never payable', () => {
    expect(paymentView(order({ governed_state: 'COD_REGISTERED' }), caps(), null)).toEqual({ kind: 'cod' });
    expect(paymentView(order({ governed_state: 'CANCELLED', status: 'cancelled' }), caps(), null)).toEqual({ kind: 'cancelled' });
    expect(paymentView(order({ payment_status: 'covered_by_insurance' }), null, null)).toEqual({ kind: 'covered' });
  });
  it('reads the capabilities methods and drops the ones the app cannot start', () => {
    expect(readCapabilities({ amount: 5, methods: [{ id: 'card' }, { id: 'bitcoin' }, { id: 'google-pay' }] })?.methods).toEqual(['card', 'google-pay']);
  });
});

describe('insurance reading', () => {
  const ins = {
    payment_method: 'insurance',
    items: [{ id: 'i1', raw_name: 'Item one' }],
    insurance_decision: { outcome: 'partial', patient_acceptance: { kind: 'co-pay' } },
    insurance_decision_summary: { decision: 'APPROVED_PARTIAL', co_pay_amount: 30, insurer_share: 50, currency: 'SAR' },
    insurance_item_decisions: [{ order_item_id: 'i1', decision: 'APPROVED_PARTIAL', line_amount: 40, covered_amount: 20, co_pay_amount: 20, reason: 'why' }],
  };
  it('takes the server numbers as sent, with the item names from the order and what was accepted', () => {
    const o = order(ins);
    expect(o.insurance).toEqual({ outcome: 'partial', copay: 30, insurerShare: 50, currency: 'SAR', accepted: 'co-pay', items: [{ key: 'i1', name: 'Item one', outcome: 'partial', lineAmount: 40, covered: 20, copay: 20, reason: 'why' }] });
  });
  it('no decision, no insurance view', () => {
    expect(order().insurance).toBeNull();
  });
});

describe('payment result', () => {
  it('phases come from the server status only', () => {
    expect(paymentPhase('paid')).toBe('paid');
    expect(paymentPhase('PAID')).toBe('paid');
    expect(paymentPhase('pending')).toBe('pending');
    expect(paymentPhase('initiated')).toBe('pending');
    expect(paymentPhase('authorized')).toBe('pending');
    expect(paymentPhase('failed')).toBe('failed');
    expect(paymentPhase('cancelled')).toBe('cancelled');
    expect(paymentPhase('partially_refunded')).toBe('refunded');
    expect(paymentPhase(undefined)).toBe('unknown');
    expect(paymentPhase('success')).toBe('unknown');
  });
  it('reads amount, date and a short reference, nothing else', () => {
    expect(readPaymentResult({ id: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d', status: 'paid', amount: 80, currency: 'SAR', paid_at: '2026-10-06T09:30:00.000Z' })).toEqual({ phase: 'paid', amount: 80, currency: 'SAR', paidAt: Date.parse('2026-10-06T09:30:00.000Z'), reference: '2A3B4C5D' });
    expect(readPaymentResult(null)).toBeNull();
  });
  it('the address never says what happened: status and amount params are not read', () => {
    const p = readResultParams({ status: 'success', amount: '9999', transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'o1' });
    expect(p).toEqual({ transactionId: 'txn-1', gatewayId: null, bookingKind: 'pharmacy', bookingId: 'o1', visitType: null, paymentUrl: null });
    // the older callers' name for the transaction, and the gateway's own id from its redirect
    expect(readResultParams({ moyasarId: 'txn-2' }).transactionId).toBe('txn-2');
    expect(readResultParams({ id: 'pay_abc', status: 'paid' })).toMatchObject({ transactionId: null, gatewayId: 'pay_abc' });
    expect(readResultParams({ status: 'success' })).toMatchObject({ transactionId: null, gatewayId: null });
    // the hosted page other services hand over: https only
    expect(readResultParams({ moyasarId: 'txn-2', paymentUrl: 'https://pay.example.test/x' }).paymentUrl).toBe('https://pay.example.test/x');
    expect(readResultParams({ moyasarId: 'txn-2', paymentUrl: 'javascript:alert(1)' }).paymentUrl).toBeNull();
    expect(readResultParams({ moyasarId: 'txn-2', paymentUrl: '' }).paymentUrl).toBeNull();
  });
  it('the payment page is opened only when it is an https address', () => {
    expect(readIntent({ id: 't1', status: 'pending', checkout_url: 'https://pay.example.test/x' })).toEqual({ transactionId: 't1', checkoutUrl: 'https://pay.example.test/x', status: 'pending' });
    expect(readIntent({ id: 't1', checkout_url: 'http://pay.example.test/x' }).checkoutUrl).toBeNull();
    expect(readIntent({ id: 't1', checkout_url: 'javascript:alert(1)' }).checkoutUrl).toBeNull();
    expect(readIntent({}).transactionId).toBeNull();
  });
});

describe('orderRoute (the states the backend produces)', () => {
  const id = 'o1';
  it('an order still looking for offers is told by its status, because governed_state is empty until an offer is chosen', () => {
    for (const status of ['draft', 'broadcasting', 'ready_for_split', 'awaiting_full_acceptance', 'manual_review']) {
      expect(orderRoute({ id, status, governed_state: null }).pathname).toBe('/pharmacy/broadcast-status');
    }
  });
  it('after the choice the governed state decides', () => {
    expect(orderRoute({ id, status: 'cash_card_payment_pending', governed_state: 'OFFER_SELECTED' }).pathname).toBe('/pharmacy/final-quote');
    expect(orderRoute({ id, status: 'cod_due_on_delivery', governed_state: 'COD_REGISTERED' }).pathname).toBe('/pharmacy/final-quote');
    expect(orderRoute({ id, status: 'waiting_copay', governed_state: 'INSURANCE_DECISION_READY' }).pathname).toBe('/pharmacy/insurance-decision');
    expect(orderRoute({ id, status: 'insurance_decision_pending', governed_state: 'INSURANCE_PROCESSING' }).pathname).toBe('/pharmacy/insurance-decision');
    expect(orderRoute({ id, status: 'confirmed', governed_state: 'CONFIRMED' }).pathname).toBe('/pharmacy/order-tracking');
    expect(orderRoute({ id, status: 'cancelled', governed_state: 'CANCELLED' }).pathname).toBe('/pharmacy/order-tracking');
  });
  it('a paid order goes to its status, not back to the price', () => {
    expect(orderRoute({ id, status: 'cash_card_payment_pending', governed_state: 'FINAL_QUOTE_ACCEPTED', payment_status: 'paid' }).pathname).toBe('/pharmacy/order-tracking');
  });
  it('the order list sends the stored order without governed_state: the chosen offer and the status tell the step', () => {
    expect(orderRoute({ id, status: 'cash_card_payment_pending', selected_offer_id: 'x' }).pathname).toBe('/pharmacy/final-quote');
    expect(orderRoute({ id, status: 'waiting_copay', selected_offer_id: 'x', payment_method: 'insurance' }).pathname).toBe('/pharmacy/insurance-decision');
    expect(orderRoute({ id, status: 'manual_review', selected_offer_id: 'x', payment_method: 'insurance' }).pathname).toBe('/pharmacy/insurance-decision');
    expect(orderRoute({ id, status: 'in_fulfillment', selected_offer_id: 'x' }).pathname).toBe('/pharmacy/order-tracking');
  });
});
