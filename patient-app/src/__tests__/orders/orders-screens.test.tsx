import React from 'react';
import { Linking } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import OrderCenterScreen from '../../../app/orders/index';
import PharmacyOrderHistoryScreen from '../../../app/pharmacy/order-history';
import OrderTrackingScreen from '../../../app/pharmacy/order-tracking';
import PharmacyReorderScreen from '../../../app/pharmacy/reorder';
import { AddressBookView } from '../../components/account/AddressBookView';
import { message } from '../../components/screen/ScreenKit';
import { hashRef } from '../../utils/orderCenter';

/**
 * Batch 1e: orders list, pharmacy order history, order tracking, order again, delivery address. The screens are driven with
 * answers shaped like the backend's (pharmacy-order.service.ts list / detail, users.addresses.controller.ts); every value is
 * a TEST value. What is proved: a row opens the step the order is at, a failed source is said and retried, tracking draws
 * only what the server recorded, a new request is sent once with a stable key, and the address picked is the one kept.
 */

const mockParams: { current: Record<string, string | undefined> } = { current: {} };
const mockAddress: { current: Record<string, unknown> | null } = { current: { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 } };
const mockPicked: { current: { id: string } | null } = { current: null };

jest.mock('expo-router', () => {
  const R = require('react');
  return {
    router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) },
    useLocalSearchParams: () => mockParams.current,
    useFocusEffect: (cb: () => void | (() => void)) => R.useEffect(cb, [cb]),
  };
});
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../utils/selectedAddress', () => ({
  ...jest.requireActual('../../utils/selectedAddress'),
  resolveEffectiveAddress: jest.fn(async () => mockAddress.current),
  getSelectedAddress: jest.fn(async () => mockPicked.current),
  setSelectedAddress: jest.fn(async () => undefined),
}));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn(), newIdempotencyKey: jest.fn(() => 'app-test-nonce-0001') }));

// eslint-disable-next-line @typescript-eslint/no-require-imports
const mockRouter = (require('expo-router') as { router: Record<'push' | 'replace' | 'back' | 'canGoBack', jest.Mock> }).router;
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { setSelectedAddress } = require('../../utils/selectedAddress') as { setSelectedAddress: jest.Mock };

const k = (key: string, vars?: Record<string, string | number>) => message('en', key, vars);
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const wrap = (ui: React.ReactElement) => <SafeAreaProvider initialMetrics={metrics}>{ui}</SafeAreaProvider>;

const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
  await act(async () => {
    fireEvent.press(el);
  });
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
    return [];
  });
}
const posts = () => apiFetch.mock.calls.filter(([, init]) => init?.method === 'POST');

const snap = { totals: { subtotal: 70, delivery_fee: 10, total: 80, currency: 'SAR' }, hash: 'a'.repeat(64) };
const stored = (id: string, status: string, extra: Record<string, unknown> = {}) => ({ id, status, createdAt: '2026-10-01T10:00:00Z', items: [{ id: `${id}-i1`, raw_name: 'Test item' }], ...extra });

beforeEach(() => {
  jest.clearAllMocks();
  mockParams.current = { orderId: 'ord-aaaaaa111111' };
  mockPicked.current = null;
  mockAddress.current = { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 };
});

