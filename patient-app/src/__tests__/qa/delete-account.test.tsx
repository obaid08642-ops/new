import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import { PrivacyView } from '../../components/account/PrivacyView';
import authReducer, { loginSuccess } from '../../store/slices/authSlice';
import cartReducer, { addToCart } from '../../store/slices/cartSlice';

/** PT-36: account deletion (PDPL). Confirm, password, DELETE /users/me, then every local trace of the session goes. Every value is a TEST value. */

jest.mock('expo-router', () => ({
  router: { push: jest.fn(), replace: jest.fn(), back: jest.fn(), canGoBack: jest.fn(() => true), setParams: jest.fn() },
  useLocalSearchParams: () => ({ tab: 'delete' }),
  useFocusEffect: (cb: () => void | (() => void)) => require('react').useEffect(cb, [cb]),
}));
jest.mock('react-native-localize', () => ({ getLocales: () => [], findBestLanguageTag: () => undefined, getCalendar: () => 'gregorian' }));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'en', isRTL: false }) }));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('../../utils/logger', () => ({ logError: jest.fn() }));
jest.mock('../../utils/isOffline', () => ({ isOffline: jest.fn(async () => false) }));
jest.mock('../../utils/api', () => ({ BASE_URL: 'https://api.example.test/api/v1', R2_PUBLIC_URL: 'https://cdn.example.test', apiFetch: jest.fn() }));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(async () => 'test-refresh'), deleteItemAsync: jest.fn(async () => undefined), setItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ removeItem: jest.fn(async () => undefined), getItem: jest.fn(), setItem: jest.fn() }));

/* eslint-disable @typescript-eslint/no-require-imports */
const { apiFetch } = require('../../utils/api') as { apiFetch: jest.Mock };
const { router } = require('expo-router') as { router: { replace: jest.Mock } };
const SecureStore = require('expo-secure-store') as { deleteItemAsync: jest.Mock };
/* eslint-enable @typescript-eslint/no-require-imports */

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };

async function setup() {
  const store = configureStore({ reducer: { auth: authReducer, cart: cartReducer }, middleware: (g) => g({ serializableCheck: false, immutableCheck: false }) });
  store.dispatch(loginSuccess({ user: { id: 'u1', name: 'Test User' }, token: 'test-access', refreshToken: 'test-refresh' } as never));
  store.dispatch(addToCart({ id: 'p1', name: 'Test item', price: 5, quantity: 1 } as never));
  await render(<Provider store={store}><SafeAreaProvider initialMetrics={metrics}><PrivacyView /></SafeAreaProvider></Provider>);
  return store;
}
async function walkToFinal(password: string) {
  await act(async () => { fireEvent.press(await screen.findByTestId('delete-account')); });
  await act(async () => { fireEvent.press(screen.getByTestId('delete-continue')); });
  await act(async () => { fireEvent.changeText(screen.getByTestId('delete-password'), password); });
  await act(async () => { fireEvent.press(screen.getByTestId('delete-form-save')); });
}

beforeEach(() => { apiFetch.mockReset(); router.replace.mockReset(); SecureStore.deleteItemAsync.mockClear(); });

describe('account deletion (PT-36)', () => {
  it('does not call the backend before the confirmation and the password', async () => {
    await setup();
    await act(async () => { fireEvent.press(await screen.findByTestId('delete-account')); });
    expect(apiFetch).not.toHaveBeenCalled();
    await act(async () => { fireEvent.press(screen.getByTestId('delete-cancel')); });
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('on success calls DELETE /users/me with the password, clears the stored tokens, the auth state and the cart, and opens login', async () => {
    apiFetch.mockResolvedValue({ ok: true });
    const store = await setup();
    expect(store.getState().cart.items.length).toBeGreaterThan(0);
    await walkToFinal('test-password');
    await waitFor(() => expect(router.replace).toHaveBeenCalledWith('/(auth)/login'));
    const del = apiFetch.mock.calls.find(([, init]) => init?.method === 'DELETE');
    expect(del[0]).toBe('/users/me');
    expect(JSON.parse(del[1].body)).toEqual({ password: 'test-password' });
    expect(SecureStore.deleteItemAsync.mock.calls.length).toBeGreaterThanOrEqual(3);
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(store.getState().auth.token).toBeNull();
    expect(store.getState().cart.items).toHaveLength(0);
  });

  it('on refusal (wrong password) keeps the session, shows the translated message and does not leave', async () => {
    apiFetch.mockRejectedValue(new Error('invalid_password'));
    const store = await setup();
    await walkToFinal('test-wrong');
    expect(await screen.findByText('The account was not deleted. Check your password and try again.')).toBeTruthy();
    expect(router.replace).not.toHaveBeenCalled();
    expect(SecureStore.deleteItemAsync).not.toHaveBeenCalled();
    expect(store.getState().auth.isAuthenticated).toBe(true);
    expect(store.getState().cart.items.length).toBeGreaterThan(0);
  });
});
