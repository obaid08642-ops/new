/**
 * 15.1 — the three Phase 15 gate checks, plus the rest of the policy the task
 * requires (per-kind timeouts, cancellation on screen close, offline detection,
 * catalogue mapping with a localized message and a next step).
 *
 * Everything is driven through the injectable `fetchImpl` / `sleep` / `random` /
 * `now` seams, so no test waits on a real timer or a real network.
 */
import { httpRequest } from './client';
import { ApiError, describeError } from './errors';
import {
  REQUEST_TIMEOUTS,
  computeRetryDelay,
  decideRetry,
  parseRetryAfter,
  timeoutForKind,
} from './policy';
import {
  getConnectivity,
  markOnline,
  resetConnectivity,
  subscribeConnectivity,
} from './connectivity';
import { resolveCatalogLocale, ERROR_CATALOG, CATALOG_LOCALES } from './errorCatalog';

const BASE = 'https://api.test/api/v1';
const noSleep = jest.fn(async () => {});
const fixedRandom = () => 0.5;

beforeEach(() => {
  noSleep.mockClear();
});

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

function okResponse(body: unknown = { ok: true }) {
  return textResponse(200, body);
}

/** A fetch that never settles, so only the timeout or an abort can end it. */
function hangingFetch(): typeof fetch {
  return ((_url: string, init?: RequestInit) =>
    new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    })) as unknown as typeof fetch;
}

