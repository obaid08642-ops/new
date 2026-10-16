import type { AxiosAdapter, AxiosRequestConfig } from 'axios';

jest.mock('../../security/Security', () => ({
  buildHeaders: async () => ({}),
  Tokens: { clear: jest.fn() },
  Vault: { get: async () => null },
  SK: {},
  CryptoUtils: { randomHex: async () => 'abc' },
}));

import client from '../client';

function reply(status: number, data: unknown): AxiosAdapter {
  return async (config: AxiosRequestConfig) => {
    const response = { data, status, statusText: String(status), headers: {}, config: config as never };
    if (status >= 400) {
      const { AxiosError } = require('axios');
      throw new AxiosError(`Request failed with status code ${status}`, 'ERR_BAD_REQUEST', config as never, null, response as never);
    }
    return response as never;
  };
}

describe('provider api client error shape', () => {
  it('keeps err.response so screens can read the server code and the HTTP status', async () => {
    client.defaults.adapter = reply(400, { statusCode: 400, message: 'insufficient_available_balance', error: 'Bad Request' });
    const err: any = await client.post('/provider/payouts/request', {}).catch((e) => e);
    expect(err.response.data.message).toBe('insufficient_available_balance');
    expect(err.response.status).toBe(400);
  });

  it('keeps err.message as the server sentence and err.statusCode', async () => {
    client.defaults.adapter = reply(403, { statusCode: 403, message: 'cod_collection_proof_required' });
    const err: any = await client.post('/provider/pharmacy/allocations/a1/collect', {}).catch((e) => e);
    expect(err.message).toBe('cod_collection_proof_required');
    expect(err.statusCode).toBe(403);
  });

  it('joins class-validator message arrays into one sentence', async () => {
    client.defaults.adapter = reply(400, { statusCode: 400, message: ['amount must be a number', 'iban must be a string'] });
    const err: any = await client.post('/x', {}).catch((e) => e);
    expect(err.message).toBe('amount must be a number, iban must be a string');
    expect(err.response.data.message).toHaveLength(2);
  });

  it('leaves a network failure (no response) as the axios error', async () => {
    client.defaults.adapter = async () => { throw Object.assign(new Error('Network Error'), { isAxiosError: true }); };
    const err: any = await client.get('/x').catch((e) => e);
    expect(err.message).toBe('Network Error');
    expect(err.response).toBeUndefined();
  });
});
