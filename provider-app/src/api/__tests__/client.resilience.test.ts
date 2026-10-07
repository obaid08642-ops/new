/**
 * P15.1 — the three contract-mandated verifications, plus the guarantees they rest on:
 *
 *   1. the timeout fires;
 *   2. a retry honours `Retry-After`;
 *   3. NO retry for a non-idempotent POST without an idempotency key.
 *
 * Plus: cancellation via AbortSignal, offline detection, and catalog mapping.
 *
 * The platform HTTP layer is replaced with a fake adapter so the client's own
 * interceptors (the code under test) run for real: the fake arms its timer from
 * `config.timeout` and answers from a per-test script.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import client, {
  RETRY,
  TIMEOUTS,
  backendDetail,
  buildProviderApiError,
  classifyTimeoutKind,
  computeRetryDelay,
  isRetryEligible,
  parseRetryAfter,
  timeoutForUrl,
  type ProviderApiError,
} from '../client';
import { isOnline, resetOnlineState, setOnline, subscribeOnline } from '../online';

const realAdapter = client.defaults.adapter;

/** A response the adapter hands back. */
function ok(data: unknown = {}, config: InternalAxiosRequestConfig): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers: {}, config } as AxiosResponse;
}

function fail(
  status: number,
  data: unknown,
  config: InternalAxiosRequestConfig,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { data, status, statusText: 'ERR', headers, config } as AxiosResponse;
}

/** The error shape axios produces when its own timeout timer fires. */
function timeoutError(config: InternalAxiosRequestConfig) {
  const e: any = new Error(`timeout of ${config.timeout}ms exceeded`);
  e.code = 'ECONNABORTED';
  e.config = config;
  return e;
}

/** The error shape axios produces for a transport failure (no HTTP response). */
function networkError(config: InternalAxiosRequestConfig, code = 'ENOTFOUND') {
  const e: any = new Error('Network Error');
  e.code = code;
  e.config = config;
  e.request = {};
  return e;
}

/**
 * Install a fake adapter driven by `script`, which receives
 * (config, attemptIndex) and must resolve or reject.
 */
function useAdapter(script: (c: InternalAxiosRequestConfig, n: number) => Promise<AxiosResponse> | AxiosResponse) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = (config) => {
    const n = seen.length;
    seen.push(config);
    return Promise.resolve()
      .then(() => script(config, n))
      .then((response) => {
        // Mirror axios: a non-2xx response becomes a rejection the interceptors see.
        const validate = (config as any).validateStatus;
        const validateStatus = typeof validate === 'function' ? validate : (s: number) => s >= 200 && s < 300;
        if (validateStatus(response.status)) return response;
        return Promise.reject(Object.assign(new Error(`Request failed with status code ${response.status}`), {
          config,
          response,
          isAxiosError: true,
          code: 'ERR_BAD_RESPONSE',
        }));
      });
  };
  client.defaults.adapter = adapter;
  return seen;
}

beforeEach(() => {
  resetOnlineState(true);
  jest.restoreAllMocks();
});

afterEach(() => {
  client.defaults.adapter = realAdapter;
  resetOnlineState(true);
});

