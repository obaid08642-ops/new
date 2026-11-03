/**
 * R2: the outbox keeps its promises with a real MongoDB (replica set, so transactions work): nothing is lost when the process dies between the
 * write and the handler, a key is never recorded or handled twice, two consumers never run one event at once, failures retry and end in `dead`,
 * and a payment saved but never announced is found by the reconciler.
 */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryReplSet } from 'mongodb-memory-server';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { COLLECTION, DurableEventsService, MAX_ATTEMPTS, emitDurable } from './durable-events.service';
import { PaymentEventsReconciler, paymentCompletedKey } from './payment-events.reconciler';

jest.setTimeout(120_000);
let rs: MongoMemoryReplSet;
let conn: Connection;

beforeAll(async () => {
  rs = await MongoMemoryReplSet.create({ replSet: { count: 1 } });
  conn = await mongoose.createConnection(rs.getUri()).asPromise();
  await new DurableEventsService(conn as any, new EventEmitter2()).onModuleInit();   // the unique index on `key` is what makes a key one row
});
afterAll(async () => { await conn?.close(); await rs?.stop(); });
beforeEach(async () => { await conn.collection(COLLECTION).deleteMany({}); await conn.collection('transactions').deleteMany({}); await conn.collection('durable_meta').deleteMany({}); });

const make = () => {
  const emitter = new EventEmitter2({ wildcard: true });
  const seen: any[] = [];
  emitter.on('payment.completed', (p) => { seen.push(p); });
  const svc = new DurableEventsService(conn as any, emitter);
  return { emitter, seen, svc };
};
const row = (key: string) => conn.collection(COLLECTION).findOne({ key });
const PAY = { booking_id: 'b1', transaction_id: 't1', amount: 50 };

describe('write + first delivery', () => {
  it('records the row, delivers once, marks it done', async () => {
    const { svc, seen } = make();
    await svc.enqueue('payment.completed', PAY, { key: 'payment.completed:t1' });
    expect(seen).toHaveLength(1);
    expect(seen[0]).toMatchObject({ ...PAY, __durable: { key: 'payment.completed:t1', delivery: 1 } });
    expect(await row('payment.completed:t1')).toMatchObject({ state: 'done', attempts: 1 });
  });

  it('the same key twice (retry, webhook redelivery) is one row and one delivery', async () => {
    const { svc, seen } = make();
    const a = await svc.enqueue('payment.completed', PAY, { key: 'k' });
    const b = await svc.enqueue('payment.completed', PAY, { key: 'k' });
    expect([a.duplicate, b.duplicate]).toEqual([false, true]);
    expect(seen).toHaveLength(1);
    expect(await conn.collection(COLLECTION).countDocuments({ key: 'k' })).toBe(1);
  });

  it('emitDurable without the service falls back to a plain emit (hand-built unit tests)', async () => {
    const emitter = new EventEmitter2(); const got: any[] = []; emitter.on('x', (p) => got.push(p));
    await emitDurable(undefined, emitter, 'x', { a: 1 }, 'k');
    expect(got).toEqual([{ a: 1 }]);
  });
});

describe('the process dies', () => {
  it('between the write and the handler: a restarted worker delivers it exactly once', async () => {
    const dying = make();
    jest.spyOn(dying.svc, 'deliverNow').mockImplementation(async () => { throw new Error('SIGKILL'); });   // the row is written, nothing else happens
    await expect(dying.svc.enqueue('payment.completed', PAY, { key: 'k' })).rejects.toThrow('SIGKILL');
    expect(dying.seen).toHaveLength(0);
    expect(await row('k')).toMatchObject({ state: 'pending' });

    const worker = make();                       // a new process, empty memory
    expect(await worker.svc.drain()).toBe(1);    // no queue in the test: the sweeper delivers inline
    expect(worker.seen).toHaveLength(1);
    expect(await worker.svc.drain()).toBe(0);    // nothing left: not doubled
    expect(worker.seen).toHaveLength(1);
  });

  it('in the middle of the handler: a live lease blocks a second consumer, an expired lease lets one take over as delivery 2', async () => {
    const base = { key: 'k', type: 'payment.completed', payload: PAY, state: 'processing', attempts: 1, next_at: new Date(), created_at: new Date() };
    await conn.collection(COLLECTION).insertOne({ ...base, lease_until: new Date(Date.now() + 60_000) });   // the first handler is still running
    const w = make();
    expect(await w.svc.process('k')).toBe('skipped');
    expect(w.seen).toHaveLength(0);
    await conn.collection(COLLECTION).updateOne({ key: 'k' }, { $set: { lease_until: new Date(Date.now() - 1) } });   // it died: the lease ran out
    expect(await w.svc.drain()).toBe(1);
    expect(w.seen[0].__durable).toEqual({ key: 'k', delivery: 2 });
    expect(await row('k')).toMatchObject({ state: 'done' });
  });
});

describe('concurrency', () => {
  it('five consumers racing for one event: exactly one runs the listeners', async () => {
    const { svc, seen } = make();
    await conn.collection(COLLECTION).insertOne({ key: 'k', type: 'payment.completed', payload: PAY, state: 'pending', attempts: 0, next_at: new Date(), created_at: new Date() });
    const results = await Promise.all([1, 2, 3, 4, 5].map(() => make().svc.process('k')));
    expect(results.filter((r) => r === 'done')).toHaveLength(1);
    expect(results.filter((r) => r === 'skipped')).toHaveLength(4);
    expect(seen).toHaveLength(0);   // the race used five other services; `svc` was never asked
    void svc;
  });

  it('listeners run once per event even when ten writers use the same key at the same time', async () => {
    const { svc, seen } = make();
    const r = await Promise.all(Array.from({ length: 10 }, () => svc.enqueue('payment.completed', PAY, { key: 'same' })));
    expect(r.filter((x) => !x.duplicate)).toHaveLength(1);
    expect(seen).toHaveLength(1);
  });
});

