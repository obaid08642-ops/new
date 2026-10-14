/**
 * 15.2 — a rapid tap must never be answered from a record that cannot prove it
 * belongs to the request being replayed.
 *
 * Records written by an older writer carry `{ response }` with NO
 * `request_hash`. Such a row cannot be compared against the incoming body, so
 * replaying it answers a reused key with a DIFFERENT body from the stale
 * response. These specs pin the corrected contract:
 *
 *  1. a hashless row is a MISS — the write EXECUTES and the row is healed into
 *     the hashed shape;
 *  2. the healed row then replays for the same body without re-executing;
 *  3. a hashless row with a different body therefore never replays stale data;
 *  4. SET NX must answer the literal "OK"; any other reply is contention.
 */
import { BadRequestException, ConflictException } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import { createHash } from 'crypto';
import { IdempotencyInterceptor } from './idempotency.interceptor';

/** Redis double with a real NX check-and-set, so races are genuine. */
function createFakeRedis() {
  const records = new Map<string, string>();
  return {
    records,
    async get(key: string): Promise<string | null> {
      return records.has(key) ? (records.get(key) as string) : null;
    },
    async set(key: string, value: string, ...args: Array<string | number>): Promise<string | null> {
      const wantsNx = args.map((a) => String(a).toUpperCase()).includes('NX');
      if (wantsNx && records.has(key)) return null;
      records.set(key, value);
      return 'OK';
    },
    async del(key: string): Promise<number> {
      records.delete(key);
      return 1;
    },
  };
}

const reflector = { get: jest.fn().mockReturnValue(false) } as any;
const ctxFor = (request: any) =>
  ({ getHandler: () => ({ name: 'write' }), switchToHttp: () => ({ getRequest: () => request }) }) as any;
const keyedPost = (key: string, body: any = { amount: 50 }): Record<string, any> => ({
  method: 'POST',
  headers: { 'idempotency-key': key },
  user: { id: 'patient-a' },
  body,
  originalUrl: '/orders',
});
const RECORD = 'idempotency:patient-a:POST:/orders:';

describe('15.2 idempotency: an unhashed legacy record is never replayed (mocked Redis)', () => {
  it('executes and heals a hashless record instead of replaying it', async () => {
    const redis = createFakeRedis();
    redis.records.set(`${RECORD}legacy-9`, JSON.stringify({ response: { order_id: 'legacy-1' } }));
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    const next = { handle: jest.fn(() => of({ order_id: 'fresh-9' })) };

    await expect(
      lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('legacy-9')), next as any)),
    ).resolves.toEqual({ order_id: 'fresh-9' });
    expect(next.handle).toHaveBeenCalledTimes(1);
    expect(typeof JSON.parse(redis.records.get(`${RECORD}legacy-9`) as string).request_hash).toBe('string');
  });

  it('replays the healed row for the same body without executing again', async () => {
    const redis = createFakeRedis();
    redis.records.set(`${RECORD}legacy-9`, JSON.stringify({ response: { order_id: 'legacy-1' } }));
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    await lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('legacy-9')), { handle: () => of({ order_id: 'fresh-9' }) } as any));

    const replayNext = { handle: jest.fn(() => of({ order_id: 'SHOULD-NOT-RUN' })) };
    await expect(
      lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('legacy-9')), replayNext as any)),
    ).resolves.toEqual({ order_id: 'fresh-9', idempotent_replay: true });
    expect(replayNext.handle).not.toHaveBeenCalled();
  });

  it('never answers a reused key with a different body from a stale hashless row', async () => {
    const redis = createFakeRedis();
    redis.records.set(`${RECORD}legacy-diff`, JSON.stringify({ response: { order_id: 'stale-legacy' } }));
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    const next = { handle: jest.fn(() => of({ order_id: 'fresh-diff' })) };

    await expect(
      lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('legacy-diff', { amount: 999 })), next as any)),
    ).resolves.toEqual({ order_id: 'fresh-diff' });
    expect(next.handle).toHaveBeenCalledTimes(1);
  });

  it('still rejects a genuine hashed key reuse with a different body', async () => {
    const redis = createFakeRedis();
    const hash = createHash('sha256').update(JSON.stringify({ amount: 50 })).digest('hex');
    redis.records.set(`${RECORD}hashed-1`, JSON.stringify({ request_hash: hash, response: { order_id: 'p-1' } }));
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);

    await expect(
      interceptor.intercept(ctxFor(keyedPost('hashed-1', { amount: 60 })), { handle: jest.fn() } as any),
    ).rejects.toThrow(BadRequestException);
  });

  it('treats a non-OK reply from SET NX as contention', async () => {
    const records = new Map<string, string>();
    const redis = {
      get: async () => null,
      // A client that answers something truthy but not "OK" must not be
      // treated as "the lock is mine".
      set: async () => 'QUEUED',
      del: async () => 1,
      records,
    };
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    await expect(
      interceptor.intercept(ctxFor(keyedPost('weird-reply')), { handle: jest.fn() } as any),
    ).rejects.toThrow(ConflictException);
  });
});