describe('pharmacy order history', () => {
  it('opens the offers for an order still looking for them, and the order again screen for a delivered one', async () => {
    answer({
      '/patient/pharmacy/orders': [
        stored('ord-aaaaaa111111', 'broadcasting'),
        stored('ord-bbbbbb222222', 'delivered', { selected_offer_id: 'o1', payment_status: 'paid', pricing_snapshot: snap }),
      ],
    });
    await render(wrap(<PharmacyOrderHistoryScreen />));
    const searching = await screen.findByLabelText(new RegExp(`${k('orders.status.findingOffers')}`));
    await tap(searching);
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'ord-aaaaaa111111' } });
    // the delivered one is in the previous tab
    await tap(screen.getByLabelText(k('orders.tab.previous')));
    expect(screen.getByText(k('orders.action.reorder'))).toBeTruthy();
    await tap(screen.getByLabelText(new RegExp(k('orders.status.delivered'))));
    expect(mockRouter.push).toHaveBeenLastCalledWith({ pathname: '/pharmacy/reorder', params: { orderId: 'ord-bbbbbb222222' } });
  });

  it('says so when the list cannot be loaded, and loads it again on retry', async () => {
    answer({ '/patient/pharmacy/orders': new Error('server_error') });
    await render(wrap(<PharmacyOrderHistoryScreen />));
    await screen.findByText(k('orders.loadError'));
    answer({ '/patient/pharmacy/orders': [stored('ord-aaaaaa111111', 'confirmed', { selected_offer_id: 'o1' })] });
    await tap(screen.getByLabelText(k('pharmacy.retry')));
    await screen.findByLabelText(new RegExp(k('orders.status.confirmed')));
  });
});

describe('orders center', () => {
  it('lists the orders of every service and says once when some sections failed', async () => {
    answer({
      '/care/appointments': [{ id: 'ap1', status: 'CONFIRMED', doctor_name: 'Dr Test', service_type: 'video', slot_start: '2026-10-05T09:00:00Z' }],
      '/labs/bookings/mine': new Error('server_error'),
    });
    await render(wrap(<OrderCenterScreen />));
    await screen.findByLabelText(new RegExp('Dr Test'));
    expect(screen.getByText(k('orders.partial', { n: 1 }))).toBeTruthy();
  });

  it('shows the empty state of the tab when there is nothing, and the error state when every source failed', async () => {
    answer({});
    await render(wrap(<OrderCenterScreen />));
    await screen.findByText(k('orders.emptyCurrent'));
    answer({
      '/care/appointments': new Error('x'), '/orders/mine': new Error('x'), '/patient/pharmacy/orders': new Error('x'), '/labs/bookings/mine': new Error('x'), '/radiology/bookings/mine': new Error('x'),
      '/home-care/bookings/my': new Error('x'), '/insurance/claims': new Error('x'), '/pharmacy/returns': new Error('x'), '/emergency/my/active': new Error('x'),
    });
    await render(wrap(<OrderCenterScreen />));
    await waitFor(() => expect(screen.getAllByText(k('orders.loadError')).length).toBeGreaterThan(0));
  });
});

