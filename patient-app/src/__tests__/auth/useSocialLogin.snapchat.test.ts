import React from 'react';
import { act, renderHook } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import * as WebBrowser from 'expo-web-browser';

import { useSocialLogin } from '../../hooks/useSocialLogin';
import { SNAPCHAT_REDIRECT_URI, SNAPCHAT_RETURN_URL, SNAPCHAT_SCOPES } from '../../utils/socialRedirects';
import { apiFetch, storeAuthSession } from '../../../utils/api';
import { makeStore } from '../utils/testStore';

const mockRequests: Array<{ config: Record<string, unknown> }> = [];
const mockSnapReq = {
  codeVerifier: 'verifier-1',
  makeAuthUrlAsync: jest.fn(async () => 'https://accounts.snapchat.com/accounts/oauth2/auth?state=S'),
  parseReturnUrl: jest.fn((url: string) => ({ type: 'success', params: Object.fromEntries(new URL(url).searchParams) })),
};
jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../../../utils/api', () => ({ apiFetch: jest.fn(), storeAuthSession: jest.fn() }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn(), openAuthSessionAsync: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({ signInAsync: jest.fn(), AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 } }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: () => [null, null, jest.fn()] }));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'nabdplus://',
  useAuthRequest: (config: Record<string, unknown>) => {
    mockRequests.push({ config });
    return [String(config.clientId) === 'snap-id' ? mockSnapReq : { codeVerifier: 'x' }, null, jest.fn()];
  },
}));

const jwt = (claims: object) => `h.${Buffer.from(JSON.stringify(claims)).toString('base64').replace(/=+$/, '')}.s`;
const ACCESS = jwt({ sub: 'u1', role: 'patient', is_guest: false });

describe('Snapchat sign-in in the app', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRequests.length = 0;
    process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID = 'snap-id';
  });
  afterAll(() => {
    delete process.env.EXPO_PUBLIC_SNAPCHAT_CLIENT_ID;
  });
  const run = async () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => React.createElement(Provider, { store: makeStore(), children });
    const { result } = await renderHook(() => useSocialLogin(), { wrapper });
    await act(async () => {
      await result.current.signIn('snapchat');
    });
    return result;
  };

  it('asks for the display name AND the external id (the backend signs in by the external id), with the HTTPS redirect', async () => {
    await run();
    const snap = mockRequests.map((r) => r.config).find((c) => c.clientId === 'snap-id') as { scopes: string[]; redirectUri: string };
    expect(snap.scopes).toEqual(SNAPCHAT_SCOPES);
    expect(snap.scopes).toContain('https://auth.snapchat.com/oauth2/api/user.external_id');
    expect(snap.redirectUri).toBe('https://nabd.plus/en/login/app-callback');
    expect(snap.redirectUri.startsWith('https://')).toBe(true);
  });

  it('opens the in-app browser until nabdplus://login/app-callback, and sends the code with the HTTPS redirect_uri and the verifier', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'success', url: `${SNAPCHAT_RETURN_URL}?code=C1&state=S` });
    (apiFetch as jest.Mock).mockResolvedValue({ user: { id: 'u1' }, token: { accessToken: ACCESS, refreshToken: 'r' } });
    (storeAuthSession as jest.Mock).mockResolvedValue(ACCESS);
    await run();
    expect(WebBrowser.openAuthSessionAsync).toHaveBeenCalledWith('https://accounts.snapchat.com/accounts/oauth2/auth?state=S', 'nabdplus://login/app-callback');
    const call = (apiFetch as jest.Mock).mock.calls.find((c: unknown[]) => c[0] === '/auth/social-login');
    expect(JSON.parse(call![1].body)).toEqual({ provider: 'snapchat', code: 'C1', code_verifier: 'verifier-1', redirect_uri: SNAPCHAT_REDIRECT_URI });
  });

  it('a cancelled browser sends nothing and shows no error', async () => {
    (WebBrowser.openAuthSessionAsync as jest.Mock).mockResolvedValue({ type: 'cancel' });
    const result = await run();
    expect(apiFetch).not.toHaveBeenCalledWith('/auth/social-login', expect.anything());
    expect(result.current.error).toBeNull();
    expect(result.current.busy).toBe(false);
  });
});