describe('P15.1 timeouts', () => {
  it('budgets every request: 15 s default, 60 s upload, 45 s AI', () => {
    expect(TIMEOUTS).toEqual({ DEFAULT: 15000, UPLOAD: 60000, AI: 45000 });
    expect(timeoutForUrl('/config')).toBe(15000);
    expect(timeoutForUrl('/provider/profile')).toBe(15000);
    expect(timeoutForUrl('/storage/upload')).toBe(60000);
    expect(timeoutForUrl('/storage/upload-suggestion-image')).toBe(60000);
    expect(timeoutForUrl('/ai/copilot/suggest')).toBe(45000);
    expect(timeoutForUrl('/ai/drug-interactions')).toBe(45000);
    // A query string must not be able to smuggle in a different class.
    expect(timeoutForUrl('/drugs?next=/storage/upload')).toBe(15000);
    expect(classifyTimeoutKind(undefined)).toBe('DEFAULT');
  });

  it('arms that budget on the request it actually sends', async () => {
    const seen = useAdapter((c) => ok({}, c));
    await client.get('/config');
    await client.post('/storage/upload', { data_base64: 'x' });
    await client.post('/ai/copilot/suggest', { notes: 'x' });
    expect(seen.map((c) => c.timeout)).toEqual([15000, 60000, 45000]);
  });

  it('lets a caller pin a budget explicitly', async () => {
    const seen = useAdapter((c) => ok({}, c));
    await client.request({ url: '/config', method: 'POST', timeoutKind: 'AI' } as any);
    expect(seen[0].timeout).toBe(45000);
  });

  it('FIRES: rejects once the 15 s budget elapses, mapped to the catalog', async () => {
    // Real timers, real budget. The fake adapter arms its timer from the very
    // `config.timeout` the client put on the request, so this genuinely exercises
    // "a timeout on every request" end to end rather than asserting a constant.
    jest.setTimeout(40000);
    const armed: number[] = [];
    client.defaults.adapter = ((config) =>
      new Promise((_resolve, reject) => {
        armed.push(config.timeout as number);
        setTimeout(() => reject(timeoutError(config)), config.timeout);
      })) as AxiosAdapter;

    const started = Date.now();
    let settled: ProviderApiError | null = null;
    const pending = client
      .get('/config', { skipRetry: true } as any)
      .then(() => null)
      .catch((e: ProviderApiError) => {
        settled = e;
        return e;
      });
    const err = await pending;
    const elapsed = Date.now() - started;

    // The timer was armed at the documented budget, and nothing else could have fired it.
    expect(armed).toEqual([15000]);
    expect(elapsed).toBeGreaterThanOrEqual(14000);
    expect(elapsed).toBeLessThan(19000);

    // Rejection is a catalog error, not a raw axios/transport failure.
    expect(err).not.toBeNull();
    expect(settled).toBe(err);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.message).toBe('This service is temporarily unavailable.');
    expect(err.nextStep).toBe('Please try again in a little while.');
    expect(err.remedy).toBe('retry');
    expect(err.offline).toBe(false);
  }, 40000);

  it('a fired timeout on a safe request is retried, then reported as retryable', async () => {
    jest.setTimeout(60000);
    const armed: number[] = [];
    client.defaults.adapter = ((config) =>
      new Promise((_resolve, reject) => {
        armed.push(config.timeout as number);
        setTimeout(() => reject(timeoutError(config)), config.timeout);
      })) as AxiosAdapter;

    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    // One armed timer per attempt: the budget really is applied on the retry too.
    expect(armed).toHaveLength(RETRY.maxAttempts);
    expect(armed.every((t) => t === 15000)).toBe(true);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.retryable).toBe(true);
  }, 60000);
});

describe('P15.1 Retry-After', () => {
  it('parses both Retry-After forms', () => {
    expect(parseRetryAfter('2')).toBe(2000);
    expect(parseRetryAfter(' 5 ')).toBe(5000);
    expect(parseRetryAfter(undefined)).toBeNull();
    expect(parseRetryAfter('not-a-date')).toBeNull();
    const now = Date.parse('2026-01-01T00:00:00Z');
    expect(parseRetryAfter('Thu, 01 Jan 2026 00:00:03 GMT', now)).toBe(3000);
  });

  it('a server Retry-After wins over the computed backoff', () => {
    // Exponential backoff for attempt 2 would be 600 ms; the server asked for 2 s.
    expect(computeRetryDelay(2, undefined, () => 1)).toBeLessThan(RETRY.maxDelayMs);
    expect(computeRetryDelay(2, '2')).toBe(2000);
    // ...but never parks the UI forever.
    expect(computeRetryDelay(1, '9999')).toBe(RETRY.maxRetryAfterMs);
  });

  it('backs off exponentially with jitter between the documented bounds', () => {
    for (const attempt of [1, 2, 3]) {
      const lo = computeRetryDelay(attempt, undefined, () => 0);
      const hi = computeRetryDelay(attempt, undefined, () => 1);
      const cap = Math.min(RETRY.baseDelayMs * Math.pow(2, attempt - 1), RETRY.maxDelayMs);
      expect(lo).toBeGreaterThanOrEqual(cap * (1 - RETRY.jitterRatio / 2) - 1);
      expect(hi).toBeLessThanOrEqual(cap * (1 + RETRY.jitterRatio / 2) + 1);
    }
  });

  it('RETRIES: waits the server-specified delay before the next attempt', async () => {
    jest.useFakeTimers();
    try {
      const seen = useAdapter((c, n) =>
        n === 0 ? fail(429, { code: 'RATE_LIMITED' }, c, { 'retry-after': '2' }) : ok({ ok: true }, c),
      );
      const pending = client.get('/config');
      const assertion = expect(pending).resolves.toBeDefined();
      // Not before 2 s — the header, not the 600 ms exponential step.
      await jest.advanceTimersByTimeAsync(1999);
      expect(seen).toHaveLength(1);
      await jest.advanceTimersByTimeAsync(1);
      await assertion;
      expect(seen).toHaveLength(2);
    } finally {
      jest.useRealTimers();
    }
  });
});

