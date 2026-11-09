/** R14: validators, invariants, unique-index audit and the nightly service against a real MongoDB. */
import mongoose, { Connection, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyValidators, countInvalid, planValidators, removeValidators, VALIDATORS } from './db-validators';
import { INVARIANTS, runInvariants } from './invariants';
import { auditUniqueIndexes } from './index-audit';
import { DbIntegrityService } from './db-integrity.service';
import { LedgerService, RefundExecutor, CouponService } from '../finance-engine/finance-engine.module';
import { DurableEventsService } from '../durable-events/durable-events.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { TransactionSchema } from '../../schemas/transaction.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';

jest.setTimeout(180_000);
let mongod: MongoMemoryServer; let conn: Connection; let db: any;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri(), { dbName: 'integrity' }).asPromise(); db = conn.getClient().db('integrity'); });
afterAll(async () => { await conn.close(); await mongod.stop(); });
beforeEach(async () => {
  for (const c of await db.listCollections().toArray()) await db.collection(c.name).drop();
});

const tx = (over: Record<string, unknown> = {}) => ({ id: 't1', booking_kind: 'lab', booking_id: 'b1', patient_id: 'p1', amount: 100, status: 'paid', currency: 'SAR', ...over });

describe('validators', () => {
  it('real documents pass: a ledger row written by LedgerService.append, a transaction and an appointment built by their Mongoose schemas', async () => {
    await new LedgerService(conn as any).append({ type: 'provider_earning', amount: 70, gross: 90, commission: 20, vat: 3, order_id: 'o1', ref_id: 'o1', provider_account_id: 'prov' });
    const Tx = conn.model('TxV', TransactionSchema, 'transactions');
    const Ap = conn.model('ApV', AppointmentSchema, 'appointments');
    await Tx.create({ booking_kind: 'lab', booking_id: 'b1', patient_id: 'p1', amount: 100, status: 'paid' });
    await Ap.collection.insertOne({ id: 'a1', patient_id: 'p', doctor_id: 'd', slot_start: new Date(), slot_end: new Date(), status: 'PENDING', price: 50 });
    await Tx.init(); await Ap.init();            // collMod waits for no index build: in production the indexes exist long before
    conn.deleteModel('TxV'); conn.deleteModel('ApV');   // the index audit looks at every registered model
    await applyValidators(db, 'error');
    // the same shapes again, now under the validator in error mode
    await new LedgerService(conn as any).append({ type: 'refund', amount: 10, order_id: 'o1', ref_id: 'r1' });
    await db.collection('transactions').insertOne({ ...(await db.collection('transactions').findOne({}, { projection: { _id: 0 } })), id: 'second', booking_id: 'b2', status: 'pending' });
    await Ap.collection.insertOne({ id: 'a2', patient_id: 'p', doctor_id: 'd', slot_start: new Date(), slot_end: new Date(), status: 'CONFIRMED', price: 50 });
    expect(await db.collection('platformledgerentries').countDocuments()).toBe(2);
  });

  it('the other writers of validated collections pass in error mode: outbox rows (R2), refund reservations and totals (R21), coupon counters', async () => {
    const now = new Date();
    await db.collection('transactions').insertOne({ id: 'tc', booking_kind: 'consultation', booking_id: 'bk', patient_id: 'p1', amount: 100, status: 'paid', method: 'cash' });
    await db.collection('appointments').insertOne({ id: 'bk', patient_id: 'p1', doctor_id: 'd', slot_start: now, slot_end: now, status: 'COMPLETED', price: 100, payment_method: 'cash', payment_status: 'paid', total_price: 100 });
    await db.collection('coupons').insertOne({ code: 'V', active: true, discount_percent: 10, used_count: 0, max_uses: 5 });
    await db.collection('durable_events').insertOne({ key: 'seed', type: 'x', state: 'done' });
    await db.collection('refund_totals').insertOne({ booking_id: 'seed', refunded_halalas: 0 });
    await db.collection('refund_reservations').insertOne({ refund_id: 'seed', booking_id: 'seed', halalas: 1, state: 'done' });
    await db.collection('platformledgerentries').insertOne({ type: 'refund', amount: 1, createdAt: now });
    await applyValidators(db, 'error');
    const events = new DurableEventsService(conn as any, new EventEmitter2());
    await events.enqueue('payment.completed', { transaction_id: 't' }, { key: 'payment.completed:t' });
    expect(await db.collection('durable_events').findOne({ key: 'payment.completed:t' })).toMatchObject({ state: 'done' });
    const exec = new RefundExecutor(conn as any, new LedgerService(conn as any), {} as any, { emit: () => true } as any);
    await expect(exec.execute({ refund_id: 'rf1', booking_kind: 'consultation', booking_id: 'bk', patient_id: 'p1', amount: 40, reason: 'validator', actor_id: 'admin' })).resolves.toMatchObject({ ok: true });
    expect(await db.collection('refund_totals').findOne({ booking_id: 'bk' })).toMatchObject({ refunded_halalas: 4000 });
    await expect(new CouponService(conn as any).apply('u1', 'V', 'order-1', { order_total: 100 })).resolves.toMatchObject({ code: 'V' });
    expect(await db.collection('coupons').findOne({ code: 'V' })).toMatchObject({ used_count: 1 });
  });

  it('warn lets a bad write through, error refuses it (code 121), and a legacy invalid row can still be updated on another field (level moderate)', async () => {
    await db.collection('transactions').insertOne(tx({ id: 'legacy', amount: -5 }));       // invalid, written before any validator
    await db.collection('transactions').insertOne(tx({ id: 'ok' }));
    await applyValidators(db, 'warn');
    await expect(db.collection('transactions').insertOne(tx({ id: 'bad1', amount: -1 }))).resolves.toBeDefined();
    await applyValidators(db, 'error');
    await expect(db.collection('transactions').insertOne(tx({ id: 'bad2', amount: -1 }))).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('transactions').insertOne(tx({ id: 'bad3', status: 'exploded' }))).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('transactions').insertOne({ id: 'bad4', booking_kind: 'lab' })).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('transactions').updateOne({ id: 'legacy' }, { $set: { failure_reason: 'x' } })).resolves.toBeDefined();
    await expect(db.collection('transactions').updateOne({ id: 'ok' }, { $set: { amount: -9 } })).rejects.toMatchObject({ code: 121 });
  });

  it('rejects an unknown ledger type, a negative ledger amount and an appointment state outside the state machine', async () => {
    await db.createCollection('platformledgerentries'); await db.createCollection('appointments');
    await applyValidators(db, 'error');
    const now = new Date();
    await expect(db.collection('platformledgerentries').insertOne({ type: 'made_up', amount: 1, createdAt: now })).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('platformledgerentries').insertOne({ type: 'refund', amount: -1, createdAt: now })).rejects.toMatchObject({ code: 121 });
    await expect(db.collection('appointments').insertOne({ patient_id: 'p', doctor_id: 'd', slot_start: now, slot_end: now, status: 'LOST', price: 1 })).rejects.toMatchObject({ code: 121 });
  });

  it('plan, skip of absent collections, same-schema detection, count of existing invalid rows and removal', async () => {
    await db.collection('transactions').insertOne(tx({ id: 'legacy', amount: -5 }));
    await db.collection('transactions').insertOne(tx({ id: 'fine' }));
    const before = await planValidators(db);
    expect(before.find((p) => p.collection === 'transactions')).toMatchObject({ exists: true, current: 'none' });
    expect(before.find((p) => p.collection === 'coupons')).toMatchObject({ exists: false });
    expect(await countInvalid(db, VALIDATORS.filter((v) => v.collection === 'transactions'))).toEqual([{ collection: 'transactions', total: 2, invalid: 1 }]);
    const r = await applyValidators(db, 'warn');
    expect(r.applied).toEqual(['transactions']);
    expect(r.skipped_absent).toContain('coupons');
    expect((await planValidators(db)).find((p) => p.collection === 'transactions')).toMatchObject({ current: 'warn', level: 'moderate', sameSchema: true });
    expect(await removeValidators(db)).toEqual(['transactions']);
    expect((await planValidators(db)).find((p) => p.collection === 'transactions')?.current).toBe('none');
  });
});

