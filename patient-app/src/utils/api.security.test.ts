const mockSecureStore = {
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
};
const mockAsyncStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
};

jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('@react-native-async-storage/async-storage', () => ({ __esModule: true, default: mockAsyncStorage }));

import { ApiContractError, apiFetch } from './api';

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
});
