import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import CheckoutScreen from '../../../app/pharmacy/checkout';
import PaymentScreen from '../../../app/pharmacy/payment';
import InsuranceDecisionScreen from '../../../app/pharmacy/insurance-decision';
import OrderConfirmScreen from '../../../app/pharmacy/order-confirm';
import PaymentResultScreen from '../../../app/payments/result';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 1d, high effort: checkout, payment, insurance decision, payment result, order entry. The screens are driven with
 * answers shaped like the backend's (pharmacy-order.service.ts `governedView`, payments.module.ts capabilities / intent /
 * verify); every number is a TEST value. What is proved: amounts are the server's, "paid" appears only when the server says
 * paid, a mutation is sent once with a stable key, the control is disabled while it runs, a refusal is a real sentence, and
 * a link can never show a payment as made.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockCart: { items: Array<{ id: string; name: string; qty: number; rx: boolean }>; clearCart: jest.Mock } = { items: [], clearCart: jest.fn(async () => undefined) };
const mockAddress: { current: Record<string, unknown> | null } = { current: { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 } };

jest.mock('expo-router', () => {
  const R = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../context/CartContext', () => ({ useCart: () => mockCart }));
jest.mock('../../utils/selectedAddress', () => ({ resolveEffectiveAddress: jest.fn(async () => mockAddress.current) }));
jest.mock('../../components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'app-test-nonce-0001') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace' | 'back' | 'canGoBack', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { showLocalizedAlert } = require('../../components/LocalizedAlert') as { showLocalizedAlert: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const accepted = { id: 'ord-0001a1', status: 'cash_card_payment_pending', governed_state: 'FINAL_QUOTE_ACCEPTED', payment_method: 'card', fulfillment: 'delivery', delivery_address: { label: 'Test home', street: 'Test street', city: 'Test city' }, accepted_quote_snapshot: { ...snap, cod_allowed: true }, selected_offer_snapshot: snap };
const caps = (amount = 80, methods = ['card', 'apple-pay']) => ({ booking_id: 'ord', amount, currency: 'SAR', methods: methods.map((id) => ({ id, kind: 'online' })) });
const insurancePartial = {
  ...accepted,
  governed_state: 'INSURANCE_DECISION_READY',
  payment_method: 'insurance',
  items: [{ id: 'i1', raw_name: 'Item one' }],
  insurance_decision: { outcome: 'partial' },
  insurance_decision_summary: { decision: 'APPROVED_PARTIAL', co_pay_amount: 30, insurer_share: 50, currency: 'SAR' },
  insurance_item_decisions: [{ order_item_id: 'i1', decision: 'APPROVED_PARTIAL', line_amount: 40, covered_amount: 20, co_pay_amount: 20, reason: null }],
};

function answer(map: Record<string, unknown>, post?: (path: string, init: RequestInit) => unknown) {
  apiFetch.mockImplementation(async (path: string, init?: RequestInit) => {
    if (init?.method === 'POST') {
      const r = post ? post(path, init) : {};
      if (r instanceof Error) throw r;
      return r;
    }
    if (path in map) {
      const v = map[path];
      if (v instanceof Error) throw v;
      return v;
    }
    return {};
  });
}
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { orderId: 'ord' };
  mockCart.items = [];
  mockAddress.current = { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 };
});

describe('checkout', () => {
  it('sends the prescription lines AND the other cart lines, with the prescription id, once (create then submit)', async () => {
    mockParams.current = { prescriptionId: 'rx1' };
    mockCart.items = [{ id: 'c1', name: 'Vitamin C', qty: 3, rx: false }, { id: 'c2', name: 'Panadol', qty: 1, rx: true }];
    let release: (v: unknown) => void = () => undefined;
    const creating = new Promise((r) => { release = r; });
    answer({ '/prescriptions/rx1': { id: 'rx1', items: [{ name: 'Panadol' }, { name: 'Amoxicillin' }] } }, (path) => (path.endsWith('/submit') ? {} : creating));
    await render(wrap(<CheckoutScreen />));
    await screen.findByText('Amoxicillin');
    // the cart's Panadol is the prescription's Panadol: listed once; the cart's other line is kept
    expect(screen.getAllByText('Panadol')).toHaveLength(1);
    expect(screen.getByText('Vitamin C')).toBeTruthy();
    const submit = screen.getByLabelText(k('pharmacy.checkout.submit'));
    await tap(submit);
    await tap(submit); // a second tap while the first is running
    expect(posts()).toHaveLength(1);
    await act(async () => release({ id: 'order-new-1' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'order-new-1' } }));
    expect(posts().map(([p]) => p)).toEqual(['/patient/pharmacy/orders', '/patient/pharmacy/orders/order-new-1/submit']);
    const body = JSON.parse(posts()[0][1].body as string);
    expect(body.items.map((i: { raw_name: string }) => i.raw_name)).toEqual(['Panadol', 'Amoxicillin', 'Vitamin C']);
    expect(body.prescription_id).toBe('rx1');
    expect(body.items.some((i: Record<string, unknown>) => 'price' in i || 'unit_price' in i)).toBe(false);
    expect(body.payment_mode).toBe('cash');
    expect((posts()[0][1].headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
    expect(mockCart.clearCart).toHaveBeenCalledTimes(1);
  });

  it('a retry after no answer sends the same keys and does not create a second order; after an answer it takes new ones', async () => {
    mockCart.items = [{ id: 'c1', name: 'Vitamin C', qty: 1, rx: false }];
    const nonces = ['app-test-nonce-0001', 'app-test-nonce-0002', 'app-test-nonce-0003'];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../../utils/api').newIdempotencyKey as jest.Mock).mockImplementation(() => nonces.shift());
    let submits = 0;
    answer({}, (path) => {
      if (path.endsWith('/submit')) {
        submits += 1;
        return submits === 1 ? new Error('OFFLINE_ERROR') : submits === 2 ? new Error('cannot_submit_from_cancelled') : {};
      }
      return { id: 'order-new-1' };
    });
    await render(wrap(<CheckoutScreen />));
    const submit = await screen.findByLabelText(k('pharmacy.checkout.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit); // no answer
    await screen.findByText(k('errors.offline'));
    await tap(screen.getByLabelText(k('pharmacy.checkout.submit'))); // server answered with a refusal
    await screen.findByText(k('pharmacy.checkout.err.send'));
    await tap(screen.getByLabelText(k('pharmacy.checkout.submit')));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const calls = posts();
    expect(calls.filter(([p]) => p === '/patient/pharmacy/orders')).toHaveLength(1); // the order is created once
    const submitKeys = calls.filter(([p]) => p.endsWith('/submit')).map(([, init]) => (init.headers as Record<string, string>)['Idempotency-Key']);
    expect(submitKeys).toHaveLength(3);
    expect(submitKeys[1]).toBe(submitKeys[0]); // after no answer: the same key
    expect(submitKeys[2]).not.toBe(submitKeys[1]); // after an answer: a new one
  });

  it('does not send without a map point and says why', async () => {
    mockCart.items = [{ id: 'c1', name: 'Vitamin C', qty: 1, rx: false }];
    mockAddress.current = { id: 'a1', label: 'No point' };
    answer({});
    await render(wrap(<CheckoutScreen />));
    const submit = await screen.findByLabelText(k('pharmacy.checkout.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit);
    expect(posts()).toHaveLength(0);
    expect(screen.getByText(k('pharmacy.checkout.err.location'))).toBeTruthy();
  });

  it('a guest refused by the server gets the sign-in sentence, not the raw text', async () => {
    mockCart.items = [{ id: 'c1', name: 'Vitamin C', qty: 1, rx: false }];
    answer({}, () => new Error('AUTH_ERROR_403: Insufficient role'));
    await render(wrap(<CheckoutScreen />));
    const submit = await screen.findByLabelText(k('pharmacy.checkout.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit);
    await screen.findByText(k('pharmacy.checkout.err.signIn'));
    expect(screen.queryByText(/Insufficient role/)).toBeNull();
    expect(mockCart.clearCart).not.toHaveBeenCalled();
  });

  it('an empty cart and no prescription is an empty state with a way out; a prescription that fails to load is an error with a retry', async () => {
    answer({});
    const first = await render(wrap(<CheckoutScreen />));
    await screen.findByText(k('pharmacy.checkout.emptyTitle'));
    await act(async () => { first.unmount(); });
    mockParams.current = { prescriptionId: 'rx1' };
    answer({ '/prescriptions/rx1': new Error('Internal server error') });
    await render(wrap(<CheckoutScreen />));
    await screen.findByText(k('pharmacy.checkout.rxLoadError'));
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
  });
});

describe('payment', () => {
  it('draws the server amount and the server rows, and pays once through the hosted page, then asks the server for the result', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    let release: (v: unknown) => void = () => undefined;
    const pending = new Promise((r) => { release = r; });
    answer({ '/patient/pharmacy/orders/ord': accepted, '/payments/pharmacy/ord/capabilities': caps(80) }, () => pending);
    await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.dueNow'));
    expect(screen.getAllByText(/80\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/70\.00/)).toBeTruthy();
    expect(screen.getByText(/10\.00/)).toBeTruthy();
    const pay = screen.getByLabelText(k('pharmacy.pay.pay', { amount: `80.00 ${k('pharmacy.currency')}` }));
    await tap(pay);
    await tap(pay); // a second tap while pending
    expect(posts()).toHaveLength(1);
    const [path, init] = posts()[0];
    expect(path).toBe('/payments/intent/pharmacy/ord');
    expect(JSON.parse(init.body as string)).toEqual({}); // no amount, no card data goes out
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
    await waitFor(() => expect(screen.getByLabelText(k('pharmacy.pay.pay', { amount: `80.00 ${k('pharmacy.currency')}` })).props.accessibilityState.disabled).toBe(true));
    await act(async () => release({ id: 'txn-1', status: 'pending', checkout_url: 'https://pay.example.test/hosted' }));
    await waitFor(() => expect(open).toHaveBeenCalledWith('https://pay.example.test/hosted'));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/payments/result', params: { transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'ord' } });
    expect(posts()).toHaveLength(1);
    open.mockRestore();
  });

  it('never opens a payment page that is not https; the transaction can still be checked', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    answer({ '/patient/pharmacy/orders/ord': accepted, '/payments/pharmacy/ord/capabilities': caps() }, () => ({ id: 'txn-1', status: 'pending', checkout_url: 'http://insecure.example.test' }));
    await render(wrap(<PaymentScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.pay.pay', { amount: `80.00 ${k('pharmacy.currency')}` })));
    await screen.findByText(k('pharmacy.pay.err.noPage'));
    expect(open).not.toHaveBeenCalled();
    expect(mockRouter.replace).not.toHaveBeenCalled();
    await tap(screen.getByLabelText(k('pharmacy.pay.checkStatus')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/payments/result', params: { transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'ord' } });
    open.mockRestore();
  });

  it('a failure after an answer shows a real sentence and the next tap uses a new key; after no answer the same key', async () => {
    const nonces = ['app-test-nonce-0001', 'app-test-nonce-0002', 'app-test-nonce-0003'];
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    (require('../../utils/api').newIdempotencyKey as jest.Mock).mockImplementation(() => nonces.shift());
    let n = 0;
    answer({ '/patient/pharmacy/orders/ord': accepted, '/payments/pharmacy/ord/capabilities': caps() }, () => {
      n += 1;
      return n === 1 ? new Error('OFFLINE_ERROR') : n === 2 ? new Error('{"code":"payment_gateway_unavailable","message":"raw gateway text"}') : new Error('boom');
    });
    await render(wrap(<PaymentScreen />));
    const label = k('pharmacy.pay.pay', { amount: `80.00 ${k('pharmacy.currency')}` });
    await tap(await screen.findByLabelText(label));
    await screen.findByText(k('errors.offline'));
    await tap(screen.getByLabelText(label));
    await screen.findByText(k('pharmacy.pay.err.gateway'));
    expect(screen.queryByText(/raw gateway text/)).toBeNull();
    await tap(screen.getByLabelText(label));
    await screen.findByText(k('pharmacy.pay.err.generic'));
    const keys = posts().map(([, init]) => (init.headers as Record<string, string>)['Idempotency-Key']);
    expect(keys).toHaveLength(3);
    expect(keys[1]).toBe(keys[0]); // no answer: the same key
    expect(keys[2]).not.toBe(keys[1]); // an answer: a new one
  });

  it('an order the server says is paid is shown as paid and offers no payment, even when the capabilities still answer an amount', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...accepted, payment_status: 'paid' }, '/payments/pharmacy/ord/capabilities': caps() });
    await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.paidTitle'));
    expect(screen.queryByLabelText(/^Pay /)).toBeNull();
  });

  it('what the server refuses is a state of its own: accept the price first, cash on delivery, insurance step, no method', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...accepted, governed_state: 'OFFER_SELECTED' }, '/payments/pharmacy/ord/capabilities': new Error('final_quote_acceptance_required') });
    const first = await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.blocked.acceptQuote.title'));
    await tap(screen.getByLabelText(k('pharmacy.quote.title')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/final-quote', params: { orderId: 'ord' } });
    await act(async () => { first.unmount(); });

    answer({ '/patient/pharmacy/orders/ord': insurancePartial, '/payments/pharmacy/ord/capabilities': new Error('copay_acceptance_required') });
    const second = await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.blocked.insurance.title'));
    await act(async () => { second.unmount(); });

    answer({ '/patient/pharmacy/orders/ord': accepted, '/payments/pharmacy/ord/capabilities': caps(80, []) });
    await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.noMethodsTitle'));
  });

  it('a failure to reach the payment service is an error with a retry, never "nothing to pay"', async () => {
    answer({ '/patient/pharmacy/orders/ord': accepted, '/payments/pharmacy/ord/capabilities': new Error('Internal server error') });
    await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.loadError'));
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
  });

  it('the accepted co-pay is the amount the server says is due, with the insurer share beside it', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...insurancePartial, insurance_decision: { outcome: 'partial', patient_acceptance: { kind: 'co-pay' } } }, '/payments/pharmacy/ord/capabilities': caps(30) });
    await render(wrap(<PaymentScreen />));
    await screen.findByText(k('pharmacy.pay.insurerCovers'));
    expect(screen.getByText(/50\.00/)).toBeTruthy();
    expect(screen.getByLabelText(k('pharmacy.pay.pay', { amount: `30.00 ${k('pharmacy.currency')}` }))).toBeTruthy();
  });
});

describe('insurance decision', () => {
  it('shows the server shares and sends the chosen acceptance once after an explicit confirm, then goes to payment', async () => {
    let release: (v: unknown) => void = () => undefined;
    const pending = new Promise((r) => { release = r; });
    answer({ '/patient/pharmacy/orders/ord': insurancePartial }, () => pending);
    await render(wrap(<InsuranceDecisionScreen />));
    await screen.findByText(k('pharmacy.pay.yourShare'));
    expect(screen.getAllByText(/30\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText('Item one')).toBeTruthy();
    const confirm = screen.getByLabelText(k('pharmacy.ins.confirm'));
    expect(confirm.props.accessibilityState.disabled).toBe(true); // nothing chosen yet
    await tap(screen.getByLabelText(k('pharmacy.ins.optCopay', { amount: `30.00 ${k('pharmacy.currency')}` })));
    await tap(screen.getByLabelText(k('pharmacy.ins.confirm')));
    await tap(screen.getByLabelText(k('pharmacy.ins.confirm')));
    expect(posts()).toHaveLength(1);
    expect(posts()[0][0]).toBe('/patient/pharmacy/orders/ord/insurance/co-pay/accept');
    expect((posts()[0][1].headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
    await act(async () => release({ ok: true }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/payment', params: { orderId: 'ord' } }));
  });

  it('self-pay is the full quote total of the order, from the server', async () => {
    answer({ '/patient/pharmacy/orders/ord': insurancePartial });
    await render(wrap(<InsuranceDecisionScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.ins.optSelf', { amount: `80.00 ${k('pharmacy.currency')}` })));
    await tap(screen.getByLabelText(k('pharmacy.ins.confirm')));
    expect(posts()[0][0]).toBe('/patient/pharmacy/orders/ord/insurance/self-pay/accept');
  });

  it('what the patient already accepted is read from the order: no second choice, a way to the payment', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...insurancePartial, insurance_decision: { outcome: 'partial', patient_acceptance: { kind: 'co-pay' } } } });
    await render(wrap(<InsuranceDecisionScreen />));
    await screen.findByText(k('pharmacy.ins.acceptedTitle'));
    expect(screen.queryByLabelText(k('pharmacy.ins.confirm'))).toBeNull();
    await tap(screen.getByLabelText(k('pharmacy.ins.toPayment')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/payment', params: { orderId: 'ord' } });
  });

  it('a refusal is a sentence and the control comes back; "already recorded" reads the order again instead of failing', async () => {
    let calls = 0;
    answer({ '/patient/pharmacy/orders/ord': insurancePartial }, () => {
      calls += 1;
      return calls === 1 ? new Error('insurance_acceptance_conflict') : new Error('insurance_acceptance_already_recorded');
    });
    await render(wrap(<InsuranceDecisionScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.ins.optCopay', { amount: `30.00 ${k('pharmacy.currency')}` })));
    await tap(screen.getByLabelText(k('pharmacy.ins.confirm')));
    await screen.findByText(k('pharmacy.ins.err.state'));
    expect(screen.getByLabelText(k('pharmacy.ins.confirm')).props.accessibilityState.disabled).toBe(false);
    const readsBefore = apiFetch.mock.calls.filter(([p, i]) => p === '/patient/pharmacy/orders/ord' && !i).length;
    await tap(screen.getByLabelText(k('pharmacy.ins.confirm')));
    await waitFor(() => expect(apiFetch.mock.calls.filter(([p, i]) => p === '/patient/pharmacy/orders/ord' && !i).length).toBeGreaterThan(readsBefore));
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });

  it('while the pharmacy has not decided there is nothing to accept; a rejected order can be paid in full or cancelled (after a confirm)', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...accepted, payment_method: 'insurance', governed_state: 'INSURANCE_PROCESSING' } });
    const first = await render(wrap(<InsuranceDecisionScreen />));
    await screen.findByText(k('pharmacy.ins.processingTitle'));
    expect(screen.queryByLabelText(k('pharmacy.ins.confirm'))).toBeNull();
    await act(async () => { first.unmount(); });

    const rejected = { ...insurancePartial, status: 'manual_review', insurance_decision: { outcome: 'rejected' }, insurance_decision_summary: { decision: 'REJECTED', co_pay_amount: 80, insurer_share: 0, currency: 'SAR' } };
    answer({ '/patient/pharmacy/orders/ord': rejected });
    await render(wrap(<InsuranceDecisionScreen />));
    await screen.findByText(k('pharmacy.ins.rejectedTitle'));
    expect(screen.queryByLabelText(k('pharmacy.ins.optCopay', { amount: `80.00 ${k('pharmacy.currency')}` }))).toBeNull(); // no co-pay on a rejection
    await tap(screen.getByLabelText(k('pharmacy.offers.cancelOrder')));
    expect(posts()).toHaveLength(0); // asked first
    expect(showLocalizedAlert).toHaveBeenCalled();
    const buttons = showLocalizedAlert.mock.calls[0][2] as Array<{ text: string; onPress?: () => void }>;
    await act(async () => buttons.find((b) => b.onPress)?.onPress?.());
    expect(posts()[0][0]).toBe('/patient/pharmacy/orders/ord/insurance-rejection/cancel');
  });

  it('full coverage says no payment is due', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...insurancePartial, status: 'confirmed', governed_state: 'CONFIRMED', payment_status: 'covered_by_insurance', insurance_decision_summary: { decision: 'APPROVED_FULL', co_pay_amount: 0, insurer_share: 80 } } });
    await render(wrap(<InsuranceDecisionScreen />));
    await screen.findByText(k('pharmacy.pay.coveredTitle'));
  });
});

