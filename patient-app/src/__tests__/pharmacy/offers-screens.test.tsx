import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import BroadcastStatusScreen from '../../../app/pharmacy/broadcast-status';
import FinalQuoteScreen from '../../../app/pharmacy/final-quote';
import WaitingRedirect from '../../../app/pharmacy/waiting-for-pharmacy';
import { message } from '../../components/screen/ScreenKit';

/**
 * Batch 1c, high effort: money and order state. The screens are driven with answers shaped like the backend's
 * (pharmacy-offer.service.ts `patientDtoAsync`, pharmacy-order.service.ts `governedView`); every number is a TEST value.
 * What is proved: the amounts on screen are the server's, a mutation is sent once with the server's own data and a stable
 * idempotency key, the control is disabled while it is pending, a refusal shows a real sentence, and an expired offer
 * cannot be chosen.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockRedirect = jest.fn();

jest.mock('expo-router', () => {
  const R = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
    Redirect: (props: { href: unknown }) => {
      mockRedirect(props.href);
      return null;
    },
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
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

const NOW = Date.now();
const inSeconds = (s: number) => new Date(NOW + s * 1000).toISOString();

const offers = () => [
  { id: 'o1', status: 'open', pharmacy_name_en: 'Test pharmacy 1', pharmacy_name_ar: null, approx_distance_km: 1.5, preparation_minutes: 20, expires_at: inSeconds(600), insurance_ready: true, totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, lines: [{ order_item_id: 'a', name: 'Item A', available: true, offered_qty: 2, unit_price: 35 }] },
  { id: 'o2', status: 'open', pharmacy_name_en: 'Test pharmacy 2', pharmacy_name_ar: null, approx_distance_km: 4, preparation_minutes: 35, expires_at: inSeconds(30), insurance_ready: true, totals: { subtotal: 95, delivery_fee: 0, total: 95, currency: 'SAR' }, lines: [] },
];
const searchingOrder = { id: 'ord', status: 'broadcasting', payment_mode: 'cash' };

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
/** One tap, in its own act scope, with the render it causes flushed before the next line. */
const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
};
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { orderId: 'ord' };
});

