const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

// Factory must not close over a module-level const: `import './api'` is hoisted above it,
// so the mock would be created while that const is still undefined.
jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn(), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockAsyncStorage }));

import { ApiContractError, apiFetch } from './api';

const mockSecureStore = jest.requireMock('expo-secure-store') as Record<'getItemAsync' | 'setItemAsync' | 'deleteItemAsync', jest.Mock>;

describe('apiFetch security contract', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockSecureStore.getItemAsync.mockResolvedValue(null);
    mockAsyncStorage.getItem.mockResolvedValue('legacy-token-that-must-not-be-used');
    mockAsyncStorage.removeItem.mockResolvedValue(undefined);
    global.fetch = jest.fn() as any;
  });

  it('never reads an authorization token from the legacy AsyncStorage mirror', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });

    await apiFetch('/public-data');

    expect(mockAsyncStorage.getItem).not.toHaveBeenCalled();
    expect(mockAsyncStorage.setItem).not.toHaveBeenCalled();
    const [, request] = (global.fetch as jest.Mock).mock.calls[0];
    expect(new Headers(request.headers).get('Authorization')).toBeNull();
  });

  it('raises a typed contract error when a successful HTTP response is not JSON', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockRejectedValue(new Error('invalid json')) });

    await expect(apiFetch('/malformed')).rejects.toEqual(expect.objectContaining({ code: 'invalid_response' }));
  });

  it('does not create or retry as a guest session after an authentication error', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'missing token' }) });

    await expect(apiFetch('/patient-only')).rejects.toThrow('AUTH_ERROR_401');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('does not retry a failed request with a local timer', async () => {
    (global.fetch as jest.Mock).mockRejectedValue(new Error('network unavailable'));

    await expect(apiFetch('/patient-only', { method: 'POST', body: JSON.stringify({ action: 'submit' }) })).rejects.toThrow('OFFLINE_ERROR');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('adds an idempotency key to every mutation (routes with @RequireIdempotency reject calls without one)', async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });
    await apiFetch('/health/vitals', { method: 'POST', body: '{}' });
    await apiFetch('/health/reminders/1', { method: 'PATCH', body: '{}' });
    await apiFetch('/health/vitals');
    const keys = (global.fetch as jest.Mock).mock.calls.map(([, r]) => new Headers(r.headers).get('Idempotency-Key'));
    expect(keys[0]).toMatch(/^app-.{16,}/);
    expect(keys[1]).toMatch(/^app-.{16,}/);
    expect(keys[0]).not.toBe(keys[1]);
    expect(keys[2]).toBeNull();
  });

  it("keeps the caller's own idempotency key", async () => {
    (global.fetch as jest.Mock).mockResolvedValue({ ok: true, json: jest.fn().mockResolvedValue({ ok: true }) });
    await apiFetch('/cart/checkout', { method: 'POST', body: '{}', headers: { 'idempotency-key': 'checkout-attempt-1' } });
    expect(new Headers((global.fetch as jest.Mock).mock.calls[0][1].headers).get('Idempotency-Key')).toBe('checkout-attempt-1');
  });

  it('a 403 does not sign the user out; a 401 does', async () => {
    mockSecureStore.getItemAsync.mockResolvedValue('session-token');
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 403, json: jest.fn().mockResolvedValue({ message: 'provider scope required' }) });
    await expect(apiFetch('/providers/x')).rejects.toThrow('AUTH_ERROR_403');
    expect(mockSecureStore.deleteItemAsync).not.toHaveBeenCalled();
    (global.fetch as jest.Mock).mockResolvedValue({ ok: false, status: 401, json: jest.fn().mockResolvedValue({ message: 'Unauthorized' }) });
    await expect(apiFetch('/auth/me')).rejects.toThrow('AUTH_ERROR_401');
    expect(mockSecureStore.deleteItemAsync).toHaveBeenCalled();
  });
});