describe('payment result', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    mockParams.current = { transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'ord' };
  });
  afterEach(() => {
    jest.useRealTimers();
  });

  it('shows paid only because the server said paid, with the server amount; a success in the address changes nothing', async () => {
    mockParams.current = { status: 'success', amount: '9999', transactionId: 'txn-1', bookingKind: 'pharmacy', bookingId: 'ord' };
    let status = 'pending';
    apiFetch.mockImplementation(async () => ({ id: 'a1b2c3d4-e5f6', status, amount: 80, currency: 'SAR', paid_at: status === 'paid' ? '2026-10-06T09:30:00.000Z' : null }));
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.checkingTitle'));
    expect(screen.queryByText(k('pharmacy.pay.paidTitle'))).toBeNull();
    expect(screen.queryByText(/9999/)).toBeNull();
    expect(apiFetch).toHaveBeenCalledWith('/payments/verify/txn-1', { method: 'POST' });
    status = 'paid';
    await act(async () => { jest.advanceTimersByTime(3000); });
    await screen.findByText(k('pharmacy.pay.paidTitle'));
    expect(screen.getByText(/80\.00/)).toBeTruthy();
    expect(screen.queryByText(/9999/)).toBeNull();
    await tap(screen.getByLabelText(k('pharmacy.quote.orderStatus')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/order-tracking', params: { orderId: 'ord' } });
  });

  it('a status=success link with nothing to verify shows no success: it says it cannot confirm and offers a way out', async () => {
    mockParams.current = { status: 'success', amount: '80' };
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.unknownTitle'));
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.queryByText(k('pharmacy.pay.paidTitle'))).toBeNull();
  });

  it('the id of the gateway redirect is checked at the server too', async () => {
    mockParams.current = { id: 'pay_abc', status: 'paid' };
    apiFetch.mockResolvedValue({ moyasar_id: 'pay_abc', status: 'initiated', amount: 80 });
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.checkingTitle'));
    expect(apiFetch).toHaveBeenCalledWith('/moyasar/payments/sync/pay_abc');
  });

  it('opens the hosted page a service hands over (https only), once, and then asks the server', async () => {
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    mockParams.current = { moyasarId: 'txn-9', paymentUrl: 'https://pay.example.test/hosted', bookingKind: 'diagnostics', bookingId: 'd1' };
    apiFetch.mockResolvedValue({ id: 'x', status: 'pending' });
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.checkingTitle'));
    expect(open).toHaveBeenCalledTimes(1);
    expect(open).toHaveBeenCalledWith('https://pay.example.test/hosted');
    expect(apiFetch).toHaveBeenCalledWith('/payments/verify/txn-9', { method: 'POST' });
    open.mockClear();
    mockParams.current = { moyasarId: 'txn-9', paymentUrl: 'http://insecure.example.test', bookingKind: 'diagnostics' };
    await render(wrap(<PaymentResultScreen />));
    expect(open).not.toHaveBeenCalled();
    open.mockRestore();
  });

  it('failed and cancelled use the failure state with a retry to the payment screen', async () => {
    apiFetch.mockResolvedValue({ id: 'x', status: 'failed', amount: 80 });
    const first = await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.failedTitle'));
    expect(screen.queryByText(k('pharmacy.pay.paidTitle'))).toBeNull();
    await tap(screen.getByLabelText(k('payments.result.tryAgain')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/payment', params: { orderId: 'ord' } });
    await act(async () => { first.unmount(); });
    apiFetch.mockResolvedValue({ id: 'x', status: 'cancelled' });
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.cancelledTitle'));
  });

  it('a payment still pending after the last check says so, with a check button and a way out, and is never called failed', async () => {
    apiFetch.mockResolvedValue({ id: 'x', status: 'pending', amount: 80 });
    await render(wrap(<PaymentResultScreen />));
    await screen.findByText(k('payments.result.checkingTitle'));
    for (let i = 0; i < 16; i += 1) await act(async () => { jest.advanceTimersByTime(3000); });
    await screen.findByText(k('payments.result.pendingTitle'));
    expect(apiFetch.mock.calls.length).toBe(15);
    expect(screen.queryByText(k('payments.result.failedTitle'))).toBeNull();
    expect(screen.getByLabelText(k('payments.result.check'))).toBeTruthy();
  });

  it('when the server cannot be reached the screen says so and keeps asking; it never invents a result', async () => {
    apiFetch.mockRejectedValue(new Error('OFFLINE_ERROR'));
    await render(wrap(<PaymentResultScreen />));
    for (let i = 0; i < 16; i += 1) await act(async () => { jest.advanceTimersByTime(3000); });
    await screen.findByText(k('payments.result.errorTitle'));
    expect(screen.queryByText(k('pharmacy.pay.paidTitle'))).toBeNull();
    expect(screen.queryByText(k('payments.result.failedTitle'))).toBeNull();
  });
});

describe('order entry', () => {
  it('opens the offers screen for an order that is looking for offers (the backend never says ORDER_BROADCASTING)', async () => {
    answer({ '/patient/pharmacy/orders/ord': { id: 'ord', status: 'broadcasting', governed_state: null } });
    await render(wrap(<OrderConfirmScreen />));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'ord' } }));
  });

  it('reads the id the deep link names (orders/:id) and opens the step the governed state says', async () => {
    mockParams.current = { id: 'ord' };
    answer({ '/patient/pharmacy/orders/ord': { ...insurancePartial, id: 'ord' } });
    await render(wrap(<OrderConfirmScreen />));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/insurance-decision', params: { orderId: 'ord' } }));
  });

  it('a failed read is an error with a retry, not a blank screen', async () => {
    answer({ '/patient/pharmacy/orders/ord': new Error('Internal server error') });
    await render(wrap(<OrderConfirmScreen />));
    await screen.findByText(k('pharmacy.confirm.loadError'));
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});
