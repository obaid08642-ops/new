/**
 * ACCEPTANCE — D-31 (owner decision 31, "Double taps and bad networks"): PAY / BOOK / SEND and the OFFLINE cart in the app.
 * Written by the reviewer before the work; the implementing agent makes it pass and may not edit it.
 *
 * Screens (the REAL screens, the REAL api client `src/utils/api.ts` apiFetch, the REAL cart provider and AsyncStorage
 * mock, the REAL isOffline / selectedAddress / LocalizedAlert):
 *  - pharmacy pay                   app/pharmacy/payment.tsx
 *  - pharmacy send (broadcast)      app/pharmacy/checkout.tsx
 *  - consultation booking + its card payment   src/components/BookingConfirmForm.tsx
 *  - insurance co-pay               app/insurance/copay.tsx
 *  - cart                           app/pharmacy/cart.tsx + src/context/CartContext.tsx
 * Rules checked:
 *  A1  two taps while the first request is in flight ("slow 3G": a fetch that has not answered) -> ONE request reaches
 *      the network, and the control is disabled (or its handler ignores the tap) while it is in flight;
 *  A2  after a lost connection (fetch rejects with TypeError('Network request failed'): the server may have acted) the
 *      next attempt sends the SAME Idempotency-Key, or asks the server for the result (a status GET) instead of
 *      creating a new charge / booking / order; a clear message is shown and the user can retry;
 *  A3  after a definite server answer (4xx with a body) a new attempt is allowed (a new key is fine);
 *  B   offline (NetInfo says no connection, every fetch fails): the cart works locally and is kept; an action that
 *      needs the server shows a clear error and keeps the user's input (the cart unchanged).
 * Only the network boundary is faked: global `fetch` (recording method, path, Idempotency-Key) and NetInfo. The router
 * (expo-router), the theme/language context and the logger are the seams the existing tests replace.
 */