describe('15.1 · the timeout fires', () => {
  it('rejects with TIMEOUT_ERROR after the configured budget instead of waiting forever', async () => {
    jest.useFakeTimers();
    try {
      const promise = httpRequest({
        url: '/slow',
        baseUrl: BASE,
        method: 'GET',
        timeoutMs: REQUEST_TIMEOUTS.default,
        fetchImpl: hangingFetch(),
        sleep: noSleep,
      });
      const assertion = expect(promise).rejects.toMatchObject({
        code: 'TIMEOUT_ERROR',
        message: 'TIMEOUT_ERROR',
      });
      jest.advanceTimersByTime(REQUEST_TIMEOUTS.default + 1);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('applies 15 s by default, 60 s for uploads and 45 s for AI', () => {
    expect(REQUEST_TIMEOUTS).toEqual({ default: 15_000, upload: 60_000, ai: 45_000 });
    expect(timeoutForKind(undefined)).toBe(15_000);
    expect(timeoutForKind('upload')).toBe(60_000);
    expect(timeoutForKind('ai')).toBe(45_000);
  });

  it('gives every request a timeout even when the caller supplies none', async () => {
    jest.useFakeTimers();
    try {
      const promise = httpRequest({
        url: '/no-timeout-given',
        baseUrl: BASE,
        fetchImpl: hangingFetch(),
        sleep: noSleep,
      });
      const assertion = expect(promise).rejects.toMatchObject({ code: 'TIMEOUT_ERROR' });
      // Nothing in the call site mentioned a timeout, yet 15 s is still armed.
      jest.advanceTimersByTime(REQUEST_TIMEOUTS.default + 1);
      await assertion;
    } finally {
      jest.useRealTimers();
    }
  });

  it('a timed-out request is not retried even for a safe method', async () => {
    jest.useFakeTimers();
    try {
      let calls = 0;
      const promise = httpRequest({
        url: '/slow-get',
        baseUrl: BASE,
        method: 'GET',
        fetchImpl: ((_u: string, init?: RequestInit) => {
          calls += 1;
          return new Promise((_resolve, reject) => {
            init?.signal?.addEventListener('abort', () => {
              const e = new Error('aborted');
              e.name = 'AbortError';
              reject(e);
            });
          });
        }) as unknown as typeof fetch,
        sleep: noSleep,
      });
      const assertion = expect(promise).rejects.toBeInstanceOf(ApiError);
      jest.advanceTimersByTime(REQUEST_TIMEOUTS.default + 1);
      await assertion;
      expect(calls).toBe(1);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('15.1 · a retry honours Retry-After', () => {
  it('waits the number of seconds the server asked for before replaying a safe read', async () => {
    const sleeps: number[] = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(textResponse(503, { code: 'SERVICE_UNAVAILABLE' }, { 'Retry-After': '2' }))
      .mockResolvedValueOnce(okResponse({ items: [] })) as unknown as typeof fetch;

    const response = await httpRequest({
      url: '/catalog',
      baseUrl: BASE,
      method: 'GET',
      fetchImpl,
      sleep: async (ms) => { sleeps.push(ms); },
      random: fixedRandom,
      now: () => 1_700_000_000_000,
    });

    expect(response.status).toBe(200);
    expect(response.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    // Retry-After: 2 → 2000 ms, minus at most the 300 ms jitter window.
    expect(sleeps).toHaveLength(1);
    expect(sleeps[0]).toBeGreaterThanOrEqual(1700);
    expect(sleeps[0]).toBeLessThanOrEqual(2000);
  });

  it('reads Retry-After in HTTP-date form', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:30 GMT', now)).toBe(30_000);
    expect(parseRetryAfter('30', now)).toBe(30_000);
    expect(parseRetryAfter(null, now)).toBeNull();
    expect(parseRetryAfter('not-a-date', now)).toBeNull();
  });

  it('never waits longer than the Retry-After ceiling', () => {
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfter('9999', now)).toBe(30_000);
  });

  it('falls back to exponential backoff with jitter when no Retry-After is sent', () => {
    // base 300 ms: attempt 1 → [0,300], attempt 2 → [0,600], capped at 4000.
    expect(computeRetryDelay(1, null, () => 1)).toBe(300);
    expect(computeRetryDelay(2, null, () => 1)).toBe(600);
    expect(computeRetryDelay(9, null, () => 1)).toBe(4000);
    expect(computeRetryDelay(1, null, () => 0)).toBe(0);
    expect(computeRetryDelay(2, null, () => 0.5)).toBe(300);
  });

  it('stops after the attempt budget even when the server keeps saying Retry-After', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(textResponse(429, { code: 'RATE_LIMITED' }, { 'Retry-After': '1' })) as unknown as typeof fetch;
    await expect(
      httpRequest({ url: '/hot', baseUrl: BASE, method: 'GET', fetchImpl, sleep: noSleep, random: fixedRandom }),
    ).rejects.toMatchObject({ code: 'SERVER_ERROR', catalogCode: 'RATE_LIMITED' });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
  });

  it('decideRetry reports why it refused, so the reason is assertable', () => {
    const base = { maxAttempts: 3, callerSuppliedIdempotencyKey: false };
    expect(decideRetry({ ...base, method: 'POST', attempt: 1, status: 503 }).reason).toBe('not_idempotent');
    expect(decideRetry({ ...base, method: 'GET', attempt: 3, status: 503 }).reason).toBe('no_attempts_left');
    expect(decideRetry({ ...base, method: 'GET', attempt: 1, status: 404 }).reason).toBe('status_not_retryable');
    expect(decideRetry({ ...base, method: 'GET', attempt: 1, cancelled: true }).reason).toBe('cancelled');
    expect(decideRetry({ ...base, method: 'GET', attempt: 1, status: 503 }).retry).toBe(true);
  });
});

describe('15.1 · no retry for a non-idempotent POST without an idempotency key', () => {
  it('makes exactly one attempt when the POST has no caller-supplied key', async () => {
    const fetchImpl = jest.fn().mockRejectedValue(new Error('network unavailable')) as unknown as typeof fetch;

    await expect(
      httpRequest({
        url: '/orders',
        baseUrl: BASE,
        method: 'POST',
        body: { sku: 'x' },
        callerSuppliedIdempotencyKey: false,
        fetchImpl,
        sleep: noSleep,
      }),
    ).rejects.toMatchObject({ code: 'OFFLINE_ERROR', message: 'OFFLINE_ERROR' });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });

  it('makes exactly one attempt when the POST gets a 500, even with retries enabled', async () => {
    const fetchImpl = jest.fn().mockResolvedValue(textResponse(500, { message: 'boom' })) as unknown as typeof fetch;

    await expect(
      httpRequest({
        url: '/payments/initiate',
        baseUrl: BASE,
        method: 'POST',
        callerSuppliedIdempotencyKey: false,
        fetchImpl,
        sleep: noSleep,
      }),
    ).rejects.toBeInstanceOf(ApiError);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(noSleep).not.toHaveBeenCalled();
  });

  it('does replay the same POST when the CALLER supplies an idempotency key', async () => {
    const sleeps: number[] = [];
    const fetchImpl = jest
      .fn()
      .mockResolvedValueOnce(textResponse(500, { message: 'boom' }))
      .mockResolvedValueOnce(okResponse({ orderId: 'o-1' })) as unknown as typeof fetch;

    const response = await httpRequest({
      url: '/orders',
      baseUrl: BASE,
      method: 'POST',
      callerSuppliedIdempotencyKey: true,
      fetchImpl,
      sleep: async (ms) => { sleeps.push(ms); },
      random: fixedRandom,
    });

    expect(response.attempts).toBe(2);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    expect(sleeps).toHaveLength(1);
  });

  it('replays HEAD and OPTIONS but not DELETE-without-key', async () => {
    for (const method of ['HEAD', 'OPTIONS']) {
      const fetchImpl = jest
        .fn()
        .mockResolvedValueOnce(textResponse(503, {}))
        .mockResolvedValueOnce(okResponse()) as unknown as typeof fetch;
      await httpRequest({ url: '/ping', baseUrl: BASE, method, fetchImpl, sleep: noSleep, random: fixedRandom });
      expect(fetchImpl).toHaveBeenCalledTimes(2);
    }
    const deleteImpl = jest.fn().mockResolvedValue(textResponse(503, {})) as unknown as typeof fetch;
    await expect(
      httpRequest({ url: '/cart/1', baseUrl: BASE, method: 'DELETE', fetchImpl: deleteImpl, sleep: noSleep }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(deleteImpl).toHaveBeenCalledTimes(1);
  });
});

describe('15.1 · the request is cancelled when the screen closes', () => {
  it('aborts in flight when the caller aborts its signal', async () => {
    const controller = new AbortController();
    const fetchImpl = ((_url: string, init?: RequestInit) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      })) as unknown as typeof fetch;

    const promise = httpRequest({ url: '/orders', baseUrl: BASE, method: 'GET', signal: controller.signal, fetchImpl, sleep: noSleep });
    controller.abort();

    await expect(promise).rejects.toMatchObject({ code: 'CANCELLED_ERROR', message: 'REQUEST_ABORTED' });
  });

  it('does not even start when the signal is already aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    const fetchImpl = jest.fn() as unknown as typeof fetch;
    await expect(
      httpRequest({ url: '/orders', baseUrl: BASE, signal: controller.signal, fetchImpl, sleep: noSleep }),
    ).rejects.toMatchObject({ code: 'CANCELLED_ERROR' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('an aborted request is never retried', async () => {
    const controller = new AbortController();
    let calls = 0;
    const fetchImpl = ((_url: string, init?: RequestInit) => {
      calls += 1;
      return new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => {
          const e = new Error('aborted');
          e.name = 'AbortError';
          reject(e);
        });
      });
    }) as unknown as typeof fetch;

    const promise = httpRequest({ url: '/orders', baseUrl: BASE, method: 'GET', signal: controller.signal, fetchImpl, sleep: noSleep });
    controller.abort();
    await expect(promise).rejects.toBeInstanceOf(ApiError);
    expect(calls).toBe(1);
  });
});

describe('15.1 · offline detection', () => {
  beforeEach(() => {
    resetConnectivity();
    markOnline();
  });
  afterEach(() => resetConnectivity());

  it('marks the device offline on a transport failure and back online on success', async () => {
    const failing = jest.fn().mockRejectedValue(new Error('Network request failed')) as unknown as typeof fetch;
    await expect(
      httpRequest({ url: '/x', baseUrl: BASE, fetchImpl: failing, sleep: noSleep }),
    ).rejects.toBeInstanceOf(ApiError);
    expect(getConnectivity().online).toBe(false);

    const succeeding = jest.fn().mockResolvedValue(okResponse()) as unknown as typeof fetch;
    await httpRequest({ url: '/x', baseUrl: BASE, fetchImpl: succeeding, sleep: noSleep });
    expect(getConnectivity().online).toBe(true);
  });

  it('notifies subscribers when connectivity flips', async () => {
    const seen: boolean[] = [];
    subscribeConnectivity((snapshot) => seen.push(snapshot.online));

    const failing = jest.fn().mockRejectedValue(new Error('boom')) as unknown as typeof fetch;
    await httpRequest({ url: '/x', baseUrl: BASE, fetchImpl: failing, sleep: noSleep }).catch(() => undefined);
    const succeeding = jest.fn().mockResolvedValue(okResponse()) as unknown as typeof fetch;
    await httpRequest({ url: '/x', baseUrl: BASE, fetchImpl: succeeding, sleep: noSleep });

    expect(seen).toEqual([true, false, true]);
  });
});

describe('15.1 · every error maps to the 13.R5 catalogue with a message and a next step', () => {
  const cases: Array<[number, string]> = [
    [401, 'AUTHENTICATION_REQUIRED'],
    [403, 'INSUFFICIENT_PERMISSION'],
    [409, 'DUPLICATE_TRANSACTION'],
    [422, 'INVALID_INPUT'],
    [429, 'RATE_LIMITED'],
    [500, 'SERVICE_UNAVAILABLE'],
    [503, 'SERVICE_UNAVAILABLE'],
  ];

  it.each(cases)('maps HTTP %i to catalogue code %s', async (status, catalogCode) => {
    const fetchImpl = jest.fn().mockResolvedValue(textResponse(status, { message: 'server said no' })) as unknown as typeof fetch;
    await expect(
      httpRequest({ url: '/x', baseUrl: BASE, method: 'GET', fetchImpl, sleep: noSleep, maxAttempts: 1 }),
    ).rejects.toMatchObject({ catalogCode });
  });

  it('prefers the code the server sent over the status-derived code', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(
        textResponse(400, { code: 'PRESCRIPTION_REQUIRED', message: 'rx needed', nextStep: 'ارفع الوصفة' }),
      ) as unknown as typeof fetch;

    const error: ApiError = await httpRequest({
      url: '/pharmacy/checkout',
      baseUrl: BASE,
      method: 'POST',
      callerSuppliedIdempotencyKey: true,
      fetchImpl,
      sleep: noSleep,
    }).catch((e) => e);

    expect(error.catalogCode).toBe('PRESCRIPTION_REQUIRED');
    expect(error.userMessage).toBe('rx needed');
    expect(error.nextStep).toBe('ارفع الوصفة');
  });

  it('resolves a localized message + next step for both shipped catalogue locales', async () => {
    const arabic = describeError(new ApiError({ code: 'AUTH_ERROR', reason: 'AUTH_ERROR_401', catalogCode: 'AUTHENTICATION_REQUIRED', locale: 'ar' }), 'ar');
    expect(arabic).toEqual(ERROR_CATALOG.AUTHENTICATION_REQUIRED.ar);

    const english = describeError(new ApiError({ code: 'AUTH_ERROR', reason: 'AUTH_ERROR_401', catalogCode: 'AUTHENTICATION_REQUIRED', locale: 'en' }), 'en');
    expect(english).toEqual(ERROR_CATALOG.AUTHENTICATION_REQUIRED.en);
  });

  it('serves real ur/hi/bn/fil translations instead of falling back to Arabic', () => {
    expect(CATALOG_LOCALES.sort()).toEqual(['ar', 'bn', 'en', 'fil', 'hi', 'ur']);
    expect(resolveCatalogLocale('ur')).toBe('ur');
    expect(resolveCatalogLocale('fil')).toBe('fil');
    expect(resolveCatalogLocale('hi')).toBe('hi');
    expect(resolveCatalogLocale('bn')).toBe('bn');
    expect(resolveCatalogLocale('en-GB')).toBe('en');
    const urdu = describeError(
      new ApiError({ code: 'SERVER_ERROR', reason: 'x', catalogCode: 'SERVICE_UNAVAILABLE', locale: 'ur' }),
      'ur',
    );
    expect(urdu).toEqual(ERROR_CATALOG.SERVICE_UNAVAILABLE.ur);
    expect(urdu.message).not.toBe(ERROR_CATALOG.SERVICE_UNAVAILABLE.ar.message);
  });

  it('still falls back to Arabic for a locale the catalogue does not carry', () => {
    expect(resolveCatalogLocale('tr')).toBe('ar');
    const turkish = describeError(
      new ApiError({ code: 'SERVER_ERROR', reason: 'x', catalogCode: 'SERVICE_UNAVAILABLE', locale: 'tr' }),
      'tr',
    );
    expect(turkish).toEqual(ERROR_CATALOG.SERVICE_UNAVAILABLE.ar);
  });

  it('coerces a NestJS validation array instead of crashing on it', async () => {
    const fetchImpl = jest
      .fn()
      .mockResolvedValue(textResponse(400, { message: ['name must be a string', 'age must be an integer'] })) as unknown as typeof fetch;
    const error: ApiError = await httpRequest({
      url: '/users/me',
      baseUrl: BASE,
      method: 'PATCH',
      callerSuppliedIdempotencyKey: true,
      fetchImpl,
      sleep: noSleep,
    }).catch((e) => e);
    expect(error.message).toBe('name must be a string، age must be an integer');
  });
});
