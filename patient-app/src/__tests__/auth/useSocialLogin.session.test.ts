import React from 'react';
import { Platform } from 'react-native';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AppleAuthentication from 'expo-apple-authentication';

import { useSocialLogin } from '../../hooks/useSocialLogin';
import { apiFetch, storeAuthSession } from '../../../utils/api';
import { guestLogin } from '../../store/slices/authSlice';
import { makeStore } from '../utils/testStore';

const mockRouter = { replace: jest.fn() };
jest.mock('expo-router', () => ({
  get router() {
    return mockRouter;
  },
}));
jest.mock('../../../utils/api', () => ({ apiFetch: jest.fn(), storeAuthSession: jest.fn() }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({ signInAsync: jest.fn(), AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 } }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: () => [null, null, jest.fn()] }));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'nabdplus://redirect',
  useAuthRequest: () => [{ codeVerifier: 'v' }, null, jest.fn()],
  exchangeCodeAsync: jest.fn(),
}));

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;
const ACCESS = jwt({ sub: 'u9', role: 'patient', is_guest: false });
const ANSWER = { user: { id: 'u9', full_name: 'Apple User' }, token: { accessToken: ACCESS, refreshToken: 'refresh-9' } };

describe('social sign-in starts the same session as the password login', () => {
  const original = Platform.OS;
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    (AppleAuthentication.signInAsync as jest.Mock).mockResolvedValue({ identityToken: 'identity-token', fullName: null, email: null });
  });
  afterAll(() => {
    Platform.OS = original;
  });

  const run = async (store = makeStore()) => {
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store, children });
    const { result } = await renderHook(() => useSocialLogin(), { wrapper });
    await act(async () => {
      await result.current.signIn('apple');
    });
    return { result, store };
  };

  it('sends the provider token without the stored guest token (skipAuth), and keeps BOTH tokens in secure storage', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await run();
    expect(apiFetch).toHaveBeenCalledWith('/auth/social-login', expect.objectContaining({ method: 'POST', skipAuth: true }));
    expect(JSON.parse((apiFetch as jest.Mock).mock.calls[0][1].body)).toEqual({ provider: 'apple', token: 'identity-token' });
    expect(storeAuthSession).toHaveBeenCalledWith(ANSWER.token); // access AND refresh token
    expect(mockRouter.replace).toHaveBeenCalledWith('/(tabs)');
  });

  it('never writes the token to AsyncStorage (no plaintext fallback)', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await run();
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('the auth slice becomes the signed-in patient: isGuest cleared, so the guard and the push registration see the user', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    const store = makeStore();
    store.dispatch(guestLogin({ user: { id: 'g1', role: 'guest' } as never, token: 'guest-token' }));
    await run(store);
    expect(store.getState().auth).toMatchObject({ isAuthenticated: true, isGuest: false, token: ACCESS, refreshToken: 'refresh-9' });
  });

  it('when secure storage refuses, nothing is claimed: the failure message, no navigation, no session in the slice', async () => {
    (apiFetch as jest.Mock).mockResolvedValue(ANSWER);
    (storeAuthSession as jest.Mock).mockResolvedValue(null);
    const { result, store } = await run();
    expect(result.current.error).toBe('auth.social.failed');
    expect(mockRouter.replace).not.toHaveBeenCalled();
    expect(store.getState().auth.isAuthenticated).toBe(false);
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });
});