describe('order tracking', () => {
  const moving = {
    ...stored('ord-ccccdd334455', 'out_for_delivery'),
    governed_state: 'OUT_FOR_DELIVERY',
    payment_status: 'paid',
    selected_offer_id: 'o1',
    fulfillment: 'delivery',
    pricing_snapshot: snap,
    timeline: [{ ts: '2026-10-06T09:00:00Z', event: 'all_allocations_confirmed' }, { ts: '2026-10-06T10:00:00Z', event: 'fulfillment_started' }, { ts: '2026-10-06T12:00:00Z', event: 'first_out_for_delivery' }],
    delivery: { courier_name: 'Test courier', courier_phone: '+966500000000', courier_eta: '2026-10-06T13:30:00Z' },
  };

  it('draws the steps, the courier and the arrival time from the order, and calls the courier', async () => {
    mockParams.current = { orderId: 'ord-ccccdd334455' };
    const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': moving });
    await render(wrap(<OrderTrackingScreen />));
    await screen.findByText(k('orders.track.eta'));
    expect(screen.getByText(k('orders.track.number', { n: hashRef('334455') }))).toBeTruthy();
    expect(screen.getByText('Test courier')).toBeTruthy();
    for (const step of ['accepted', 'preparing', 'onTheWay', 'delivered']) expect(screen.getAllByLabelText(new RegExp(k(`orders.track.step.${step}`))).length).toBeGreaterThan(0);
    await tap(screen.getByLabelText(k('orders.track.call')));
    expect(open).toHaveBeenCalledWith('tel:+966500000000');
    // no map, no driver rating, no invented vehicle
    expect(screen.queryByText(/map/i)).toBeNull();
  });

  it('draws no courier and no arrival time when the pharmacy gave none', async () => {
    mockParams.current = { orderId: 'ord-ccccdd334455' };
    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': { ...moving, delivery: undefined } });
    await render(wrap(<OrderTrackingScreen />));
    expect((await screen.findAllByText(k('orders.track.step.onTheWay'))).length).toBeGreaterThan(0);
    expect(screen.queryByText(k('orders.track.eta'))).toBeNull();
    expect(screen.queryByText(k('orders.track.courier'))).toBeNull();
  });

  it('a delivered order offers the rating, a cancelled one only says it was cancelled, a missing one says so', async () => {
    mockParams.current = { orderId: 'ord-ccccdd334455' };
    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': { ...moving, status: 'delivered', governed_state: 'DELIVERED' } });
    await render(wrap(<OrderTrackingScreen />));
    await tap(await screen.findByLabelText(k('orders.track.rate')));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/reviews', params: { booking_kind: 'pharmacy', booking_id: 'ord-ccccdd334455' } });

    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': { ...moving, status: 'cancelled', governed_state: 'CANCELLED' } });
    await render(wrap(<OrderTrackingScreen />));
    await screen.findByText(k('orders.track.cancelled'));

    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': new Error('order_not_found') });
    await render(wrap(<OrderTrackingScreen />));
    await screen.findByText(k('orders.track.notFound'));
  });

  it('an order that still needs the patient offers the way on', async () => {
    mockParams.current = { orderId: 'ord-ccccdd334455' };
    answer({ '/patient/pharmacy/orders/ord-ccccdd334455': { ...stored('ord-ccccdd334455', 'cash_card_payment_pending'), governed_state: 'FINAL_QUOTE_READY', selected_offer_id: 'o1', pricing_snapshot: snap } });
    await render(wrap(<OrderTrackingScreen />));
    await tap(await screen.findByLabelText(k('orders.track.continueQuote')));
    expect(mockRouter.push).toHaveBeenCalledWith({ pathname: '/pharmacy/final-quote', params: { orderId: 'ord-ccccdd334455' } });
  });
});

describe('order again', () => {
  const earlier = { ...stored('ord-aaaaaa111111', 'delivered'), items: [{ id: 'uuid-1', raw_name: 'Panadol', qty: 2, matched_sku: 'SKU-1' }, { id: 'uuid-2', raw_name: 'Vitamin C', qty: 1 }] };

  it('sends the lines kept once (create then submit), without the order item id as a code, and opens the offers', async () => {
    let release: (v: unknown) => void = () => undefined;
    const creating = new Promise((r) => { release = r; });
    answer({ '/patient/pharmacy/orders/ord-aaaaaa111111': earlier }, (path) => (path.endsWith('/submit') ? {} : creating));
    await render(wrap(<PharmacyReorderScreen />));
    await screen.findByText('Panadol');
    const submit = screen.getByLabelText(k('orders.reorder.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit);
    await tap(submit); // a second tap while the first is running
    expect(posts()).toHaveLength(1);
    await act(async () => release({ id: 'order-new-1' }));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'order-new-1' } }));
    const body = JSON.parse(posts()[0][1].body as string);
    expect(body.items.map((i: { raw_name: string; qty: number; sku?: string }) => [i.raw_name, i.qty, i.sku])).toEqual([['Panadol', 2, 'SKU-1'], ['Vitamin C', 1, undefined]]);
    expect(JSON.stringify(body)).not.toContain('uuid-');
    expect((posts()[0][1].headers as Record<string, string>)['Idempotency-Key']).toMatch(/^[A-Za-z0-9._:-]{16,128}$/);
  });

  it('a line that is unchecked is not sent', async () => {
    answer({ '/patient/pharmacy/orders/ord-aaaaaa111111': earlier }, (path) => (path.endsWith('/submit') ? {} : { id: 'order-new-1' }));
    await render(wrap(<PharmacyReorderScreen />));
    await screen.findByText('Panadol');
    await tap(screen.getByLabelText('Vitamin C'));
    await tap(screen.getByLabelText(k('orders.reorder.submit')));
    await waitFor(() => expect(posts()).toHaveLength(2));
    expect(JSON.parse(posts()[0][1].body as string).items).toHaveLength(1);
  });

  it('with no map point the request is not sent and the patient is told to choose a location', async () => {
    mockAddress.current = { id: 'a3', label: 'No point', street: 'Street' };
    answer({ '/patient/pharmacy/orders/ord-aaaaaa111111': earlier });
    await render(wrap(<PharmacyReorderScreen />));
    await screen.findByText('Panadol');
    const submit = screen.getByLabelText(k('orders.reorder.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit);
    await screen.findByText(k('pharmacy.checkout.err.location'));
    expect(posts()).toHaveLength(0);
  });

  it('after no answer the same keys are sent again and no second order is created', async () => {
    let submits = 0;
    answer({ '/patient/pharmacy/orders/ord-aaaaaa111111': earlier }, (path) => {
      if (path.endsWith('/submit')) {
        submits += 1;
        return submits === 1 ? new Error('OFFLINE_ERROR') : {};
      }
      return { id: 'order-new-1' };
    });
    await render(wrap(<PharmacyReorderScreen />));
    await screen.findByText('Panadol');
    const submit = screen.getByLabelText(k('orders.reorder.submit'));
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    await tap(submit);
    await screen.findByText(k('errors.offline'));
    await tap(screen.getByLabelText(k('orders.reorder.submit')));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalled());
    const calls = posts();
    expect(calls.map(([p]) => p)).toEqual(['/patient/pharmacy/orders', '/patient/pharmacy/orders/order-new-1/submit', '/patient/pharmacy/orders/order-new-1/submit']);
    expect((calls[1][1].headers as Record<string, string>)['Idempotency-Key']).toBe((calls[2][1].headers as Record<string, string>)['Idempotency-Key']);
  });
});