describe('offers screen', () => {
  it('draws the server totals, marks the cheapest and the countdown comes from the server expiry', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    expect(screen.getByText(k('pharmacy.offers.received', { n: 2 }))).toBeTruthy();
    expect(screen.getAllByText(k('pharmacy.offers.lowest')).length).toBeGreaterThan(0);
    expect(screen.getByText(/^Offer ends in (10:00|09:5\d)$/)).toBeTruthy();
    expect(screen.getByText(/^Offer ends in 00:(30|29|28)$/)).toBeTruthy();
    // the delivery fee is the server's own number, drawn only because it is above 0
    expect(screen.getByText(k('pharmacy.offers.deliveryFee', { price: `10.00 ${k('pharmacy.currency')}` }))).toBeTruthy();
    expect(screen.getAllByText(/80\.00/).length).toBeGreaterThan(0);
  });

  it('opens an order from the older requestId link too (the redirect used to send requestId, callers send orderId)', async () => {
    mockParams.current = { requestId: 'ord' };
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    expect(apiFetch).toHaveBeenCalledWith('/patient/pharmacy/orders/ord/offers');
  });

  it('choosing an offer sends the server coverage once, with a key, and goes to the order; the control is disabled while pending', async () => {
    let release: (v: unknown) => void = () => undefined;
    const pending = new Promise((r) => { release = r; });
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder }, () => pending);
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');

    await tap(screen.getByLabelText(k('pharmacy.offers.chooseFor', { name: 'Test pharmacy 1' })));
    expect(posts()).toHaveLength(0); // choosing is not confirming
    const confirm = await screen.findByLabelText(k('pharmacy.offers.confirm'));
    await tap(confirm);
    await tap(confirm); // a second tap while pending
    expect(posts()).toHaveLength(1);
    const [path, init] = posts()[0];
    expect(path).toBe('/patient/pharmacy/orders/ord/offers/o1/select');
    expect(JSON.parse(init.body as string)).toEqual({ coverage_mode: 'cash' });
    expect((init.headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
    await waitFor(() => expect(screen.getByLabelText(k('pharmacy.offers.confirm')).props.accessibilityState.disabled).toBe(true));

    await act(async () => release({ offer: {}, next_status: 'cash_card_payment_pending' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/order-tracking', params: { orderId: 'ord', selectedOfferId: 'o1' } }));
    expect(posts()).toHaveLength(1);
  });

  it('insurance is sent only when the patient chose it', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    await tap(screen.getByLabelText(k('pharmacy.offers.chooseFor', { name: 'Test pharmacy 1' })));
    await tap(await screen.findByLabelText(k('pharmacy.offers.coverage.insurance')));
    await tap(screen.getByLabelText(k('pharmacy.offers.confirm')));
    await waitFor(() => expect(posts()).toHaveLength(1));
    expect(JSON.parse(posts()[0][1].body as string)).toEqual({ coverage_mode: 'insurance' });
  });

  it('a refusal shows a real sentence, no fake success, and the control comes back', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder }, () => new Error('prescription_required_for_insurance_orders'));
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    await tap(screen.getByLabelText(k('pharmacy.offers.chooseFor', { name: 'Test pharmacy 1' })));
    await tap(await screen.findByLabelText(k('pharmacy.offers.confirm')));
    await screen.findByText(k('pharmacy.offers.err.rxInsurance'));
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(screen.getByLabelText(k('pharmacy.offers.confirmRetry')).props.accessibilityState.disabled).toBe(false);
    expect(screen.queryByText(/prescription_required/)).toBeNull();
  });

  it('a retry after no answer sends the same idempotency key; after a server answer it sends a new one', async () => {
    let n = 0;
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder }, () => (++n < 3 ? new Error(n === 1 ? 'OFFLINE_ERROR' : 'invalid_coverage_mode') : {}));
    const { newIdempotencyKey } = require('../../utils/api') as { newIdempotencyKey: jest.Mock };
    let seq = 0;
    newIdempotencyKey.mockImplementation(() => `app-nonce-${++seq}-0000000000`);
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    await tap(screen.getByLabelText(k('pharmacy.offers.chooseFor', { name: 'Test pharmacy 1' })));
    await tap(await screen.findByLabelText(k('pharmacy.offers.confirm')));
    await screen.findByText(k('errors.offline'));
    await tap(screen.getByLabelText(k('pharmacy.offers.confirmRetry')));
    await waitFor(() => expect(posts()).toHaveLength(2));
    const key = (i: number) => (posts()[i][1].headers as Record<string, string>)['Idempotency-Key'];
    expect(key(1)).toBe(key(0)); // the first may have arrived: same key
    await waitFor(() => expect(screen.queryByLabelText(k('pharmacy.offers.confirmRetry'))).not.toBeNull());
    await tap(screen.getByLabelText(k('pharmacy.offers.confirmRetry')));
    await waitFor(() => expect(posts()).toHaveLength(3));
    expect(key(2)).not.toBe(key(1)); // the second was answered by the server: a new attempt, a new key
  });

  it('an offer that has expired cannot be chosen', async () => {
    const soon = offers();
    soon[1].expires_at = new Date(Date.now() + 1200).toISOString();
    answer({ '/patient/pharmacy/orders/ord/offers': soon, '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 2');
    await waitFor(() => expect(screen.getByLabelText(k('pharmacy.offers.chooseFor', { name: 'Test pharmacy 2' })).props.accessibilityState.disabled).toBe(true), { timeout: 4000 });
    expect(screen.getAllByText(k('pharmacy.offers.expired')).length).toBeGreaterThan(0);
  });

  it('a cancelled order is a real state with a way back', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': [], '/patient/pharmacy/orders/ord': { id: 'ord', status: 'cancelled' } });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText(k('pharmacy.offers.cancelled'));
    expect(screen.queryByLabelText(k('pharmacy.offers.cancelOrder'))).toBeNull();
  });

  it('an order whose offer is already chosen continues where the order list sends it', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': [], '/patient/pharmacy/orders/ord': { id: 'ord', status: 'cash_card_payment_pending', selected_offer_id: 'o1', governed_state: 'OFFER_SELECTED' } });
    await render(wrap(<BroadcastStatusScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.offers.continueOrder')));
    expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/final-quote', params: { orderId: 'ord' } });
  });

  it('a draft order that was never sent is a real state', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': [], '/patient/pharmacy/orders/ord': { id: 'ord', status: 'draft' } });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText(k('pharmacy.offers.notSent'));
  });

  it('while searching with no offers it says so and draws no offer or privacy line', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': [], '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText(k('pharmacy.offers.none'));
    expect(screen.queryByText(k('pharmacy.offers.privacy'))).toBeNull();
  });

  it('a failed load shows the error state with a retry, never an empty list', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': new Error('api_error'), '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText(k('pharmacy.offers.loadError'));
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
  });

  it('cancelling asks first and sends the cancel only after the confirmation', async () => {
    answer({ '/patient/pharmacy/orders/ord/offers': offers(), '/patient/pharmacy/orders/ord': searchingOrder });
    await render(wrap(<BroadcastStatusScreen />));
    await screen.findByText('Test pharmacy 1');
    await tap(screen.getByLabelText(k('pharmacy.offers.cancelOrder')));
    expect(posts()).toHaveLength(0);
    const buttons = showLocalizedAlert.mock.calls[0][2] as { text: string; onPress?: () => void }[];
    await act(async () => { buttons.find((b) => b.text === k('pharmacy.offers.cancelConfirm'))?.onPress?.(); });
    expect(posts()[0][0]).toBe('/patient/pharmacy/orders/ord/cancel');
  });
});