describe('failures', () => {
  it('a throwing listener leaves the row pending with a retry time, then a later delivery succeeds', async () => {
    const { svc, emitter, seen } = make();
    let fail = true;
    emitter.removeAllListeners();
    emitter.on('payment.completed', (p) => { if (fail) throw new Error('boom'); seen.push(p); });
    await svc.enqueue('payment.completed', PAY, { key: 'k' });
    const r1: any = await row('k');
    expect(r1).toMatchObject({ state: 'pending', attempts: 1, last_error: 'boom' });
    expect(r1.next_at.getTime()).toBeGreaterThan(Date.now());
    expect(await svc.drain()).toBe(0);                       // backoff not elapsed: not retried yet
    fail = false;
    await conn.collection(COLLECTION).updateOne({ key: 'k' }, { $set: { next_at: new Date() } });
    expect(await svc.drain()).toBe(1);
    expect(seen).toHaveLength(1);
    expect(await row('k')).toMatchObject({ state: 'done', attempts: 2 });
  });

  it(`after ${MAX_ATTEMPTS} failed deliveries the row is dead, counted in stats, and replayDead puts it back`, async () => {
    const { svc, emitter, seen } = make();
    emitter.removeAllListeners();
    emitter.on('payment.completed', () => { throw new Error('always'); });
    await conn.collection(COLLECTION).insertOne({ key: 'k', type: 'payment.completed', payload: PAY, state: 'pending', attempts: 0, next_at: new Date(), created_at: new Date() });
    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      await conn.collection(COLLECTION).updateOne({ key: 'k' }, { $set: { next_at: new Date() } });
      await svc.process('k');
    }
    expect(await row('k')).toMatchObject({ state: 'dead', attempts: MAX_ATTEMPTS });
    expect(await svc.stats()).toMatchObject({ dead: 1, pending: 0 });
    expect(await svc.drain()).toBe(0);                       // dead rows are not swept
    emitter.removeAllListeners(); emitter.on('payment.completed', (p) => { seen.push(p); });
    expect(await svc.replayDead('k')).toBe(1);
    await svc.drain();
    expect(seen).toHaveLength(1);
  });
});

describe('same write as the state change', () => {
  it('a transaction that aborts leaves no event; one that commits leaves exactly one (delivered after the commit)', async () => {
    const { svc, seen } = make();
    const orders = conn.collection('orders_t');
    const s1 = await conn.startSession();
    await s1.withTransaction(async () => {
      await orders.insertOne({ id: 'o1' }, { session: s1 });
      await svc.enqueue('payment.completed', PAY, { key: 'k1', session: s1 });
      throw new Error('rollback');
    }).catch(() => null);
    await s1.endSession();
    expect(await row('k1')).toBeNull();
    expect(await orders.countDocuments({ id: 'o1' })).toBe(0);

    const s2 = await conn.startSession();
    await s2.withTransaction(async () => {
      await orders.insertOne({ id: 'o2' }, { session: s2 });
      await svc.enqueue('payment.completed', PAY, { key: 'k2', session: s2 });
    });
    await s2.endSession();
    expect(await row('k2')).toMatchObject({ state: 'pending' });
    expect(seen).toHaveLength(0);                            // nothing is announced before the commit is known
    await svc.deliverNow('k2');
    expect(seen).toHaveLength(1);
  });
});

describe('PaymentEventsReconciler', () => {
  const txn = (id: string, paidMinutesAgo: number) => ({ id, status: 'paid', booking_kind: 'lab', booking_id: `b-${id}`, patient_id: 'p1', amount: 10, paid_at: new Date(Date.now() - paidMinutesAgo * 60_000) });

  it('announces a payment that was saved but never enqueued (process died between save and enqueue), once', async () => {
    const { svc, seen } = make();
    const rec = new PaymentEventsReconciler(conn as any, svc);
    await conn.collection('durable_meta').insertOne({ _id: 'payment_reconcile_since' as any, at: new Date(Date.now() - 3600_000) });   // the reconciler started an hour ago
    await conn.collection('transactions').insertMany([txn('tA', 10), txn('tB', 10), txn('tFresh', 0)] as any);
    await svc.enqueue('payment.completed', { transaction_id: 'tB' }, { key: paymentCompletedKey('tB') });   // B was announced normally
    seen.length = 0;
    expect(await rec.reconcile()).toBe(1);                   // A only: B has its row, Fresh is inside the grace period
    expect(seen.map((p) => p.transaction_id)).toEqual(['tA']);
    expect(await rec.reconcile()).toBe(0);
    expect(seen).toHaveLength(1);
  });

  it('never re-announces payments made before it first ran (deploying it must not replay history)', async () => {
    const { svc, seen } = make();
    await conn.collection('transactions').insertOne(txn('old', 60 * 24) as any);
    const rec = new PaymentEventsReconciler(conn as any, svc);
    expect(await rec.reconcile()).toBe(0);
    expect(seen).toHaveLength(0);
  });
});
