import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Platform } from 'react-native';
import { Provider } from 'react-redux';

import { availableSocialProviders } from '../../components/auth/AuthKit';
import { parseSocialRuntime, resetSocialConfigCache, useSocialConfig, type SocialRuntimeConfig } from '../../hooks/useSocialConfig';
import { useSocialLogin } from '../../hooks/useSocialLogin';
import { makeStore } from '../utils/testStore';

jest.mock('react-native-localize', () => require('react-native-localize/mock'));
jest.mock('../../context/AppContext', () => ({ useApp: () => ({ isDark: false, lang: 'ar', isRTL: true }) }));
jest.mock('expo-apple-authentication', () => ({ AppleAuthenticationButton: () => null, AppleAuthenticationButtonType: { CONTINUE: 1 }, AppleAuthenticationButtonStyle: { WHITE: 0, BLACK: 2 }, AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 }, signInAsync: jest.fn() }));
jest.mock('../../components/NabdLogo', () => ({ NabdLogo: () => null }));
const mockApiFetch = jest.fn();
const mockReplace = jest.fn();
jest.mock('expo-router', () => ({ router: { replace: (...a: unknown[]) => mockReplace(...a) } }));
jest.mock('../../../utils/api', () => ({ apiFetch: (...a: unknown[]) => mockApiFetch(...a), storeAuthSession: jest.fn() }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: () => [{}, null, jest.fn()] }));
const mockPrompt = jest.fn();
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'nabdplus://redirect',
  useAuthRequest: () => [{ codeVerifier: 'verifier-0123456789012345678901234567890123456789' }, null, (...a: unknown[]) => mockPrompt(...a)],
  exchangeCodeAsync: jest.fn(() => { throw new Error('the app must not exchange the code itself'); }),
}));

const on = { enabled: true };
const off = { enabled: false };
const answer = (over: Record<string, unknown> = {}) => ({ google: { ...on, client_id: 'g-web', ios_client_id: 'g-ios', android_client_id: 'g-and' }, apple: { ...on }, x: { ...on, client_id: 'x-id' }, snapchat: { ...on, client_id: 's-id' }, ...over });
const config = (over: Record<string, unknown> = {}) => parseSocialRuntime(answer(over)) as SocialRuntimeConfig;

afterEach(() => { jest.restoreAllMocks(); resetSocialConfigCache(); mockApiFetch.mockReset(); mockPrompt.mockReset(); mockReplace.mockReset(); });

describe('providers drawn from the backend answer', () => {
  it('ios: all four; android and web: never Apple', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(availableSocialProviders(config())).toEqual(['apple', 'google', 'x', 'snapchat']);
    jest.replaceProperty(Platform, 'OS', 'android');
    expect(availableSocialProviders(config())).toEqual(['google', 'x', 'snapchat']);
    jest.replaceProperty(Platform, 'OS', 'web');
    expect(availableSocialProviders(config())).toEqual(['google', 'x', 'snapchat']);
  });

  it.each([['apple', 'ios'], ['google', 'ios'], ['x', 'ios'], ['snapchat', 'ios']] as const)('%s off in the answer → no button', (provider, os) => {
    jest.replaceProperty(Platform, 'OS', os);
    expect(availableSocialProviders(config({ [provider]: off }))).not.toContain(provider);
  });

  it('with no answer the build-time rule applies (Apple on iOS, Google, X and Snapchat only with the flag)', () => {
    jest.replaceProperty(Platform, 'OS', 'ios');
    expect(availableSocialProviders(null)).toEqual(['apple', 'google']);
  });

  it('an answer that is not the expected shape is ignored', () => {
    for (const bad of [null, undefined, 'x', [], {}, { foo: 1 }]) expect(parseSocialRuntime(bad)).toBeNull();
  });
});

describe('useSocialConfig', () => {
  it('reads GET /auth/social/config without a session and keeps the answer', async () => {
    mockApiFetch.mockResolvedValue(answer());
    const { result } = await renderHook(() => useSocialConfig());
    await act(async () => {});
    expect(mockApiFetch).toHaveBeenCalledWith('/auth/social/config', { skipAuth: true });
    expect(result.current?.x.client_id).toBe('x-id');
  });

  it('stays null when the backend does not answer', async () => {
    mockApiFetch.mockRejectedValue(new Error('offline'));
    const { result } = await renderHook(() => useSocialConfig());
    await act(async () => {});
    expect(result.current).toBeNull();
  });
});

describe('X and Snapchat send the code to the backend', () => {
  it.each(['x', 'snapchat'] as const)('%s: POST /auth/social-login { provider, code, code_verifier, redirect_uri } and no token', async (provider) => {
    mockApiFetch.mockImplementation(async (path: string) => {
      if (path === '/auth/social/config') return answer();
      return { user: { id: 'u1', full_name: 'A' }, token: { accessToken: 'a', refreshToken: 'r' } };
    });
    mockPrompt.mockResolvedValue({ type: 'success', params: { code: 'the-code' } });
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store: makeStore(), children });
    const { result } = await renderHook(() => useSocialLogin(), { wrapper });
    await act(async () => {});
    await act(async () => { await result.current.signIn(provider); });
    const call = mockApiFetch.mock.calls.find((c) => c[0] === '/auth/social-login');
    expect(call).toBeDefined();
    const body = JSON.parse((call?.[1] as { body: string }).body);
    expect(body).toEqual({ provider, code: 'the-code', code_verifier: 'verifier-0123456789012345678901234567890123456789', redirect_uri: 'nabdplus://redirect' });
    expect((call?.[1] as { skipAuth?: boolean }).skipAuth).toBe(true);
  });
});
