/**
 * 15.2 — No double actions (server side).
 *
 * The two historical idempotency interceptors shared one Redis key shape but
 * used different per-request markers, so a request passing through BOTH
 * (global + explicit wiring) saw the first instance's lock as a conflict and
 * answered 409 on every keyed write. They are now one protocol
 * (IdempotencyKeyInterceptor; the global IdempotencyInterceptor subclasses
 * it), and these specs pin the merged contract:
 *   1. any mix of global + explicit wiring processes a request exactly once,
 *   2. pre-shape records (no request_hash) replay instead of re-executing,
 *   3. the same keyed write fired 10x concurrently creates exactly one
 *      record: one success, nine 409s, then a replay — never two executions.
 *
 * Reverting the merge (split markers again) makes the mixed-wiring tests 409.
 * Removing the lock makes the 10x test execute more than once.
 */
import { ConflictException } from '@nestjs/common';
import { from, lastValueFrom, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { IdempotencyInterceptor } from './idempotency.interceptor';
import { IdempotencyKeyInterceptor } from './idempotency/idempotency-key.interceptor';
import { IdempotencyKeyStore } from './idempotency/idempotency-key.store';

function createFakeRedis() {
  const records = new Map<string, string>();
  return {
    records,
    async get(key: string): Promise<string | null> {
      return records.has(key) ? (records.get(key) as string) : null;
    },
    // Synchronous map ops inside the async fn: the NX check-and-set is
    // atomic, so concurrent interceptors genuinely race on one lock.
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

/** Nest chaining: outer.next.handle() runs the inner interceptor. */
const chain = (outer: any, inner: any, ctx: any, innerHandler: any) =>
  outer.intercept(ctx, { handle: () => from(inner.intercept(ctx, innerHandler)).pipe(mergeMap((o: any) => o)) });

describe('15.2 merged idempotency (mocked Redis, no DB)', () => {
  it('global + per-controller wiring (old outer, new inner) processes once, never 409', async () => {
    const redis = createFakeRedis();
    const globalInstance = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    const handlerInstance = new IdempotencyKeyInterceptor(new IdempotencyKeyStore(redis));
    const request = keyedPost('mixed-1');
    const inner = { handle: jest.fn(() => of({ order_id: 'o-1' })) };

    const out = await chain(globalInstance, handlerInstance, ctxFor(request), inner);
    await expect(lastValueFrom(out)).resolves.toEqual({ order_id: 'o-1' });
    expect(inner.handle).toHaveBeenCalledTimes(1);
    // Both historical markers are set together now — whichever instance runs
    // second sees the first's marker and passes through.
    expect(request.__idempotencyHandled).toBe(true);
    expect(request.__idempotencyKeyHandled).toBe(true);
    const nxCalls = [...redis.records.keys()].filter((k) => k.endsWith(':lock'));
    expect(nxCalls).toHaveLength(0); // lock released after success
    expect(redis.records.has('idempotency:patient-a:POST:/orders:mixed-1')).toBe(true);
  });

  it('global + per-controller wiring (new outer, old inner) processes once, never 409', async () => {
    const redis = createFakeRedis();
    const globalInstance = new IdempotencyKeyInterceptor(new IdempotencyKeyStore(redis));
    const handlerInstance = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    const request = keyedPost('mixed-2');
    const inner = { handle: jest.fn(() => of({ order_id: 'o-2' })) };

    const out = await chain(globalInstance, handlerInstance, ctxFor(request), inner);
    await expect(lastValueFrom(out)).resolves.toEqual({ order_id: 'o-2' });
    expect(inner.handle).toHaveBeenCalledTimes(1);
  });

  it('replays a pre-shape record (no request_hash) without re-executing the write', async () => {
    const redis = createFakeRedis();
    redis.records.set(
      'idempotency:patient-a:POST:/orders:legacy-9',
      JSON.stringify({ response: { order_id: 'legacy-1' } }),
    );
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    const next = { handle: jest.fn(() => of({ order_id: 'SHOULD-NOT-RUN' })) };

    await expect(
      lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('legacy-9')), next)),
    ).resolves.toEqual({ order_id: 'legacy-1', idempotent_replay: true });
    expect(next.handle).not.toHaveBeenCalled();
  });

  it('fires the same keyed write 10x concurrently and executes exactly once', async () => {
    const redis = createFakeRedis();
    const interceptor = new IdempotencyInterceptor({ getClient: () => redis } as any, reflector);
    let executions = 0;
    let release!: () => void;
    const gate = new Promise<void>((r) => { release = r; });
    const handler = {
      handle: () => {
        executions += 1;
        return from(gate.then(() => ({ order_id: 'order-1' })));
      },
    };

    // All ten race while the winner is still in-flight (handler gated), so
    // nine must conflict on the lock and none may execute the write.
    const settled = await Promise.allSettled(
      Array.from({ length: 10 }, () => interceptor.intercept(ctxFor(keyedPost('tap-10')), handler as any)),
    );
    const won = settled.filter((s) => s.status === 'fulfilled') as Array<{ value: any }>;
    const lost = settled.filter((s) => s.status === 'rejected') as Array<{ reason: any }>;
    expect(executions).toBe(1);
    expect(won).toHaveLength(1);
    expect(lost).toHaveLength(9);
    for (const l of lost) expect(l.reason).toBeInstanceOf(ConflictException);

    release();
    await expect(lastValueFrom(won[0].value)).resolves.toEqual({ order_id: 'order-1' });
    expect(executions).toBe(1);

    // The persisted response now replays; the write still ran exactly once.
    const replayNext = { handle: jest.fn(() => of({ order_id: 'SHOULD-NOT-RUN' })) };
    await expect(
      lastValueFrom(await interceptor.intercept(ctxFor(keyedPost('tap-10')), replayNext)),
    ).resolves.toEqual({ order_id: 'order-1', idempotent_replay: true });
    expect(executions).toBe(1);
    expect(replayNext.handle).not.toHaveBeenCalled();
  });
});
