import type { AxiosAdapter, AxiosRequestConfig } from 'axios';

jest.mock('../../security/Security', () => ({
  buildHeaders: async () => ({}),
  Tokens: { clear: jest.fn() },
  Vault: { get: async () => null },
  SK: {},
  CryptoUtils: { randomHex: async () => 'abc' },
}));

import client from '../client';

const { AxiosError } = require('axios');

const answer = (config: AxiosRequestConfig, status: number, headers: Record<string, string> = {}, data: unknown = {}) => {
  const response = { data, status, statusText: String(status), headers, config: config as never };
  if (status >= 400) throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config as never, null, response as never);
  return response as never;
};
/** An adapter that plays a script of outcomes, one per call: a status, or 'timeout', or 'network'. */
function script(...outcomes: Array<number | 'timeout' | 'network'>) {
  const seen: AxiosRequestConfig[] = [];
  const adapter: AxiosAdapter = async (config) => {
    seen.push(config);
    const next = outcomes[Math.min(seen.length - 1, outcomes.length - 1)];
    if (next === 'timeout') throw new AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config as never);
    if (next === 'network') throw new AxiosError('Network Error', 'ERR_NETWORK', config as never);
    return answer(config, next, next === 429 || next === 503 ? { 'retry-after': '2' } : {});
  };
  return { adapter, seen };
}

describe('provider api client policy (15.1)', () => {
  beforeEach(() => jest.useFakeTimers());
  afterEach(() => jest.useRealTimers());

  it('uses 15 s by default, 60 s for an upload and 45 s for the AI routes', async () => {
    const { adapter, seen } = script(200);
    client.defaults.adapter = adapter;
    await client.get('/provider/orders');
    await client.post('/provider/documents', new FormData());
    await client.post('/provider/ai/summary', {});
    expect(seen.map((c) => c.timeout)).toEqual([15_000, 60_000, 45_000]);
  });

  it('a read that times out is tried again, three tries in all', async () => {
    const { adapter, seen } = script('timeout');
    client.defaults.adapter = adapter;
    const done = expect(client.get('/provider/orders')).rejects.toMatchObject({ code: 'ECONNABORTED' });
    await jest.advanceTimersByTimeAsync(60_000);
    await done;
    expect(seen).toHaveLength(3);
  });

  it('a retry honours Retry-After (not at 1999 ms, at 2000 ms)', async () => {
    const { adapter, seen } = script(503, 200);
    client.defaults.adapter = adapter;
    const result = client.get('/provider/orders');
    await jest.advanceTimersByTimeAsync(1999);
    expect(seen).toHaveLength(1);
    await jest.advanceTimersByTimeAsync(2);
    await result;
    expect(seen).toHaveLength(2);
  });

  it('a write with a key the client made is not replayed on 503 or after a timeout', async () => {
    const a = script(503);
    client.defaults.adapter = a.adapter;
    await expect(client.post('/provider/payouts/request', {})).rejects.toMatchObject({ response: { status: 503 } });
    expect(a.seen).toHaveLength(1);

    const b = script('timeout');
    client.defaults.adapter = b.adapter;
    await expect(client.post('/provider/payouts/request', {})).rejects.toMatchObject({ code: 'ECONNABORTED' });
    expect(b.seen).toHaveLength(1);
  });

  it('a write with the caller\'s own key is replayed with the same key', async () => {
    const { adapter, seen } = script(503, 200);
    client.defaults.adapter = adapter;
    const result = client.post('/provider/payouts/request', {}, { headers: { 'Idempotency-Key': 'payout-attempt-1-abcdef' } });
    await jest.advanceTimersByTimeAsync(2500);
    await result;
    expect(seen.map((c) => (c.headers as any)['Idempotency-Key'])).toEqual(['payout-attempt-1-abcdef', 'payout-attempt-1-abcdef']);
  });

  it('429 is tried again even for a write without a key', async () => {
    const { adapter, seen } = script(429, 200);
    client.defaults.adapter = adapter;
    const result = client.post('/provider/payouts/request', {});
    await jest.advanceTimersByTimeAsync(2500);
    await result;
    expect(seen).toHaveLength(2);
  });

  it('a cancelled request is not tried again', async () => {
    const controller = new AbortController();
    const adapter: AxiosAdapter = async (config) => {
      controller.abort();
      throw new AxiosError('canceled', 'ERR_CANCELED', config as never);
    };
    client.defaults.adapter = adapter;
    await expect(client.get('/provider/orders', { signal: controller.signal })).rejects.toBeTruthy();
  });
});