describe('invariants', () => {
  it('healthy data: nothing to report', async () => {
    await db.collection('transactions').insertOne(tx({ paid_at: new Date() }));
    await db.collection('coupons').insertOne({ code: 'C', used_count: 1, max_uses: 5 });
    await db.collection('platformledgerentries').insertOne({ type: 'refund', amount: 5, ref_type: 'refund', ref_id: 'r1', createdAt: new Date() });
    expect((await runInvariants(conn)).filter((r) => r.count !== 0)).toEqual([]);
  });

  it('each invariant finds what it is named for', async () => {
    const now = new Date(); const old = new Date(now.getTime() - 2 * 3600_000);
    await db.collection('transactions').insertMany([
      tx({ id: 'neg', amount: 5, refunded_amount: -1, paid_at: now }), tx({ id: 'over', amount: 10, refunded_amount: 50, paid_at: now }),
      tx({ id: 'nopaid' }), tx({ id: 'refstat', status: 'refunded', amount: 100, refunded_amount: 10, paid_at: now }),
    ]);
    await db.collection('platformledgerentries').insertMany([
      { type: 'made_up', amount: 1, createdAt: now },
      { type: 'refund', amount: 5, ref_type: 'refund', ref_id: 'dup', createdAt: now }, { type: 'refund', amount: 5, ref_type: 'refund', ref_id: 'dup', createdAt: now },
      { type: 'refund', amount: 1, order_id: 'ghost-order', createdAt: now },
    ]);
    await db.collection('coupons').insertMany([{ code: 'OVER', used_count: 9, max_uses: 5 }, { code: 'NEG', used_count: -1 }]);
    await db.collection('coupon_user_counts').insertOne({ code: 'OVER', user_id: 'u', count: 3 });
    await db.collection('coupon_usages').insertOne({ id: 'cu', code: 'OVER', user_id: 'u', order_id: 'o' });
    await db.collection('refund_reservations').insertOne({ refund_id: 'stuck', booking_id: 'b', halalas: 1, state: 'reserved', createdAt: old });
    const slot = new Date('2026-12-01T10:00:00Z');
    await db.collection('appointments').insertMany([1, 2].map((i) => ({ id: `a${i}`, doctor_id: 'd', slot_start: slot, status: 'CONFIRMED' })));
    await db.collection('appointments').insertOne({ id: 'weird', doctor_id: 'd2', slot_start: slot, status: 'LOST' });
    await db.collection('slotlocks').insertMany([1, 2].map((i) => ({ id: `l${i}`, provider_id: 'p', slot_start: slot, status: 'held' })));
    await db.collection('durable_events').insertMany([{ key: 'dead1', state: 'dead' }, { key: 'stuck1', state: 'pending', created_at: old }]);
    const got = Object.fromEntries((await runInvariants(conn)).map((r) => [r.id, r.count]));
    expect(got).toMatchObject({
      tx_negative_amount: 1, tx_refunded_more_than_paid: 1, tx_paid_without_paid_at: 1, tx_refunded_status_without_amount: 1,
      ledger_unknown_type_or_negative: 1, ledger_duplicate_business_event: 1, coupon_used_over_max: 2, coupon_user_counter_drift: 1,
      refund_reservation_stuck: 1, appointment_double_booked: 1, slot_lock_double_held: 1, appointment_unknown_state: 1,
      durable_events_dead: 1, durable_events_stuck: 1, ledger_order_without_booking: 1,
    });
    expect(Object.keys(got).sort()).toEqual(INVARIANTS.map((i) => i.id).sort());
  });

  it('a check that throws is reported, not silent', async () => {
    const r = await runInvariants({ ...conn, collection: () => { throw new Error('boom'); } } as any, new Date(), ['tx_negative_amount']);
    expect(r[0].count).toBe(-1);
    expect(r[0].description).toContain('the check itself failed');
  });
});

