import React from 'react';
import { act, render, waitFor } from '@testing-library/react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

import Index from '../app/index';
import Welcome from '../app/(auth)/welcome';
import { ensureGuestSession } from '../src/utils/guestSession';
import { makeStore, withStore } from '../src/__tests__/utils/testStore';
import { markIntroDone, resetIntroGateForTests } from '../src/utils/onboardingGate';

/**
 * Batch 0 fixes, launch: the owner's rule (first launch shows Welcome; every later launch opens Home as a guest).
 * The splash decides from the stored session and from whether Welcome was ever shown.
 */

const mockRouter = { push: jest.fn(), replace: jest.fn(), back: jest.fn() };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('react-native-reanimated', () => {
  const { View } = require('react-native');
  const chain = (): unknown => new Proxy(function chained() {}, { get: () => chain(), apply: () => chain() });
  return { __esModule: true, default: { View }, FadeIn: chain(), FadeOut: chain() };
});
jest.mock('../src/utils/guestSession', () => ({ ensureGuestSession: jest.fn(), createGuestSession: jest.fn() }));
jest.mock('../src/components/NabdLogo', () => ({ NabdLogo: () => null }));
jest.mock('react-native-localize', () => ({ getLocales: () => [{ languageCode: 'ar' }] }));
jest.mock('../src/hooks/useSocialLogin', () => ({ useSocialLogin: () => ({ signIn: jest.fn(), busy: false, error: null, clearError: jest.fn() }) }));
jest.mock('expo-apple-authentication', () => ({ AppleAuthenticationButton: () => null, AppleAuthenticationButtonType: { CONTINUE: 1 }, AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 }, AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 }, signInAsync: jest.fn() }));
jest.mock('../src/context/AppContext', () => {
  const real = jest.requireActual('../src/context/AppContext');
  return {
    LANGUAGES: real.LANGUAGES,
    useApp: () => ({ isDark: false, lang: 'ar', isRTL: true, themeMode: 'system', setThemeMode: jest.fn(), setLang: jest.fn() }),
  };
});

const metrics = { frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 47, bottom: 34, left: 0, right: 0 } };
const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;

const launch = async (opts: { token?: string | null; refresh?: string | null; welcomeSeen?: boolean; introDone?: boolean }) => {
  (SecureStore.getItemAsync as jest.Mock).mockImplementation(async (key: string) => (key === 'nabdah_auth_token' ? opts.token ?? null : key === 'nabdah_refresh_token' ? opts.refresh ?? null : null));
  if (opts.welcomeSeen) await AsyncStorage.setItem('@nabdah_onboarding_done', 'true');
  if (opts.introDone) await AsyncStorage.setItem('@nabdah_intro_done_v1', 'true');
  const store = makeStore();
  await render(withStore(<SafeAreaProvider initialMetrics={metrics}><Index /></SafeAreaProvider>, store));
  await act(async () => {
    jest.advanceTimersByTime(2700);
  });
  return store;
};

describe('splash routing (owner rule)', () => {
  beforeEach(async () => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    await AsyncStorage.clear();
    resetIntroGateForTests();
    (ensureGuestSession as jest.Mock).mockResolvedValue({ user: { id: 'g1', role: 'guest' }, token: 'guest-token' });
  });
  afterEach(() => jest.useRealTimers());

  it('first launch (no session, nothing shown): the language step, and no guest session is opened behind it', async () => {
    await launch({});
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/language'));
    expect(ensureGuestSession).not.toHaveBeenCalled();
  });

  it('intro done but Welcome not yet shown (the app was closed on Welcome): Welcome, never the intro again', async () => {
    await launch({ introDone: true });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
    expect(ensureGuestSession).not.toHaveBeenCalled();
  });

  it('the intro flag cannot be read (storage failure): the intro shows, the app is not blocked', async () => {
    // both flags (Welcome shown, intro done) fail to read
    (AsyncStorage.getItem as jest.Mock).mockRejectedValueOnce(new Error('storage')).mockRejectedValueOnce(new Error('storage'));
    await launch({});
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(onboarding)/language'));
  });

  it('the intro flag cannot be written (storage failure): it is remembered for the session, so it is not shown twice', async () => {
    (AsyncStorage.setItem as jest.Mock).mockRejectedValueOnce(new Error('storage'));
    await markIntroDone();
    await launch({});
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
  });

  it('a later launch with no session: Home, with the silent guest session in the slice', async () => {
    const store = await launch({ welcomeSeen: true });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(ensureGuestSession).toHaveBeenCalledTimes(1);
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: true, token: 'guest-token' });
  });

  it('a launch with a stored patient session: Home, no new guest, and the slice learns the patient (and the refresh token)', async () => {
    const token = jwt({ sub: 'u1', role: 'patient', is_guest: false });
    const store = await launch({ token, refresh: 'refresh-1' });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(ensureGuestSession).not.toHaveBeenCalled();
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: false, token, refreshToken: 'refresh-1' });
  });

  it('a launch with a stored guest session: Home, and the slice knows it is a guest', async () => {
    const token = jwt({ sub: 'g1', role: 'guest', is_guest: true });
    const store = await launch({ token });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
    expect(ensureGuestSession).not.toHaveBeenCalled();
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: true });
  });

  it('a session on a device that never showed Welcome (an existing install) goes to Home too', async () => {
    await launch({ token: jwt({ sub: 'u1', role: 'patient' }), welcomeSeen: false });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)'));
  });

  it('an unexpected failure falls back to Welcome', async () => {
    (SecureStore.getItemAsync as jest.Mock).mockImplementation(() => {
      throw new Error('keystore'); // even a synchronous failure of the native module
    });
    (ensureGuestSession as jest.Mock).mockRejectedValue(new Error('x'));
    await render(withStore(<SafeAreaProvider initialMetrics={metrics}><Index /></SafeAreaProvider>));
    await act(async () => {
      jest.advanceTimersByTime(2700);
    });
    await waitFor(() => expect(mockRouter.replace).toHaveBeenCalledWith('/(auth)/welcome'));
  });
});

describe('Welcome marks itself as shown', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    await AsyncStorage.clear();
  });

  it('writes the flag the splash reads, so the next launch opens Home', async () => {
    expect(await AsyncStorage.getItem('@nabdah_onboarding_done')).toBeNull();
    await render(withStore(<SafeAreaProvider initialMetrics={metrics}><Welcome /></SafeAreaProvider>));
    await waitFor(async () => expect(await AsyncStorage.getItem('@nabdah_onboarding_done')).toBe('true'));
  });
});