describe('delivery address (the address book in pick mode, ?select=1)', () => {
  beforeEach(() => {
    mockParams.current = { select: '1' };
  });
  const list = [
    { id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6, is_default: true },
    { id: 'a2', label: 'Test work', street: 'Work street', lat: 24.8, lng: 46.7 },
    { id: 'a3', street: 'No point street' },
  ];

  it('starts on the default, shows which address has no map point, and keeps the one confirmed', async () => {
    answer({ '/users/me/addresses': list });
    await render(wrap(<AddressBookView />));
    const home = await screen.findByLabelText(new RegExp('Test home'));
    expect(home.props.accessibilityState.checked).toBe(true);
    expect(screen.getByText(k('address.noPoint'))).toBeTruthy();
    await tap(screen.getByLabelText(new RegExp('Test work')));
    await tap(screen.getByLabelText(k('address.confirm')));
    await waitFor(() => expect(setSelectedAddress).toHaveBeenCalledTimes(1));
    expect(setSelectedAddress.mock.calls[0][0]).toMatchObject({ id: 'a2', label: 'Test work' });
    expect(mockRouter.back).toHaveBeenCalled();
  });

  it('starts on the address picked last when it is still saved', async () => {
    mockPicked.current = { id: 'a2' };
    answer({ '/users/me/addresses': list });
    await render(wrap(<AddressBookView />));
    const work = await screen.findByLabelText(new RegExp('Test work'));
    expect(work.props.accessibilityState.checked).toBe(true);
  });

  it('says so when there are no saved addresses, with the way to add one on the map', async () => {
    answer({ '/users/me/addresses': [] });
    await render(wrap(<AddressBookView />));
    await tap(await screen.findByLabelText(k('address.add')));
    expect(mockRouter.push).toHaveBeenCalledWith('/shared/location-picker');
  });

  it('says so when the addresses cannot be loaded and offers a retry', async () => {
    answer({ '/users/me/addresses': new Error('server_error') });
    await render(wrap(<AddressBookView />));
    await screen.findByText(k('address.loadError'));
    answer({ '/users/me/addresses': list });
    await tap(screen.getByLabelText(k('consult.retry')));
    await screen.findByLabelText(new RegExp('Test home'));
  });
});