describe('final quote screen', () => {
  const hash = 'a'.repeat(64);
  const snap = { offer_id: 'o1', offer_version: 3, totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash };
  const selected = { id: 'ord', status: 'cash_card_payment_pending', governed_state: 'OFFER_SELECTED', coverage_mode: 'cash', selected_offer_snapshot: snap, selected_offer_hash: hash, selected_offer_revision: 3, selected_allocation_id: 'al', allocations_detail: [{ id: 'al', items: [{ order_item_id: 'a', name: 'Item A', qty_offered: 2, unit_price: 35, action: 'available' }] }] };

  it('shows the snapshot totals and the chosen lines; accepting sends the snapshot hash and revision, once', async () => {
    let release: (v: unknown) => void = () => undefined;
    const pending = new Promise((r) => { release = r; });
    answer({ '/patient/pharmacy/orders/ord': selected }, () => pending);
    await render(wrap(<FinalQuoteScreen />));
    await screen.findByText(k('pharmacy.quote.review'));
    expect(screen.getAllByText(/80\.00/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Item A/)).toBeTruthy();
    const accept = screen.getByLabelText(k('pharmacy.quote.accept'));
    await tap(accept);
    await tap(accept);
    expect(posts()).toHaveLength(1);
    const [path, init] = posts()[0];
    expect(path).toBe('/patient/pharmacy/orders/ord/final-quote/accept');
    expect(JSON.parse(init.body as string)).toEqual({ quote_hash: hash, quote_revision: 3 });
    await waitFor(() => expect(screen.getByLabelText(k('pharmacy.quote.accept')).props.accessibilityState.disabled).toBe(true));
    await act(async () => release({ ok: true }));
  });

  it('a refusal is a real sentence and nothing is shown as accepted', async () => {
    answer({ '/patient/pharmacy/orders/ord': selected }, () => new Error('quote_hash_or_revision_mismatch'));
    await render(wrap(<FinalQuoteScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.quote.accept')));
    await screen.findByText(k('pharmacy.quote.err.changed'));
    expect(screen.queryByText(k('pharmacy.quote.accepted'))).toBeNull();
  });

  const accepted = { ...selected, governed_state: 'FINAL_QUOTE_ACCEPTED', accepted_quote_snapshot: { ...snap, cod_allowed: true } };

  it('after the server accepted it: pay online, and cash on delivery when the server allows it', async () => {
    answer({ '/patient/pharmacy/orders/ord': accepted });
    await render(wrap(<FinalQuoteScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.quote.payNow')));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pharmacy/payment', params: { orderId: 'ord' } });
    expect(screen.getByLabelText(k('pharmacy.quote.cod'))).toBeTruthy();
  });

  it('no cash on delivery control when the server does not allow it', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...accepted, accepted_quote_snapshot: { ...snap, cod_allowed: false } } });
    await render(wrap(<FinalQuoteScreen />));
    await screen.findByLabelText(k('pharmacy.quote.payNow'));
    expect(screen.queryByLabelText(k('pharmacy.quote.cod'))).toBeNull();
  });

  it('registering cash on delivery posts once and goes to the order', async () => {
    answer({ '/patient/pharmacy/orders/ord': { ...selected, governed_state: 'FINAL_QUOTE_ACCEPTED', accepted_quote_snapshot: { ...snap, cod_allowed: true } } });
    await render(wrap(<FinalQuoteScreen />));
    await tap(await screen.findByLabelText(k('pharmacy.quote.cod')));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/order-tracking', params: { orderId: 'ord' } }));
    expect(posts().map(([p]) => p)).toEqual(['/patient/pharmacy/orders/ord/cod/register']);
  });

  it('no quote to accept is a real state with no accept control', async () => {
    answer({ '/patient/pharmacy/orders/ord': { id: 'ord', status: 'confirmed', governed_state: 'CONFIRMED' } });
    await render(wrap(<FinalQuoteScreen />));
    await screen.findByText(k('pharmacy.quote.none'));
    expect(screen.queryByLabelText(k('pharmacy.quote.accept'))).toBeNull();
  });

  it('a cancelled order is a real state', async () => {
    answer({ '/patient/pharmacy/orders/ord': { id: 'ord', status: 'cancelled', governed_state: 'CANCELLED' } });
    await render(wrap(<FinalQuoteScreen />));
    await screen.findByText(k('pharmacy.offers.cancelled'));
  });

  it('a failed load shows the error state with a retry', async () => {
    answer({ '/patient/pharmacy/orders/ord': new Error('api_error') });
    await render(wrap(<FinalQuoteScreen />));
    await screen.findByText(k('pharmacy.quote.loadError'));
    expect(screen.getByLabelText(k('pharmacy.retry'))).toBeTruthy();
  });
});

describe('waiting-for-pharmacy redirect', () => {
  it('goes to the offers screen of the order from orderId', async () => {
    mockParams.current = { orderId: 'abc' };
    await render(<WaitingRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'abc' } });
  });

  it('and from the older requestId', async () => {
    mockParams.current = { requestId: 'def' };
    await render(<WaitingRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'def' } });
  });

  it('with no order id it opens the order list, not an offers screen with nothing to show', async () => {
    mockParams.current = {};
    await render(<WaitingRedirect />);
    expect(mockRedirect).toHaveBeenLastCalledWith('/orders');
  });
});
