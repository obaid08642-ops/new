import { ConflictException } from '@nestjs/common';
import { ExecutionContext } from '@nestjs/common';
import { CallHandler } from '@nestjs/common';
import { lastValueFrom, of } from 'rxjs';
import {
  IdempotencyKeyStore,
  IdempotencyRedisClient,
} from './idempotency-key.store';
import { IdempotencyKeyInterceptor } from './idempotency-key.interceptor';
import { OutboxRecord, buildOutboxRecord } from '../outbox/outbox.record';
import { drainOutboxBatch } from '../outbox/outbox.relay';

function createFakeRedis(): IdempotencyRedisClient & { records: Map<string, string> } {
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

interface FakeWriteDb {
  rows: Map<string, Record<string, unknown>>;
  outbox: OutboxRecord[];
  creates: number;
}

function ctxFor(body: unknown, key: string | undefined, userId: string, path: string): ExecutionContext {
  const request: Record<string, unknown> = {
    method: 'POST',
    headers: key ? { 'idempotency-key': key } : {},
    user: { id: userId },
    body,
    originalUrl: path,
  };
  return {
    switchToHttp: () => ({ getRequest: () => request }),
  } as unknown as ExecutionContext;
}

describe('14.4 write-path resilience (mocked stores, no DB)', () => {
  it('duplicate POST executes once, replays original response, then outbox relay drains', async () => {
    const redis = createFakeRedis();
    const store = new IdempotencyKeyStore(redis);
    const interceptor = new IdempotencyKeyInterceptor(store);
    const db: FakeWriteDb = { rows: new Map(), outbox: [], creates: 0 };

    const runWrite = (): CallHandler => ({
      handle: () => {
        db.creates += 1;
        const rowId = `order-${db.creates}`;
        db.rows.set(rowId, { id: rowId, amount: 50 });
        db.outbox.push(
          buildOutboxRecord(
            { aggregateType: 'order', aggregateId: rowId, eventType: 'order.created', payload: { id: rowId } },
            `evt-${db.creates}`,
            new Date(0).toISOString(),
          ),
        );
        return of({ order_id: rowId });
      },
    }) as unknown as CallHandler;

    const body = { amount: 50 };
    const first$ = await interceptor.intercept(ctxFor(body, 'client-key-1', 'patient-a', '/orders'), runWrite());
    const first = await lastValueFrom(first$);
    expect(first).toEqual({ order_id: 'order-1' });

    const replay$ = await interceptor.intercept(
      ctxFor(body, 'client-key-1', 'patient-a', '/orders'),
      { handle: () => of({ order_id: 'SHOULD-NOT-RUN' }) } as unknown as CallHandler,
    );
    const replayed = await lastValueFrom(replay$);
    expect(replayed).toEqual({ order_id: 'order-1', idempotent_replay: true });
    expect(db.creates).toBe(1);
    expect(db.rows.size).toBe(1);

    const delivered: OutboxRecord[] = [];
    const drain = await drainOutboxBatch(
      {
        fetchPending: async (limit: number): Promise<OutboxRecord[]> =>
          db.outbox.filter((r) => r.status === 'pending').slice(0, limit),
        publish: async (record: OutboxRecord): Promise<void> => {
          delivered.push(record);
        },
        markSent: async (id: string, sentAtIso: string): Promise<void> => {
          const row = db.outbox.find((r) => r.id === id);
          if (row) {
            row.status = 'sent';
            row.sentAt = sentAtIso;
          }
        },
        markFailed: async (id: string, errorMessage: string): Promise<void> => {
          const row = db.outbox.find((r) => r.id === id);
          if (row) {
            row.status = 'failed';
            row.lastError = errorMessage;
          }
        },
      },
      10,
      new Date(1).toISOString(),
    );

    expect(drain).toEqual({ attempted: 1, sent: 1, failed: 0 });
    expect(delivered.map((r) => r.id)).toEqual(['evt-1']);
    const idle = await drainOutboxBatch(
      {
        fetchPending: async (): Promise<OutboxRecord[]> =>
          db.outbox.filter((r) => r.status === 'pending'),
        publish: async (): Promise<void> => {
          throw new Error('must not publish when nothing is pending');
        },
        markSent: async (): Promise<void> => undefined,
        markFailed: async (): Promise<void> => undefined,
      },
      10,
    );
    expect(idle).toEqual({ attempted: 0, sent: 0, failed: 0 });
  });

  it('concurrent duplicate is rejected without executing the write twice', async () => {
    const redis = createFakeRedis();
    const store = new IdempotencyKeyStore(redis);
    const interceptor = new IdempotencyKeyInterceptor(store);
    let executions = 0;
    const handler = { handle: (): ReturnType<CallHandler['handle']> => {
      executions += 1;
      return of({ ok: true });
    } } as unknown as CallHandler;

    const body = { amount: 50 };
    const first$ = await interceptor.intercept(ctxFor(body, 'race-key', 'patient-a', '/orders'), handler);
    await lastValueFrom(first$);

    // Simulate a stale in-flight lock left by a crashed worker: replay the
    // lock key without a completed response, then a duplicate must conflict.
    const recordKey = 'idempotency:patient-a:POST:/orders:race-key-2';
    await redis.set(`${recordKey}:lock`, '1', 'EX', 120, 'NX');
    const racing = new IdempotencyKeyStore(redis);
    const racingInterceptor = new IdempotencyKeyInterceptor(racing);
    await expect(
      racingInterceptor.intercept(ctxFor(body, 'race-key-2', 'patient-a', '/orders'), handler),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(executions).toBe(1);
  });
});