describe('P15.1 idempotency decides retry eligibility', () => {
  it('the pure policy: safe methods yes, others only with a caller key', () => {
    for (const m of ['GET', 'HEAD', 'OPTIONS', 'get', 'head']) {
      expect(isRetryEligible({ method: m })).toBe(true);
    }
    for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      expect(isRetryEligible({ method: m })).toBe(false);
      expect(isRetryEligible({ method: m, headers: { 'Idempotency-Key': 'stable-1' } })).toBe(true);
      expect(isRetryEligible({ method: m, headers: { 'idempotency-key': 'stable-1' } })).toBe(true);
    }
    // A key the client generated itself is not a retry guarantee.
    expect(isRetryEligible({ method: 'POST', headers: { 'Idempotency-Key': 'prov-abc' }, __autoIdempotencyKey: true })).toBe(false);
    expect(isRetryEligible(null)).toBe(false);
  });

  it('DOES NOT RETRY: a POST without an idempotency key is attempted exactly once', async () => {
    const seen = useAdapter((c) => fail(503, { code: 'SERVICE_UNAVAILABLE' }, c));
    const err: ProviderApiError = await client.post('/provider/ops/availability/toggle-instant', {}).catch((e) => e);
    expect(seen).toHaveLength(1);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.retryable).toBe(false);
    // The client still satisfies the backend header requirement.
    const sent = seen[0].headers as Record<string, string>;
    expect(sent['Idempotency-Key']).toMatch(/^prov-/);
  });

  it('DOES NOT RETRY across every unsafe method without a caller key', async () => {
    for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
      const seen = useAdapter((c) => fail(500, { code: 'UNKNOWN_ERROR' }, c));
      await client.request({ url: '/x', method } as any).catch(() => null);
      expect(seen).toHaveLength(1);
    }
  });

  it('DOES retry the same POST when the caller supplies a stable idempotency key', async () => {
    const seen = useAdapter((c, n) => (n < 2 ? fail(503, { code: 'SERVICE_UNAVAILABLE' }, c) : ok({ ok: true }, c)));
    const res = await client.request({
      url: '/provider/ops/availability/toggle-instant',
      method: 'POST',
      headers: { 'Idempotency-Key': 'stable-toggle-42' },
    } as any);
    expect(res.data).toEqual({ ok: true });
    expect(seen).toHaveLength(3);
    // The same key on every attempt is what lets the server de-duplicate the replay.
    for (const c of seen) expect((c.headers as Record<string, string>)['Idempotency-Key']).toBe('stable-toggle-42');
  });

  it('retries safe methods up to maxAttempts and then reports it', async () => {
    const seen = useAdapter((c) => fail(503, { code: 'SERVICE_UNAVAILABLE' }, c));
    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    expect(seen).toHaveLength(RETRY.maxAttempts);
    expect(err.retryable).toBe(true);
    expect(err.remedy).toBe('retry');
  });

  it('does not retry a 4xx that is not transient', async () => {
    const seen = useAdapter((c) => fail(422, { code: 'INVALID_INPUT' }, c));
    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    expect(seen).toHaveLength(1);
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.status).toBe(422);
  });

  it('honours skipRetry for a one-shot request', async () => {
    const seen = useAdapter((c) => fail(503, {}, c));
    await client.get('/config', { skipRetry: true } as any).catch(() => null);
    expect(seen).toHaveLength(1);
  });
});

describe('P15.1 cancellation', () => {
  it('an aborted signal stops the request and suppresses retries', async () => {
    const ac = new AbortController();
    const seen: InternalAxiosRequestConfig[] = [];
    let entered: () => void = () => {};
    const reachedAdapter = new Promise<void>((resolve) => {
      entered = resolve;
    });
    client.defaults.adapter = ((config) => {
      seen.push(config);
      entered();
      return new Promise((_resolve, reject) => {
        const e: any = new Error('canceled');
        e.code = 'ERR_CANCELED';
        e.config = config;
        ac.signal.addEventListener('abort', () => reject(e));
      });
    }) as AxiosAdapter;

    const pending = client.get('/config', { signal: ac.signal }).catch((e) => e);
    // Abort only once the request is genuinely in flight.
    await reachedAdapter;
    ac.abort();
    const err = await pending;

    expect(err.cancelled).toBe(true);
    expect(err.retryable).toBe(false);
    // A cancelled request must not condemn the device as offline.
    expect(err.offline).toBe(false);
    expect(isOnline()).toBe(true);
    // One attempt only: a screen that closed must not keep hammering the API.
    await new Promise((r) => setTimeout(r, 100));
    expect(seen).toHaveLength(1);
  });
});