describe('unique index audit', () => {
  it('finds a declared unique index that is not in the database, with the duplicates that stop it from being built; clean once it exists', async () => {
    const S = new Schema({ code: { type: String, unique: true }, org: String, active: Boolean }, { autoIndex: false });
    S.index({ org: 1, code: 1 }, { unique: true, partialFilterExpression: { active: true } });
    conn.model('Dupes', S, 'dupes');
    await db.collection('dupes').insertMany([{ code: 'A', org: 'o', active: true }, { code: 'A', org: 'o', active: true }, { code: 'B', org: 'o', active: false }]);
    const found = await auditUniqueIndexes(conn);
    const f = found.filter((x) => x.collection === 'dupes');
    expect(f.map((x) => x.code)).toEqual(['unique_index_missing', 'unique_index_missing']);
    expect(f.find((x) => 'code' in x.key && Object.keys(x.key).length === 1)).toMatchObject({ duplicate_groups: 1 });
    expect(f.find((x) => 'org' in x.key)).toMatchObject({ duplicate_groups: 1 });
    await db.collection('dupes').deleteOne({ code: 'A', active: true });
    await db.collection('dupes').createIndex({ code: 1 }, { unique: true });
    await db.collection('dupes').createIndex({ org: 1, code: 1 }, { unique: true });          // built, but WITHOUT the partial filter the schema declares
    expect((await auditUniqueIndexes(conn)).filter((x) => x.collection === 'dupes').map((x) => x.code)).toEqual(['unique_index_filter_differs']);
  });
});

describe('DbIntegrityService', () => {
  it('stores findings once, keeps them open while they last, resolves them when fixed', async () => {
    await db.collection('transactions').insertOne(tx({ id: 'neg', amount: -1, paid_at: new Date() }));
    const svc = new DbIntegrityService(conn as any);
    const first = await svc.run();
    expect(first.open_errors).toBeGreaterThanOrEqual(1);
    await svc.run();
    const open = await svc.open();
    expect(open.filter((f: any) => f.id === 'invariant:tx_negative_amount')).toHaveLength(1);
    await db.collection('transactions').deleteMany({});
    await svc.run();
    expect((await svc.open()).some((f: any) => f.id === 'invariant:tx_negative_amount')).toBe(false);
    expect(await db.collection('db_integrity_findings').findOne({ id: 'invariant:tx_negative_amount' })).toMatchObject({ status: 'resolved' });
  });
});
