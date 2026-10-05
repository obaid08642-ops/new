/**
 * P15.9 — ordinary traffic anchors the server-time clock: the single HTTP
 * client feeds every response `Date` header (success and failure alike) into
 * `noteServerDate`, so no extra request is needed and a device clock off by
 * ±1 day stops mattering for OTP/slot/reminder comparisons.
 *
 * Same fake-adapter technique as `client.resilience.test.ts`: the platform
 * HTTP layer is replaced so the client's own interceptors run for real.
 */
import type { AxiosAdapter, AxiosResponse, InternalAxiosRequestConfig } from 'axios';

import client from '../client';
import { resetOnlineState } from '../online';
import {
  getServerTimeOffsetMs,
  isServerTimeAnchored,
  resetServerTimeForTests,
  serverNowMs,
} from '../../time/serverTime';

const realAdapter = client.defaults.adapter;

function ok(
  data: unknown,
  config: InternalAxiosRequestConfig,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { data, status: 200, statusText: 'OK', headers, config } as AxiosResponse;
}

function fail(
  status: number,
  data: unknown,
  config: InternalAxiosRequestConfig,
  headers: Record<string, string> = {},
): AxiosResponse {
  return { data, status, statusText: 'ERR', headers, config } as AxiosResponse;
}

/** Install a fake adapter driven by `script` (mirrors axios status handling). */
function useAdapter(script: (c: InternalAxiosRequestConfig, n: number) => Promise<AxiosResponse> | AxiosResponse) {
  const seen: InternalAxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = (config) => {
    const n = seen.length;
    seen.push(config);
    return Promise.resolve()
      .then(() => script(config, n))
      .then((response) => {
        const validate = (config as unknown as { validateStatus?: (s: number) => boolean }).validateStatus;
        const validateStatus = typeof validate === 'function' ? validate : (s: number) => s >= 200 && s < 300;
        if (validateStatus(response.status)) return response;
        return Promise.reject(
          Object.assign(new Error(`Request failed with status code ${response.status}`), {
            config,
            response,
            isAxiosError: true,
            code: 'ERR_BAD_RESPONSE',
          }),
        );
      });
  };
  client.defaults.adapter = adapter;
  return seen;
}

beforeEach(() => {
  resetOnlineState(true);
  resetServerTimeForTests();
  jest.restoreAllMocks();
});

afterEach(() => {
  client.defaults.adapter = realAdapter;
  resetOnlineState(true);
  resetServerTimeForTests();
});

describe('P15.9 the client anchors server time from response Date headers', () => {
  const SERVER_MS = Date.parse('Wed, 21 Oct 2026 07:00:00 GMT');
  const SERVER_HEADER = 'Wed, 21 Oct 2026 07:00:00 GMT';

  it('a success response anchors the clock', async () => {
    useAdapter((c) => ok({ ok: true }, c, { date: SERVER_HEADER }));
    await client.get('/config');
    expect(isServerTimeAnchored()).toBe(true);
    expect(getServerTimeOffsetMs()).not.toBeNull();
  });

  it('an error response still anchors (its Date header is server-stamped too)', async () => {
    useAdapter((c) => fail(503, { code: 'SERVICE_UNAVAILABLE' }, c, { Date: SERVER_HEADER }));
    await expect(client.get('/config')).rejects.toMatchObject({ code: 'SERVICE_UNAVAILABLE' });
    expect(isServerTimeAnchored()).toBe(true);
  });

  it('a response without a Date header leaves a previous anchor untouched', async () => {
    useAdapter((c) => ok({ ok: true }, c, { date: SERVER_HEADER }));
    await client.get('/config');
    const offset = getServerTimeOffsetMs();
    useAdapter((c) => ok({ ok: true }, c));
    await client.get('/config');
    expect(getServerTimeOffsetMs()).toBe(offset);
  });

  it('end to end: anchored traffic corrects a device clock a day ahead for slot checks', async () => {
    // Device clock runs +1 day; the server Date header is the truth.
    const skewedNow = SERVER_MS + 86_400_000;
    const nowSpy = jest.spyOn(Date, 'now').mockReturnValue(skewedNow);
    try {
      useAdapter((c) => ok({ ok: true }, c, { date: SERVER_HEADER }));
      await client.get('/config');
      // serverNowMs() with the (mocked, skewed) device clock recovers server time.
      expect(serverNowMs()).toBe(SERVER_MS);
      // A slot one hour after the server instant is in the future…
      expect(SERVER_MS + 3_600_000 < serverNowMs()).toBe(false);
      // …while the raw device clock would call it long past.
      expect(SERVER_MS + 3_600_000 < skewedNow).toBe(true);
    } finally {
      nowSpy.mockRestore();
    }
  });
});
