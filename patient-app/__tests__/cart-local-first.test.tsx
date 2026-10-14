import React from 'react';
import { Text } from 'react-native';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';

import authReducer, { guestLogin, loginSuccess, logout, offlineUnauthenticated } from '../src/store/slices/authSlice';
import { listenerMiddleware } from '../src/store/middleware/listenerMiddleware';
import { CartProvider, useCart } from '../src/context/CartContext';
import { CART_OWNER_KEY, DEVICE_CART_KEY, userCartKey } from '../src/utils/pharmacyCartStore';

/**
 * The local-first pharmacy cart (owner decision 2026-10-06) with the REAL provider, the REAL auth slice and the REAL
 * AsyncStorage mock. Only the network, the router and the address lookup are replaced, and the backend is DOWN: every
 * request rejects, so any call the cart made would show in `mockApiFetch` / `mockFetch`.
 */
const mockApiFetch = jest.fn();
const mockFetch = jest.fn(() => Promise.reject(new TypeError('backend down')));
const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true) };
jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../src/utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), newIdempotencyKey: () => 'test-nonce-0001', BASE_URL: 'https://api.example.test/api/v1' }));
jest.mock('../src/utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../src/utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../src/utils/selectedAddress', () => ({ resolveEffectiveAddress: jest.fn(async () => ({ id: 'a1', label: 'Test home', street: 'Test street', city: 'Test city', lat: 24.7, lng: 46.6 })) }));
jest.mock('expo-router', () => {
  const R = require('react');
  return {
    get router() {
      return mockRouter;
    },
    useLocalSearchParams: () => ({}),
    useFocusEffect: (cb: () => void | (() => void)) => {
      R.useEffect(() => cb(), []); // eslint-disable-line react-hooks/exhaustive-deps
    },
  };
});
jest.mock('../src/context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));
jest.mock('../src/components/LocalizedAlert', () => ({ showLocalizedAlert: jest.fn() }));

import Cart from '../app/pharmacy/cart';
import Checkout from '../app/pharmacy/checkout';

const AR = require('../src/i18n/locales/ar.json') as Record<string, string>;
const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const makeStore = () =>
  configureStore({
    reducer: { auth: authReducer },
    middleware: (getDefault) => getDefault().prepend(listenerMiddleware.middleware),
  });

type CartApi = ReturnType<typeof useCart>;
let api: CartApi;
function Probe() {
  api = useCart();
  return <Text testID="probe">{api.ready ? `ready:${api.items.map((i) => `${i.id}x${i.qty}`).join(',')}` : 'loading'}</Text>;
}
const tree = (store: ReturnType<typeof makeStore>, ui: React.ReactNode = null) => (
  <Provider store={store}>
    <SafeAreaProvider initialMetrics={metrics}>
      <CartProvider>
        <Probe />
        {ui}
      </CartProvider>
    </SafeAreaProvider>
  </Provider>
);
const probe = () => screen.getByTestId('probe').props.children as string;
const cartKeys = async () => (await AsyncStorage.getAllKeys()).filter((key) => key.startsWith('@nabd_cart_v2:')).sort();
const med = (id: string, name: string, extra: Record<string, unknown> = {}) => ({ id, name, rx: false, ...extra });
const user = (id: string) => ({ id, role: 'patient' }) as never;

beforeEach(async () => {
  jest.clearAllMocks();
  mockApiFetch.mockRejectedValue(new Error('OFFLINE_ERROR'));
  mockFetch.mockClear();
  (globalThis as { fetch?: unknown }).fetch = mockFetch;
  await AsyncStorage.clear();
});

describe('the provider with the backend down', () => {
  it('add, change and remove work and persist, with zero requests; a relaunch shows the same cart', async () => {
    const store = makeStore();
    const first = await render(tree(store));
    await waitFor(() => expect(probe()).toBe('ready:'));
    await act(async () => {
      await api.addItem({ ...med('m1', 'دواء أ'), qty: 2, price: 12.5 } as never);
      await api.addItem(med('m2', 'دواء ب', { rx: true }));
      await api.updateQty('m1', 1);
    });
    expect(probe()).toBe('ready:m1x3,m2x1');
    expect(api.hasRxItems).toBe(true);
    expect(api.itemCount).toBe(4);
    await act(async () => { await api.removeItem('m2'); });
    expect(probe()).toBe('ready:m1x3');
    expect(JSON.parse((await AsyncStorage.getItem(DEVICE_CART_KEY))!)).toEqual([expect.objectContaining({ id: 'm1', qty: 3 })]);
    expect(await AsyncStorage.getItem(DEVICE_CART_KEY)).not.toMatch(/price/);
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();

    await act(async () => { first.unmount(); });
    await render(tree(makeStore())); // the app was closed and opened again
    await waitFor(() => expect(probe()).toBe('ready:m1x3'));
  });
});

describe('the cart follows the signed-in patient', () => {
  it('signing in merges the device cart into the patient’s cart (quantities summed), under the patient’s own key, and the device key goes', async () => {
    await AsyncStorage.setItem(userCartKey('u1'), JSON.stringify([{ id: 'm1', name: 'دواء أ', qty: 3, rx: false }, { id: 'm3', name: 'دواء ج', qty: 1, rx: false }]));
    const store = makeStore();
    await render(tree(store));
    await waitFor(() => expect(probe()).toBe('ready:'));
    await act(async () => {
      await api.addItem({ ...med('m1', 'دواء أ'), qty: 2 });
      await api.addItem(med('m2', 'دواء ب'));
    });
    expect(await cartKeys()).toEqual([DEVICE_CART_KEY, userCartKey('u1')].sort()); // the patient's own cart already exists on this device

    await act(async () => { store.dispatch(loginSuccess({ user: user('u1'), token: 't' })); });
    await waitFor(() => expect(probe()).toBe('ready:m1x5,m3x1,m2x1'));
    await waitFor(async () => expect(await cartKeys()).toEqual([CART_OWNER_KEY, userCartKey('u1')].sort()));
    expect(await AsyncStorage.getItem(DEVICE_CART_KEY)).toBeNull();
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('a guest account shares the device cart and changes nothing; another patient on the same device has their own cart', async () => {
    const store = makeStore();
    await render(tree(store));
    await waitFor(() => expect(probe()).toBe('ready:'));
    await act(async () => { await api.addItem(med('m1', 'دواء أ')); });
    await act(async () => { store.dispatch(guestLogin({ user: user('g1'), token: 't' })); });
    expect(probe()).toBe('ready:m1x1');
    expect(await cartKeys()).toEqual([DEVICE_CART_KEY]);

    await act(async () => { store.dispatch(loginSuccess({ user: user('u1'), token: 't' })); });
    await waitFor(() => expect(probe()).toBe('ready:m1x1'));
    await act(async () => { await api.addItem(med('m5', 'دواء هـ')); });
    await act(async () => { store.dispatch(logout()); });
    await act(async () => { store.dispatch(loginSuccess({ user: user('u2'), token: 't' })); });
    await waitFor(() => expect(probe()).toBe('ready:'));
  });

  it('signing out clears the cart on the screen and every cart key on the device', async () => {
    const store = makeStore();
    await render(tree(store));
    await waitFor(() => expect(probe()).toBe('ready:'));
    await act(async () => { store.dispatch(loginSuccess({ user: user('u1'), token: 't' })); });
    await act(async () => { await api.addItem(med('m1', 'دواء أ')); });
    await AsyncStorage.setItem(userCartKey('u2'), '[]');
    await waitFor(async () => expect((await cartKeys()).length).toBeGreaterThan(1));
    expect(probe()).toBe('ready:m1x1');

    await act(async () => { store.dispatch(logout()); });
    await waitFor(() => expect(probe()).toBe('ready:'));
    await waitFor(async () => expect(await cartKeys()).toEqual([]));
    await render(tree(makeStore()));
    await waitFor(() => expect(screen.getAllByTestId('probe').pop()!.props.children).toBe('ready:'));
  });

  it('a session that ends offline (offlineUnauthenticated) clears the cart like a sign-out (needs-review issue 361)', async () => {
    const store = makeStore();
    await render(tree(store));
    await waitFor(() => expect(probe()).toBe('ready:'));
    await act(async () => { store.dispatch(loginSuccess({ user: user('u1'), token: 't' })); });
    await act(async () => { await api.addItem(med('m1', 'دواء أ')); });
    expect(probe()).toBe('ready:m1x1');
    await act(async () => { store.dispatch(offlineUnauthenticated()); });
    await waitFor(() => expect(probe()).toBe('ready:'));
    await waitFor(async () => expect(await cartKeys()).toEqual([]));
  });
});

describe('the cart screen', () => {
  it('opens with no request and draws no price, total or stock', async () => {
    await AsyncStorage.setItem(DEVICE_CART_KEY, JSON.stringify([{ id: 'm1', name: 'دواء أ', qty: 2, rx: false, price: 12.5 }]));
    await render(tree(makeStore(), <Cart />));
    await waitFor(() => expect(screen.getByText('دواء أ')).toBeTruthy());
    expect(screen.queryByText(/ر\.س|SAR|\d+\.\d\d|المجموع|الإجمالي/)).toBeNull();
    expect(mockApiFetch).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('shows the empty state when the device really holds nothing', async () => {
    await render(tree(makeStore(), <Cart />));
    await waitFor(() => expect(screen.getByText(AR['pharmacy.cart.emptyTitle'])).toBeTruthy());
    expect(mockApiFetch).not.toHaveBeenCalled();
  });
});

describe('sending the request (the only step that needs the backend)', () => {
  const lines = [{ id: 'm1', name: 'دواء أ', qty: 2, rx: false }, { id: 'm2', name: 'دواء ب', qty: 1, rx: false }];
  const stored = async () => JSON.parse((await AsyncStorage.getItem(DEVICE_CART_KEY)) ?? '[]');
  const tap = async (el: Parameters<typeof fireEvent.press>[0]) => {
    await act(async () => { fireEvent.press(el); });
  };
  async function openCheckout() {
    await AsyncStorage.setItem(DEVICE_CART_KEY, JSON.stringify(lines));
    await render(tree(makeStore(), <Checkout />));
    const submit = await screen.findByLabelText(AR['pharmacy.checkout.submit']);
    await waitFor(() => expect(submit.props.accessibilityState.disabled).toBe(false));
    return submit;
  }

  it.each([
    ['the backend is down (no connection)', new Error('OFFLINE_ERROR'), 'errors.offline'],
    ['the server fails (5xx)', new Error('Internal server error'), 'pharmacy.checkout.err.send'],
    ['the server refuses (4xx)', new Error('items_required'), 'pharmacy.checkout.err.items'],
    ['the session is not allowed (403)', new Error('AUTH_ERROR_403: Insufficient role'), 'pharmacy.checkout.err.signIn'],
  ])('when %s the error is shown, the cart is exactly as it was, and nothing was cleared', async (_name, failure, key) => {
    mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method === 'POST') throw failure;
      return {};
    });
    const submit = await openCheckout();
    await tap(submit);
    await screen.findByText(AR[key]);
    expect(await stored()).toEqual(lines);
    expect(probe()).toBe('ready:m1x2,m2x1');
    expect(mockRouter.replace).not.toHaveBeenCalled();
    // and the patient can send again
    expect(screen.getByLabelText(AR['pharmacy.checkout.submit']).props.accessibilityState.disabled).toBe(false);
  });

  it('created but not submitted (the second call fails): the cart is kept; the retry only submits the same order and then clears the cart', async () => {
    let submits = 0;
    mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => {
      if (init?.method !== 'POST') return {};
      if (path.endsWith('/submit')) {
        submits += 1;
        if (submits === 1) throw new Error('OFFLINE_ERROR');
        return {};
      }
      return { id: 'order-new-1' };
    });
    const submit = await openCheckout();
    await tap(submit);
    await screen.findByText(AR['errors.offline']);
    expect(await stored()).toEqual(lines);
    await tap(screen.getByLabelText(AR['pharmacy.checkout.submit']));
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'order-new-1' } }));
    expect(mockApiFetch.mock.calls.filter(([p, init]) => p === '/patient/pharmacy/orders' && init?.method === 'POST')).toHaveLength(1);
    await waitFor(async () => expect(await stored()).toEqual([]));
  });

  it('success (created and submitted) clears the cart on screen and on the device', async () => {
    mockApiFetch.mockImplementation(async (path: string, init?: { method?: string }) => (init?.method === 'POST' && !path.endsWith('/submit') ? { id: 'order-new-1' } : {}));
    const submit = await openCheckout();
    await tap(submit);
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith({ pathname: '/pharmacy/broadcast-status', params: { orderId: 'order-new-1' } }));
    await waitFor(() => expect(probe()).toBe('ready:'));
    expect(await stored()).toEqual([]);
    const body = JSON.parse(mockApiFetch.mock.calls.find(([p, init]) => p === '/patient/pharmacy/orders' && init?.method === 'POST')![1].body as string);
    expect(JSON.stringify(body)).not.toMatch(/price|subtotal/i);
  });
});
