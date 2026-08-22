import { BadRequestException, ConflictException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { IdempotencyInterceptor } from './idempotency.interceptor';

describe('IdempotencyInterceptor', () => {
  const handler = (body: any, userId = 'patient-a', path = '/moyasar/payments', idempotencyKey: string | null = 'same-client-key') => ({
    getHandler: () => ({ name: 'handler' }),
    switchToHttp: () => ({
      getRequest: () => ({
        method: 'POST',
        headers: idempotencyKey ? { 'idempotency-key': idempotencyKey } : {},
        user: { id: userId },
        body,
        originalUrl: path,
      }),
    }),
  } as any);

  let redisClient: any;
  let interceptor: IdempotencyInterceptor;

  beforeEach(() => {
    redisClient = { get: jest.fn(), set: jest.fn(), del: jest.fn().mockResolvedValue(undefined) };
    interceptor = new IdempotencyInterceptor(
      { getClient: () => redisClient } as any,
      { get: jest.fn().mockReturnValue(false) } as any,
    );
  });

  it('rejects a contract-required mutation without an Idempotency-Key before running its handler', async () => {
    const requiredInterceptor = new IdempotencyInterceptor(
      { getClient: () => redisClient } as any,
      { get: jest.fn().mockReturnValue(true) } as any,
    );
    const next = { handle: jest.fn(() => of({ unexpected: true })) };

    await expect(requiredInterceptor.intercept(handler({ quantity: 1 }, 'patient-a', '/cart/items', null), next)).rejects.toThrow(BadRequestException);
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('persists a successful response under a user-and-route-scoped key after acquiring a lock', async () => {
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    const next = { handle: jest.fn(() => of({ payment_id: 'p-1' })) };

    await expect(lastValueFrom(await interceptor.intercept(handler({ amount: 50 }), next))).resolves.toEqual({ payment_id: 'p-1' });

    expect(redisClient.set).toHaveBeenCalledWith(
      'idempotency:patient-a:POST:/moyasar/payments:same-client-key:lock', '1', 'EX', 120, 'NX',
    );
    const persisted = JSON.parse(redisClient.set.mock.calls[1][1]);
    expect(persisted.response).toEqual({ payment_id: 'p-1' });
    expect(persisted.request_hash).toEqual(expect.any(String));
    expect(redisClient.del).toHaveBeenCalledWith('idempotency:patient-a:POST:/moyasar/payments:same-client-key:lock');
  });

  it('returns the cached result for the same request without executing the handler', async () => {
    const requestHash = require('crypto').createHash('sha256').update(JSON.stringify({ amount: 50 })).digest('hex');
    redisClient.get.mockResolvedValue(JSON.stringify({ request_hash: requestHash, response: { payment_id: 'p-1' } }));
    const next = { handle: jest.fn(() => of({ payment_id: 'new' })) };

    await expect(lastValueFrom(await interceptor.intercept(handler({ amount: 50 }), next))).resolves.toEqual({ payment_id: 'p-1', idempotent_replay: true });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('rejects key reuse with a different payload and prevents a concurrent duplicate execution', async () => {
    const hash = require('crypto').createHash('sha256').update(JSON.stringify({ amount: 50 })).digest('hex');
    redisClient.get.mockResolvedValueOnce(JSON.stringify({ request_hash: hash, response: { payment_id: 'p-1' } }));
    await expect(interceptor.intercept(handler({ amount: 60 }), { handle: jest.fn() })).rejects.toThrow(BadRequestException);

    redisClient.get.mockResolvedValueOnce(null);
    redisClient.set.mockResolvedValueOnce(null);
    await expect(interceptor.intercept(handler({ amount: 50 }), { handle: jest.fn() })).rejects.toThrow(ConflictException);
  });

  it('does not share idempotency state across authenticated users', async () => {
    redisClient.get.mockResolvedValue(null);
    redisClient.set.mockResolvedValue('OK');
    await lastValueFrom(await interceptor.intercept(handler({ amount: 50 }, 'patient-b'), { handle: () => of({ payment_id: 'p-2' }) }));

    expect(redisClient.set).toHaveBeenCalledWith(
      'idempotency:patient-b:POST:/moyasar/payments:same-client-key:lock', '1', 'EX', 120, 'NX',
    );
  });
});
