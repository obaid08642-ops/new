import { act, renderHook } from '@testing-library/react-native';

import { SOCIAL_UNAVAILABLE, useSocialLogin } from '../../hooks/useSocialLogin';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));
jest.mock('../../../utils/api', () => ({ apiFetch: jest.fn() }));
jest.mock('expo-secure-store', () => ({ setItemAsync: jest.fn() }));
jest.mock('expo-web-browser', () => ({ maybeCompleteAuthSession: jest.fn() }));
jest.mock('expo-apple-authentication', () => ({ signInAsync: jest.fn(), AppleAuthenticationScope: { FULL_NAME: 0, EMAIL: 1 } }));
jest.mock('expo-auth-session/providers/google', () => ({ useAuthRequest: () => [null, null, jest.fn()] }));
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: () => 'nabdplus://redirect',
  useAuthRequest: () => [{ codeVerifier: 'v' }, null, jest.fn()],
  exchangeCodeAsync: jest.fn(),
}));

describe('useSocialLogin without client ids in the build', () => {
  it.each(['google', 'x', 'snapchat'] as const)('%s: shows the plain unavailable message, does not throw', async (provider) => {
    const { result } = await renderHook(() => useSocialLogin());
    await act(async () => {
      await result.current.signIn(provider);
    });
    expect(result.current.error).toBe(SOCIAL_UNAVAILABLE);
    expect(result.current.busy).toBe(false);
  });
});
