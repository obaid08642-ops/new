jest.mock('expo-secure-store', () => ({ getItemAsync: jest.fn().mockResolvedValue(null), setItemAsync: jest.fn(), deleteItemAsync: jest.fn() }));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true, default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn().mockResolvedValue(undefined) },
}));
jest.mock('@react-native-community/netinfo', () => ({
  __esModule: true, default: { fetch: jest.fn().mockResolvedValue({ isConnected: true, isInternetReachable: true }) },
}));

import { apiFetch } from './api';

const ok = (body: unknown = { ok: true }) => ({ ok: true, headers: { get: () => null }, text: jest.fn().mockResolvedValue(JSON.stringify(body)) });
const refused = (status: number, retryAfter?: string) => ({
  ok: false, status, headers: { get: (n: string) => (n.toLowerCase() === 'retry-after' ? retryAfter ?? null : null) },
  json: jest.fn().mockResolvedValue({ message: 'busy' }),
});
/** A request that never answers and ends with an AbortError when its signal fires. */
const hang = (_url: string, init: RequestInit) => new Promise((_resolve, reject) => {
  init.signal?.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })));
});

describe('apiFetch timeout, retries and cancellation (15.1)', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    global.fetch = jest.fn() as any;
  });
  afterEach(() => jest.useRealTimers());

  it('the timeout fires after 15 s and the call fails with REQUEST_TIMEOUT', async () => {
    (global.fetch as jest.Mock).mockImplementation(hang);
    const done = expect(apiFetch('/orders/mine', { method: 'POST', body: '{}' })).rejects.toThrow('REQUEST_TIMEOUT');
    await jest.advanceTimersByTimeAsync(14_999);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2);
    await done;
    expect(global.fetch).toHaveBeenCalledTimes(1); // a write with a generated key is not replayed after a timeout
  });

  it('a read that times out is tried again, three times in all, then fails', async () => {
    (global.fetch as jest.Mock).mockImplementation(hang);
    const done = expect(apiFetch('/orders/mine', { timeoutMs: 1000 })).rejects.toThrow('REQUEST_TIMEOUT');
    await jest.advanceTimersByTimeAsync(60_000);
    await done;
    expect(global.fetch).toHaveBeenCalledTimes(3);
  });

  it('a retry honours Retry-After', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(refused(429, '2')).mockResolvedValueOnce(ok({ done: 1 }));
    const result = apiFetch('/medicines/search?q=a');
    await jest.advanceTimersByTimeAsync(1999);
    expect(global.fetch).toHaveBeenCalledTimes(1);
    await jest.advanceTimersByTimeAsync(2);
    await expect(result).resolves.toEqual({ done: 1 });
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('a Retry-After longer than the client will wait is not waited for: the refusal is returned', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(refused(429, '600'));
    await expect(apiFetch('/medicines/search?q=a')).rejects.toThrow('busy');
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });

  it('no retry for a write without the caller\'s own key on 503, and a retry with the same key when the caller gave one', async () => {
    (global.fetch as jest.Mock).mockResolvedValue(refused(503));
    await expect(apiFetch('/cart/checkout', { method: 'POST', body: '{}' })).rejects.toThrow('busy');
    expect(global.fetch).toHaveBeenCalledTimes(1);

    (global.fetch as jest.Mock).mockReset();
    (global.fetch as jest.Mock).mockResolvedValueOnce(refused(503, '1')).mockResolvedValueOnce(ok());
    const result = apiFetch('/cart/checkout', { method: 'POST', body: '{}', headers: { 'Idempotency-Key': 'checkout-attempt-1-abcdef' } });
    await jest.advanceTimersByTimeAsync(1500);
    await result;
    const keys = (global.fetch as jest.Mock).mock.calls.map(([, r]) => new Headers(r.headers).get('Idempotency-Key'));
    expect(keys).toEqual(['checkout-attempt-1-abcdef', 'checkout-attempt-1-abcdef']);
  });

  it('429 is tried again even for a write without a key (the server did no work)', async () => {
    (global.fetch as jest.Mock).mockResolvedValueOnce(refused(429, '1')).mockResolvedValueOnce(ok());
    const result = apiFetch('/cart/checkout', { method: 'POST', body: '{}' });
    await jest.advanceTimersByTimeAsync(1500);
    await result;
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  it('a screen that closes cancels the request, and it is not tried again', async () => {
    (global.fetch as jest.Mock).mockImplementation(hang);
    const controller = new AbortController();
    const done = expect(apiFetch('/orders/mine', { signal: controller.signal })).rejects.toThrow('REQUEST_ABORTED');
    await jest.advanceTimersByTimeAsync(100);
    controller.abort();
    await done;
    expect(global.fetch).toHaveBeenCalledTimes(1);
  });
});