describe('P15.1 offline detection', () => {
  it('a transport failure marks the device offline and asks for a connection check', async () => {
    useAdapter((c) => { throw networkError(c); });
    const err: ProviderApiError = await client.post('/x', {}).catch((e) => e);
    expect(isOnline()).toBe(false);
    expect(err.offline).toBe(true);
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.remedy).toBe('check_connection');
  });

  it('a successful response brings it back online and notifies subscribers', async () => {
    setOnline(false);
    const seen: boolean[] = [];
    const off = subscribeOnline((v) => seen.push(v));
    useAdapter((c) => ok({}, c));
    await client.get('/config');
    expect(isOnline()).toBe(true);
    expect(seen).toEqual([true]);
    off();
  });

  it('a 500 still counts as reachable', async () => {
    useAdapter((c) => fail(500, {}, c));
    await client.get('/config').catch(() => null);
    expect(isOnline()).toBe(true);
  });
});

describe('P15.1 catalog mapping', () => {
  it.each([
    [401, 'AUTHENTICATION_REQUIRED'],
    [403, 'INSUFFICIENT_PERMISSION'],
    [429, 'RATE_LIMITED'],
    [400, 'INVALID_INPUT'],
    [500, 'SERVICE_UNAVAILABLE'],
    [503, 'SERVICE_UNAVAILABLE'],
  ])('maps HTTP %i to the catalog code %s with a next step', async (status, code) => {
    useAdapter((c) => fail(status, {}, c));
    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    expect(err.code).toBe(code);
    expect(typeof err.message).toBe('string');
    expect(err.message.length).toBeGreaterThan(0);
    expect(typeof err.nextStep).toBe('string');
    expect(err.nextStep.length).toBeGreaterThan(0);
    expect(['retry', 'check_connection', 'contact_support']).toContain(err.remedy);
  });

  it('prefers a backend catalog code over the status-derived one', async () => {
    useAdapter((c) => fail(400, { code: 'NO_AVAILABILITY' }, c));
    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    expect(err.code).toBe('NO_AVAILABILITY');
    expect(err.message).toBe('No availability right now.');
  });

  it('localizes the message', () => {
    const en = buildProviderApiError({}, { status: 503, locale: 'en' });
    const ar = buildProviderApiError({}, { status: 503, locale: 'ar' });
    expect(en.message).toBe('This service is temporarily unavailable.');
    expect(ar.message).toBe('هذه الخدمة غير متاحة مؤقتاً.');
    expect(en.message).not.toBe(ar.message);
  });

  it('falls back to the status-derived code for a code the catalog does not know', () => {
    // 400 + an unrecognized code: the status still maps into the catalog rather than
    // leaking the backend's private string to the UI.
    const err = buildProviderApiError({ code: 'some_brand_new_code' }, { status: 400 });
    expect(err.code).toBe('INVALID_INPUT');
    expect(err.message).toBe('Some details look incorrect.');
  });

  it('an unclassifiable status lands on the catalog fallback, not a guess', () => {
    const err = buildProviderApiError({}, { status: 418 });
    expect(err.code).toBe('UNKNOWN_ERROR');
    expect(err.message).toBe('Something went wrong. Please try again.');
    expect(err.nextStep).toBe('If it keeps happening, contact support.');
  });

  it('no HTTP response at all maps to SERVICE_UNAVAILABLE', () => {
    const err = buildProviderApiError({}, {});
    expect(err.code).toBe('SERVICE_UNAVAILABLE');
    expect(err.message).toBe('This service is temporarily unavailable.');
  });

  it('exposes the raw backend detail for flow decisions the catalog cannot express', async () => {
    useAdapter((c) =>
      fail(400, { code: 'INVALID_INPUT', message: 'no active code — please request a new one' }, c),
    );
    const err: ProviderApiError = await client.get('/config').catch((e) => e);
    const detail = backendDetail(err);
    expect(detail?.message).toMatch(/no active code/);
    expect(detail?.status).toBe(400);
  });
});