import React from 'react';
import { Alert, Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';

import authReducer from '../../../src/store/slices/authSlice';
import { listenerMiddleware } from '../../../src/store/middleware/listenerMiddleware';
import { CartProvider, useCart } from '../../../src/context/CartContext';
import { DEVICE_CART_KEY } from '../../../src/utils/pharmacyCartStore';

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
let mockParams: Record<string, string> = {};
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('@react-native-community/netinfo', () => require('@react-native-community/netinfo/jest/netinfo-mock.js'));
jest.mock('../../../src/utils/logger', () => ({ logError: jest.fn(), logger: { error: jest.fn(), warn: jest.fn(), info: jest.fn(), debug: jest.fn() } }));
jest.mock('expo-linking', () => ({ openURL: jest.fn(async () => true), createURL: jest.fn((p: string) => p) }));
jest.mock('expo-router', () => {
  const R = require('react');
  return {
    get router() {
      return mockRouter;
    },
    useRouter: () => mockRouter,
    usePathname: () => '/insurance/copay',
    useSegments: () => [],
    useLocalSearchParams: () => mockParams,
    useFocusEffect: (cb: () => void | (() => void)) => {
      R.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});
jest.mock('../../../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));

import PharmacyPayment from '../../../app/pharmacy/payment';
import PharmacyCheckout from '../../../app/pharmacy/checkout';
import PharmacyCart from '../../../app/pharmacy/cart';
import BookingConfirm from '../../../src/components/BookingConfirmForm';
import InsuranceCopay from '../../../app/insurance/copay';

const AR = require('../../../src/i18n/locales/ar.json') as Record<string, string>;
const ar = (key: string, values: Record<string, string> = {}) => AR[key].replace(/\{\{?(\w+)\}?\}/g, (_, n: string) => values[n] ?? '');

/* ---------------------------------------------------------------------------------------------------------------- */
/* The network boundary                                                                                              */
/* ---------------------------------------------------------------------------------------------------------------- */

type Call = { path: string; method: string; key: string | null; body: unknown };
type Answer = { status: number; body: unknown } | Promise<{ status: number; body: unknown }>;
const ok = (body: unknown, status = 200) => ({ status, body });
const lost = (): Promise<never> => Promise.reject(new TypeError('Network request failed'));
function deferred() {
  let resolve!: (v: { status: number; body: unknown }) => void;
  const promise = new Promise<{ status: number; body: unknown }>((r) => { resolve = r; });
  return { promise, resolve };
}

let calls: Call[] = [];
function network(route: (call: Call) => Answer | undefined) {
  calls = [];
  (globalThis as { fetch?: unknown }).fetch = jest.fn(async (input: string, init: { method?: string; headers?: unknown; body?: unknown } = {}) => {
    const headers = init.headers instanceof Headers ? init.headers : new Headers((init.headers ?? {}) as Record<string, string>);
    let body: unknown = init.body ?? null;
    if (typeof body === 'string') { try { body = JSON.parse(body); } catch { /* raw */ } }
    const call: Call = { path: String(input).replace(/^https?:\/\/[^/]+/, '').replace(/^\/api\/v1/, '').split('?')[0], method: String(init.method ?? 'GET').toUpperCase(), key: headers.get('Idempotency-Key'), body };
    calls.push(call);
    const answer = await (route(call) ?? ok({ message: 'not_in_test' }, 404));
    const textBody = answer.body === undefined ? '' : JSON.stringify(answer.body);
    return { ok: answer.status >= 200 && answer.status < 300, status: answer.status, json: async () => JSON.parse(textBody), text: async () => textBody };
  });
}
const writes = (pattern: RegExp) => calls.filter((c) => c.method !== 'GET' && pattern.test(c.path));

function expectOneWrite(label: string, pattern: RegExp) {
  const sent = writes(pattern);
  if (sent.length !== 1) throw new Error(`${label}: ${sent.length} requests to ${pattern} after two taps (keys: ${sent.map((s) => s.key).join(' , ')})`);
}

/** A2: same key on the retry, or a status GET after the lost request (before any second write). */
function expectRetryIsSafe(label: string, pattern: RegExp, statusCheck = /status|verify|result|transactions?\//) {
  const sent = writes(pattern);
  if (sent.length === 0) throw new Error(`${label}: the first attempt was never sent`);
  const lostAt = calls.indexOf(sent[0]);
  const statusAt = calls.findIndex((c, i) => i > lostAt && c.method === 'GET' && statusCheck.test(c.path));
  if (sent.length < 2) {
    if (statusAt < 0) throw new Error(`${label}: the retry sent nothing and asked the server nothing`);
    return;
  }
  if (statusAt >= 0 && statusAt < calls.indexOf(sent[1])) return;
  if (!sent[0].key) throw new Error(`${label}: the lost request carried no Idempotency-Key`);
  if (sent[1].key !== sent[0].key) throw new Error(`${label}: two different keys sent after a lost connection: ${sent[0].key} vs ${sent[1].key}`);
}

function setOffline(offline: boolean) {
  (NetInfo.fetch as jest.Mock).mockResolvedValue({ type: offline ? 'none' : 'wifi', isConnected: !offline, isInternetReachable: !offline, details: null });
}

/* ---------------------------------------------------------------------------------------------------------------- */
/* Rendering and taps                                                                                                */
/* ---------------------------------------------------------------------------------------------------------------- */

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const makeStore = () => configureStore({ reducer: { auth: authReducer }, middleware: (d) => d().prepend(listenerMiddleware.middleware) });
let cartApi: ReturnType<typeof useCart>;
function Probe() {
  cartApi = useCart();
  return <Text testID="probe">{cartApi.ready ? `ready:${cartApi.items.map((i) => `${i.id}x${i.qty}`).join(',')}` : 'loading'}</Text>;
}
const tree = (ui: React.ReactNode) => (
  <Provider store={makeStore()}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>
        <Probe />
        {ui}
      </CartProvider>
    </SafeAreaProvider>
  </Provider>
);

type Host = ReturnType<typeof screen.getByTestId>;
/** The element that takes the press (the host with onPress / accessibilityState), walking up from what was found. */
function control(el: Host): Host {
  let node: Host | null = el;
  while (node) {
    if (node.props?.accessibilityState || node.props?.onClick || node.props?.onPress) return node;
    node = node.parent as Host | null;
  }
  return el;
}
const isDisabled = (el: Host) => {
  const c = control(el);
  return Boolean(c.props?.accessibilityState?.disabled || c.props?.disabled || c.props?.accessibilityState?.busy);
};
/** A user's tap: a disabled control does nothing (a real finger gets no press), an enabled one is pressed. */
async function tap(el: Host): Promise<'pressed' | 'ignored-disabled'> {
  if (isDisabled(el)) return 'ignored-disabled';
  await act(async () => { fireEvent.press(el); });
  return 'pressed';
}
const settle = async () => { await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); await act(async () => { await new Promise((r) => setTimeout(r, 0)); }); };
const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

let alertSpy: jest.SpyInstance;
beforeEach(async () => {
  jest.clearAllMocks();
  mockParams = {};
  setOffline(false);
  await AsyncStorage.clear();
  alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  (globalThis as { alert?: unknown }).alert = jest.fn();
});
afterEach(() => alertSpy.mockRestore());

/* ---------------------------------------------------------------------------------------------------------------- */
/* PAY — pharmacy (app/pharmacy/payment.tsx)                                                                         */
/* ---------------------------------------------------------------------------------------------------------------- */

const ORDER = '761e9693-e517-4ad6-ae20-330363005b28';
const PHARMACY_INTENT = /^\/payments\/intent\/pharmacy\/[^/]+$/;
function pharmacyReads(call: Call) {
  if (call.method !== 'GET') return undefined;
  if (call.path === `/patient/pharmacy/orders/${ORDER}`) return ok({ id: ORDER, status: 'awaiting_payment', governed_state: 'FINAL_QUOTE_ACCEPTED', payment_status: 'pending' });
  if (call.path === `/payments/pharmacy/${ORDER}/capabilities`) return ok({ amount: 51.5, currency: 'SAR', methods: [{ id: 'card', kind: 'online' }] });
  if (call.path === '/users/me/addresses') return ok([{ id: 'a1', label: 'Home', street: 'King Fahd Rd', city: 'Riyadh', lat: 24.7, lng: 46.6, is_default: true }]);
  return undefined;
}
async function openPayment() {
  mockParams = { orderId: ORDER };
  await render(tree(<PharmacyPayment />));
  const pay = await screen.findByTestId('payment-pay');
  return pay;
}

describe('PAY — pharmacy payment screen (app/pharmacy/payment.tsx)', () => {
  it('A1: two taps on a slow network send ONE payment request, and the button is disabled while it is in flight', async () => {
    const slow = deferred();
    network((call) => pharmacyReads(call) ?? (PHARMACY_INTENT.test(call.path) ? slow.promise : undefined));
    await openPayment();
    expect(await tap(screen.getByTestId('payment-pay'))).toBe('pressed');
    if (!isDisabled(screen.getByTestId('payment-pay'))) throw new Error('pharmacy pay: the pay button is still enabled while the payment request is in flight');
    await tap(screen.getByTestId('payment-pay'));
    await settle();
    expectOneWrite('pharmacy pay', PHARMACY_INTENT);
    slow.resolve(ok({ message: 'payment_order_not_collectable' }, 409));
    await settle();
  });

  it('A2: after a lost connection a clear message is shown and the retry sends the SAME Idempotency-Key (or asks for the result)', async () => {
    let n = 0;
    network((call) => pharmacyReads(call) ?? (PHARMACY_INTENT.test(call.path) ? (++n === 1 ? lost() : deferred().promise) : undefined));
    await openPayment();
    await tap(screen.getByTestId('payment-pay'));
    await settle();
    await screen.findByText(AR['errors.offline']);
    await pause(5);
    expect(await tap(screen.getByTestId('payment-pay'))).toBe('pressed');
    await settle();
    expectRetryIsSafe('pharmacy pay', PHARMACY_INTENT);
  });

  it('A3: after a definite server answer (4xx) the patient may try again (a new key is allowed)', async () => {
    let n = 0;
    network((call) => pharmacyReads(call) ?? (PHARMACY_INTENT.test(call.path) ? (++n === 1 ? ok({ message: 'payment_gateway_unavailable' }, 422) : deferred().promise) : undefined));
    await openPayment();
    await tap(screen.getByTestId('payment-pay'));
    await settle();
    await tap(screen.getByTestId('payment-pay'));
    await settle();
    expect(writes(PHARMACY_INTENT)).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------------------------------------------------------- */
/* SEND — pharmacy broadcast (app/pharmacy/checkout.tsx)                                                             */
/* ---------------------------------------------------------------------------------------------------------------- */

const LINES = [{ id: 'm1', name: 'دواء أ', qty: 2, rx: false }, { id: 'm2', name: 'دواء ب', qty: 1, rx: false }];
const CREATE = /^\/patient\/pharmacy\/orders$/;
const storedCart = async () => JSON.parse((await AsyncStorage.getItem(DEVICE_CART_KEY)) ?? '[]');
async function openCheckout() {
  await AsyncStorage.setItem(DEVICE_CART_KEY, JSON.stringify(LINES));
  await render(tree(<PharmacyCheckout />));
  const submit = await screen.findByTestId('checkout-submit');
  await waitFor(() => expect(isDisabled(screen.getByTestId('checkout-submit'))).toBe(false));
  return submit;
}

describe('SEND — pharmacy order broadcast (app/pharmacy/checkout.tsx)', () => {
  it('A1: two taps on a slow network create ONE order, and the button is disabled while it is in flight', async () => {
    const slow = deferred();
    network((call) => pharmacyReads(call) ?? (CREATE.test(call.path) && call.method === 'POST' ? slow.promise : undefined));
    await openCheckout();
    await tap(screen.getByTestId('checkout-submit'));
    if (!isDisabled(screen.getByTestId('checkout-submit'))) throw new Error('pharmacy send: the send button is still enabled while the order request is in flight');
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    expectOneWrite('pharmacy send', CREATE);
    slow.resolve(ok({ message: 'items_required' }, 400));
    await settle();
  });

  it('A2 + B: after a lost connection: a clear message, the cart unchanged, and the retry sends the SAME Idempotency-Key', async () => {
    let n = 0;
    network((call) => pharmacyReads(call) ?? (CREATE.test(call.path) && call.method === 'POST' ? (++n === 1 ? lost() : deferred().promise) : undefined));
    await openCheckout();
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    await screen.findByText(AR['errors.offline']);
    expect(await storedCart()).toEqual(LINES);
    await pause(5);
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    expectRetryIsSafe('pharmacy send', CREATE);
  });

  it('A3: after a definite server answer (4xx) the patient may send again (a new key is allowed)', async () => {
    let n = 0;
    network((call) => pharmacyReads(call) ?? (CREATE.test(call.path) && call.method === 'POST' ? (++n === 1 ? ok({ message: 'items_required' }, 400) : deferred().promise) : undefined));
    await openCheckout();
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    expect(writes(CREATE)).toHaveLength(2);
  });

  it('B: offline, sending shows a clear error and the cart stays exactly as it was', async () => {
    network((call) => (call.method === 'GET' ? pharmacyReads(call) : lost()));
    await openCheckout();
    setOffline(true);
    (globalThis as { fetch?: unknown }).fetch = jest.fn(() => lost());
    await tap(screen.getByTestId('checkout-submit'));
    await settle();
    await screen.findByText(AR['errors.offline']);
    expect(await storedCart()).toEqual(LINES);
    expect(screen.getByTestId('probe').props.children).toBe('ready:m1x2,m2x1');
    expect(mockRouter.replace).not.toHaveBeenCalled();
  });
});

/* ---------------------------------------------------------------------------------------------------------------- */
/* BOOK + its card payment — consultation (src/components/BookingConfirmForm.tsx)                                     */
/* ---------------------------------------------------------------------------------------------------------------- */

const DOCTOR = 'd0c70000-1111-4222-8333-444455556666';
const APPT = 'a9900000-1111-4222-8333-444455556666';
const SLOT = new Date(Date.now() + 86_400_000).toISOString();
const BOOK = /^\/care\/appointments$/;
const LOCK = /^\/slot-locks\/reserve$/;
const CONSULT_INTENT = /^\/payments\/intent\/consultation\/[^/]+$/;
function bookingReads(call: Call) {
  if (call.method === 'GET' && call.path.startsWith('/care/doctors/')) return ok({ id: DOCTOR, name_en: 'Dr Test' });
  if (call.method === 'GET' && call.path === `/payments/consultation/${APPT}/capabilities`) return ok({ methods: [{ id: 'card', kind: 'online' }] });
  if (call.method === 'POST' && LOCK.test(call.path)) return ok({ id: 'lock-1' }, 201);
  return undefined;
}
async function openBooking() {
  mockParams = { doctorId: DOCTOR, slot_start: SLOT, visitType: 'clinic' };
  await render(tree(<BookingConfirm />));
  return screen.findByTestId('booking-confirm-submit');
}

describe('BOOK — consultation booking confirm (src/components/BookingConfirmForm.tsx)', () => {
  it('A1: two taps on a slow network send ONE booking (and one slot hold), and the button is disabled while it is in flight', async () => {
    const slow = deferred();
    network((call) => bookingReads(call) ?? (BOOK.test(call.path) && call.method === 'POST' ? slow.promise : undefined));
    await openBooking();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    if (!isDisabled(screen.getByTestId('booking-confirm-submit'))) throw new Error('consultation booking: the confirm button is still enabled while the booking request is in flight');
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    expectOneWrite('consultation booking', BOOK);
    expectOneWrite('consultation booking (slot hold)', LOCK);
    slow.resolve(ok({ message: 'slot_taken' }, 409));
    await settle();
  });

  it('A2 (book): after a lost connection a clear message is shown and the retry sends the SAME Idempotency-Key (or asks for the result)', async () => {
    let n = 0;
    network((call) => bookingReads(call) ?? (BOOK.test(call.path) && call.method === 'POST' ? (++n === 1 ? lost() : deferred().promise) : undefined));
    await openBooking();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    expect(alertSpy).toHaveBeenCalled();
    await pause(5);
    expect(await tap(screen.getByTestId('booking-confirm-submit'))).toBe('pressed');
    await settle();
    expectRetryIsSafe('consultation booking', BOOK);
  });

  it('A2 (pay step): after the payment request is lost, the retry does not book a SECOND appointment', async () => {
    let n = 0;
    network((call) => {
      const read = bookingReads(call);
      if (read) return read;
      if (BOOK.test(call.path) && call.method === 'POST') return ok({ id: APPT }, 201);
      if (CONSULT_INTENT.test(call.path)) return ++n === 1 ? lost() : deferred().promise;
      return undefined;
    });
    await openBooking();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    expect(alertSpy).toHaveBeenCalled();
    await pause(5);
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    const booked = writes(BOOK);
    if (booked.length > 1 && booked[1].key !== booked[0].key) throw new Error(`consultation pay retry: a second appointment was requested with a new key: ${booked[0].key} vs ${booked[1].key}`);
  });

  it('A2 (pay step): after the payment request is lost, the retry sends the SAME payment Idempotency-Key (or asks for the result)', async () => {
    let n = 0;
    network((call) => {
      const read = bookingReads(call);
      if (read) return read;
      if (BOOK.test(call.path) && call.method === 'POST') return ok({ id: APPT }, 201);
      if (CONSULT_INTENT.test(call.path)) return ++n === 1 ? lost() : deferred().promise;
      return undefined;
    });
    await openBooking();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    await pause(5);
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    expectRetryIsSafe('consultation payment', CONSULT_INTENT);
  });

  it('A3: after a definite server answer (4xx) the patient may try again (a new key is allowed)', async () => {
    let n = 0;
    network((call) => bookingReads(call) ?? (BOOK.test(call.path) && call.method === 'POST' ? (++n === 1 ? ok({ message: 'slot_taken' }, 409) : deferred().promise) : undefined));
    await openBooking();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    await tap(screen.getByTestId('booking-confirm-submit'));
    await settle();
    expect(writes(BOOK)).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------------------------------------------------------- */
/* PAY — insurance co-pay (app/insurance/copay.tsx)                                                                  */
/* ---------------------------------------------------------------------------------------------------------------- */

const REQ = 'req-9a8b7c6d-1111-4222-8333';
const COPAY_INTENT = /^\/payments\/intent\/insurance\/[^/]+$/;
function copayReads(call: Call) {
  if (call.method === 'GET' && call.path === '/insurance/requests/my') return ok([{ id: REQ, state: 'COPAY_PENDING', copay_amount: 30, createdAt: new Date().toISOString() }]);
  return undefined;
}
async function openCopay() {
  mockParams = { approvalCode: 'NPH-1', amount: '30' };
  await render(tree(<InsuranceCopay />));
  await settle();
  return screen.findByText('تأكيد الدفع');
}
const copayButton = () => screen.queryByText('تأكيد الدفع') ?? screen.getByText('جاري الدفع...');

describe('PAY — insurance co-pay (app/insurance/copay.tsx)', () => {
  it('A1: two taps on a slow network send ONE payment request, and the button is disabled while it is in flight', async () => {
    const slow = deferred();
    network((call) => copayReads(call) ?? (COPAY_INTENT.test(call.path) ? slow.promise : undefined));
    await openCopay();
    await tap(copayButton());
    if (!isDisabled(copayButton())) throw new Error('insurance co-pay: the pay button is still enabled while the payment request is in flight');
    await tap(copayButton());
    await settle();
    expectOneWrite('insurance co-pay', COPAY_INTENT);
    slow.resolve(ok({ message: 'invalid_state' }, 409));
    await settle();
  });

  it('A2: after a lost connection a message is shown and the retry sends the SAME Idempotency-Key (or asks for the result)', async () => {
    let n = 0;
    network((call) => copayReads(call) ?? (COPAY_INTENT.test(call.path) ? (++n === 1 ? lost() : deferred().promise) : undefined));
    await openCopay();
    await tap(copayButton());
    await settle();
    expect((globalThis as unknown as { alert: jest.Mock }).alert.mock.calls.length + alertSpy.mock.calls.length).toBeGreaterThan(0);
    await pause(5);
    await tap(copayButton());
    await settle();
    expectRetryIsSafe('insurance co-pay', COPAY_INTENT);
  });

  it('A3: after a definite server answer (4xx) the patient may try again (a new key is allowed)', async () => {
    let n = 0;
    network((call) => copayReads(call) ?? (COPAY_INTENT.test(call.path) ? (++n === 1 ? ok({ message: 'invalid_state' }, 409) : deferred().promise) : undefined));
    await openCopay();
    await tap(copayButton());
    await settle();
    await tap(copayButton());
    await settle();
    expect(writes(COPAY_INTENT)).toHaveLength(2);
  });
});

/* ---------------------------------------------------------------------------------------------------------------- */
/* OFFLINE CART (app/pharmacy/cart.tsx + the real CartProvider)                                                      */
/* ---------------------------------------------------------------------------------------------------------------- */

describe('OFFLINE CART (app/pharmacy/cart.tsx)', () => {
  it('B: add / change / remove work offline with every request failing, are kept on the device, and survive a relaunch', async () => {
    setOffline(true);
    network(() => lost());
    await AsyncStorage.setItem(DEVICE_CART_KEY, JSON.stringify(LINES));
    const first = await render(tree(<PharmacyCart />));
    await waitFor(() => expect(screen.getByTestId('probe').props.children).toBe('ready:m1x2,m2x1'));

    await act(async () => { await cartApi.addItem({ id: 'm3', name: 'دواء ج', rx: false }); }); // added from a product screen
    await tap(screen.getByLabelText(ar('pharmacy.cart.increase', { name: 'دواء أ' })));
    await tap(screen.getByLabelText(ar('pharmacy.cart.remove', { name: 'دواء ب' })));
    await settle();
    await waitFor(() => expect(screen.getByTestId('probe').props.children).toBe('ready:m1x3,m3x1'));
    expect((await storedCart()).map((l: { id: string; qty: number }) => `${l.id}x${l.qty}`)).toEqual(['m1x3', 'm3x1']);
    expect(calls.filter((c) => c.method !== 'GET').map((c) => `${c.method} ${c.path}`)).toEqual([]);

    await act(async () => { first.unmount(); });
    await render(tree(<PharmacyCart />));
    await waitFor(() => expect(screen.getByTestId('probe').props.children).toBe('ready:m1x3,m3x1'));
  });
});
