const mockAsyncStorage = { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() };
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockAsyncStorage }));

import { apiFetch, isPublicAuthEndpoint } from './api';

const mockSecureStore = jest.requireMock('expo-secure-store') as Record<'getItemAsync' | 'setItemAsync' | 'deleteItemAsync', jest.Mock>;

describe('a 401 from a sign-in endpoint is its own answer, not the end of the stored session', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue('guest-token-0123456789');
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    global.fetch = jest.fn() as unknown as typeof fetch;
  });

  it.each(['/auth/login', '/auth/register', '/auth/guest', '/auth/social-login', '/auth/send-otp', '/auth/verify-otp', '/auth/reset-password', '/auth/refresh'])(
    '%s is a public auth endpoint',
    (endpoint) => {
      expect(isPublicAuthEndpoint(endpoint)).toBe(true);
    },
  );

  it.each(['/auth/me', '/auth/logout', '/users/me/profile', '/notifications', '/auth/login-history'])('%s is not', (endpoint) => {
    expect(isPublicAuthEndpoint(endpoint)).toBe(false);
  });

  it('reset-password answering 401 "User not found" keeps the guest token', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'User not found' }) });
    await expect(apiFetch('/auth/reset-password', { method: 'POST', body: '{}' })).rejects.toThrow('User not found');
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
  });

  it('a 401 from any other endpoint still ends the stored session', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }) });
    await expect(apiFetch('/notifications')).rejects.toThrow('AUTH_ERROR_401');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
