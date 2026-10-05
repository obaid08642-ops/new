/**
 * 15.1 — the three gate checks at the public `apiFetch` boundary, where the
 * idempotency-key decision is actually made. `client.resilience.test.ts` covers
 * the policy; this file proves `apiFetch` feeds that policy the right answer —
 * in particular that the key it *auto-generates* for `@RequireIdempotency` routes
 * does not turn a non-idempotent POST into a replayed one.
 */
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(),
  setItemAsync: jest.fn(),
  deleteItemAsync: jest.fn(),
}));
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn().mockResolvedValue(undefined) },
}));

import { apiFetch } from './api';

const secureStore = jest.requireMock('expo-secure-store') as Record<string, jest.Mock>;

function textResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
  const lower: Record<string, string> = {};
  for (const [k, v] of Object.entries(headers)) lower[k.toLowerCase()] = v;
  return {
    status,
    ok: status >= 200 && status < 300,
    headers: { forEach: (fn: (v: string, k: string) => void) => Object.entries(lower).forEach(([k, v]) => fn(v, k)) },
    text: async () => (typeof body === 'string' ? body : JSON.stringify(body)),
  } as unknown as Response;
}

beforeEach(() => {
  jest.clearAllMocks();
  secureStore.getItemAsync.mockResolvedValue('a-valid-session-token');
});

describe('15.1 · apiFetch · timeout', () => {
  it('gives up after 15 s instead of waiting forever on a weak network', async () => {
    jest.useFakeTimers();
    try {
      (global.fetch as unknown as jest.Mock) = jest.fn(
        (_url: string, init?: RequestInit) =>
          new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          }),
      );
      const promise = apiFetch('/orders');
      const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT_ERROR' });
      // advanceTimersByTimeAsync also drains the microtask queue, so the timer is
      // armed (the token read resolves) before the clock moves.
      await jest.advanceTimersByTimeAsync(15_000 + 1);
      await assertion;
      expect(global.fetch).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('15.1 · apiFetch · retry honours Retry-After', () => {
  it('waits the server-requested delay before replaying a safe read', async () => {
    const attemptTimes: number[] = [];
    const fetchMock = jest.fn(() => {
      attemptTimes.push(Date.now());
      return Promise.resolve(
        attemptTimes.length === 1
          ? textResponse(503, { code: 'SERVICE_UNAVAILABLE' }, { 'retry-after': '1' })
          : textResponse(200, { items: [] }),
      );
    });
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await expect(apiFetch('/medicines')).resolves.toEqual({ items: [] });
    expect(fetchMock).toHaveBeenCalledTimes(2);

    // The gap must be most of the 1 s Retry-After, not the 300 ms backoff base.
    const waited = attemptTimes[1] - attemptTimes[0];
    expect(waited).toBeGreaterThanOrEqual(700);
    expect(waited).toBeLessThanOrEqual(1_200);
  }, 20_000);
});

describe('15.1 · apiFetch · no retry for a non-idempotent POST without a key', () => {
  it('makes one attempt for a POST that only received the auto-generated key', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('network unavailable'));
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await expect(apiFetch('/payments/initiate', { method: 'POST', body: '{"amount":10}' })).rejects.toMatchObject({
      message: 'OFFLINE_ERROR',
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    // The auto key is present (so @RequireIdempotency is satisfied) …
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('Idempotency-Key')).toMatch(/^app-/);
  });

  it('makes one attempt for a POST that gets a 500', async () => {
    const fetchMock = jest.fn().mockResolvedValue(textResponse(500, { message: 'gateway blew up' }));
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await expect(apiFetch('/bookings', { method: 'POST', body: '{}' })).rejects.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('replays a POST that carries the caller’s own idempotency key, reusing that key', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(textResponse(500, { message: 'gateway blew up' }))
      .mockResolvedValueOnce(textResponse(200, { orderId: 'o-9' }));
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await expect(
      apiFetch('/orders', { method: 'POST', body: '{}', headers: { 'Idempotency-Key': 'attempt-1' } }),
    ).resolves.toEqual({ orderId: 'o-9' });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    const keys = fetchMock.mock.calls.map(([, init]) => new Headers(init.headers).get('Idempotency-Key'));
    expect(keys).toEqual(['attempt-1', 'attempt-1']);
  }, 20_000);

  it('retryable:false forbids a replay even when a key is present — payments never replay', async () => {
    const fetchMock = jest
      .fn()
      .mockResolvedValueOnce(textResponse(503, { message: 'gateway timeout' }))
      .mockResolvedValueOnce(textResponse(200, { paid: true }));
    (global.fetch as unknown as jest.Mock) = fetchMock;

    await expect(
      apiFetch('/payments/confirm', {
        method: 'POST',
        body: '{}',
        headers: { 'Idempotency-Key': 'attempt-1' },
        retryable: false,
      }),
    ).rejects.toBeTruthy();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});

describe('15.1 · apiFetch · cancellation and catalogue mapping', () => {
  it('cancels in flight when the screen closes', async () => {
    const controller = new AbortController();
    (global.fetch as unknown as jest.Mock) = jest.fn(
      (_url: string, init?: RequestInit) =>
        new Promise((_resolve, reject) => {
          init?.signal?.addEventListener('abort', () => {
            const e = new Error('aborted');
            e.name = 'AbortError';
            reject(e);
          });
        }),
    );

    const promise = apiFetch('/orders', { signal: controller.signal });
    controller.abort();
    await expect(promise).rejects.toMatchObject({ message: 'REQUEST_ABORTED', code: 'CANCELLED_ERROR' });
  });

  it('rejects with a catalogue message and a next step for a server code', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(
      textResponse(409, { code: 'DUPLICATE_TRANSACTION', message: 'سلّم طلبك مرتين' }),
    );
    const error: any = await apiFetch('/unified-bookings', { method: 'POST', body: '{}' }).catch((e) => e);
    expect(error.catalogCode).toBe('DUPLICATE_TRANSACTION');
    expect(error.userMessage).toBe('سلّم طلبك مرتين');
    expect(typeof error.nextStep).toBe('string');
    expect(error.nextStep.length).toBeGreaterThan(0);
  });

  it('resolves the catalogue message in the requested locale', async () => {
    (global.fetch as unknown as jest.Mock) = jest.fn().mockResolvedValue(
      textResponse(409, { code: 'DUPLICATE_TRANSACTION' }),
    );
    const error: any = await apiFetch('/orders', { locale: 'en' }).catch((e) => e);
    expect(error.userMessage).toBe('This was already submitted.');
    expect(error.nextStep).toBe('Check your orders before trying again.');
  });
});
