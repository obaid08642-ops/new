/**
 * R21: fifty requests at the same moment against a real MongoDB. Exactly the allowed number may win; nobody is double-booked, double-refunded or over a limit.
 * Each case names the production code it exercises.
 */
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { AppointmentSchema } from '../schemas/appointment.schema';
import { SlotLockSchema } from '../schemas/slot-lock.schema';
import { SlotLocksService } from '../modules/slot-locks/slot-locks.module';
import { CouponService, LedgerService, RefundExecutor } from '../modules/finance-engine/finance-engine.module';

jest.setTimeout(180_000);
const N = 50;
const burst = <T>(fn: (i: number) => Promise<T>) => Promise.allSettled(Array.from({ length: N }, (_, i) => fn(i)));
const ok = (r: PromiseSettledResult<unknown>[]) => r.filter((x) => x.status === 'fulfilled').length;

let mongod: MongoMemoryServer; let conn: Connection;
beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); });
afterAll(async () => { await conn.close(); await mongod.stop(); });

describe('appointment slot (appointment.schema.ts unique partial index)', () => {
  it('50 simultaneous bookings of one doctor and slot: one wins, 49 get E11000 (the service maps it to slot_already_booked)', async () => {
    const M: Model<any> = conn.model('AppointmentRace', AppointmentSchema, 'appointments_race');
    await M.createIndexes();
    const slot = new Date('2026-12-01T10:00:00Z');
    const r = await burst((i) => M.collection.insertOne({ id: `a${i}`, doctor_id: 'd1', patient_id: `p${i}`, slot_start: slot, status: 'PENDING' }));
    expect(ok(r)).toBe(1);
    const codes = r.filter((x) => x.status === 'rejected').map((x: any) => x.reason?.code);
    expect(codes).toHaveLength(N - 1);
    expect(new Set(codes)).toEqual(new Set([11000]));
    // a cancelled booking frees the slot (the index is partial on active statuses)
    await M.collection.updateOne({ doctor_id: 'd1', status: 'PENDING' }, { $set: { status: 'CANCELLED' } });
    await expect(M.collection.insertOne({ id: 'again', doctor_id: 'd1', patient_id: 'px', slot_start: slot, status: 'PENDING' })).resolves.toBeDefined();
  });
});

describe('slot lock (SlotLocksService.reserve)', () => {
  it('50 patients reserving one provider slot: exactly one lock, the others get slot_taken', async () => {
    const M: Model<any> = conn.model('SlotLock', SlotLockSchema, 'slotlocks_race');
    await M.createIndexes();
    const svc = new SlotLocksService(M as any);
    const r = await burst((i) => svc.reserve({ id: `p${i}` }, { provider_id: 'prov1', booking_kind: 'lab', slot_start: '2026-12-01T10:00:00Z' }));
    expect(ok(r)).toBe(1);
    const msgs = r.filter((x) => x.status === 'rejected').map((x: any) => x.reason?.message ?? x.reason?.response?.message);
    expect(msgs.every((m) => m === 'slot_taken')).toBe(true);
    expect(await M.countDocuments({ provider_id: 'prov1', status: 'held' })).toBe(1);
  });
});

describe('coupon limits (CouponService.apply)', () => {
  const ctx = { order_total: 100 };
  const coupons = () => conn.collection('coupons');
  beforeEach(async () => { await coupons().deleteMany({}); await conn.collection('coupon_usages').deleteMany({}); await conn.collection('coupon_failures').deleteMany({}); });

  it('max_uses 5, 50 different users at once: used_count ends at exactly 5 and only 5 applies succeed', async () => {
    await coupons().insertOne({ code: 'PROMO5', active: true, discount_percent: 10, max_uses: 5, used_count: 0 });
    const svc = new CouponService(conn as any);
    const r = await burst((i) => svc.apply(`u${i}`, 'PROMO5', `o${i}`, ctx));
    expect(ok(r)).toBe(5);
    expect((await coupons().findOne({ code: 'PROMO5' }) as any).used_count).toBe(5);
    expect(await conn.collection('coupon_usages').countDocuments({ code: 'PROMO5' })).toBe(5);
  });

  it('one use per user, ONE user placing 50 orders at once: one discount, used_count 1', async () => {
    await coupons().insertOne({ code: 'ONCE', active: true, discount_percent: 10, used_count: 0 });
    const svc = new CouponService(conn as any);
    const r = await burst((i) => svc.apply('same-user', 'ONCE', `order-${i}`, ctx));
    expect(ok(r)).toBe(1);
    expect((await coupons().findOne({ code: 'ONCE' }) as any).used_count).toBe(1);
    expect(await conn.collection('coupon_usages').countDocuments({ code: 'ONCE', user_id: 'same-user' })).toBe(1);
  });

  it('three uses per user, one user, 50 orders at once: exactly three', async () => {
    await coupons().insertOne({ code: 'THREE', active: true, discount_percent: 10, usage_limit_per_user: 3, used_count: 0 });
    const svc = new CouponService(conn as any);
    const r = await burst((i) => svc.apply('u', 'THREE', `o-${i}`, ctx));
    expect(ok(r)).toBe(3);
    expect((await coupons().findOne({ code: 'THREE' }) as any).used_count).toBe(3);
  });
});

describe('refund cap and idempotency (RefundExecutor.execute)', () => {
  const world = async (booking: string) => {
    await conn.collection('transactions').insertOne({ id: `t-${booking}`, booking_kind: 'consultation', booking_id: booking, patient_id: 'p1', status: 'paid', method: 'cash', amount: 100 });
    await conn.collection('appointments').insertOne({ id: booking, patient_id: 'p1', payment_method: 'cash', payment_status: 'paid', total_price: 100, status: 'COMPLETED' });
    const exec = new RefundExecutor(conn as any, new LedgerService(conn as any), {} as any, { emit: () => true } as any);
    const go = (id: string, amount: number) => exec.execute({ refund_id: id, booking_kind: 'consultation', booking_id: booking, patient_id: 'p1', amount, reason: 'race', actor_id: 'admin' });
    const refunded = async () => (await conn.collection('platformledgerentries').find({ type: 'refund', order_id: booking }).toArray()).reduce((s, r: any) => s + r.amount, 0);
    return { go, refunded };
  };

  it('50 different refunds of 30 SAR on a 100 SAR payment at once: at most 100 SAR leaves (3 refunds), never 4', async () => {
    const { go, refunded } = await world('bk-cap');
    const r = await burst((i) => go(`ref-${i}`, 30));
    expect(ok(r)).toBe(3);
    expect(await refunded()).toBe(90);
    const failed = r.filter((x) => x.status === 'rejected').map((x: any) => String(x.reason?.message ?? x.reason?.response?.message));
    expect(failed.every((m) => /refund_exceeds_paid|refund_in_progress/.test(m))).toBe(true);
  });

  it('the SAME refund id 50 times at once (a double click on execute): the money goes out once', async () => {
    const { go, refunded } = await world('bk-same');
    const r = await burst(() => go('ref-same', 40));
    const results = r.filter((x) => x.status === 'fulfilled').map((x: any) => x.value.method);
    expect(results.filter((m) => m !== 'already_executed')).toHaveLength(1);
    expect(await refunded()).toBe(40);
    expect(await conn.collection('platformledgerentries').countDocuments({ type: 'refund', ref_id: 'ref-same' })).toBe(1);
  });

  it('a refund that fails before the ledger row gives its room back (a later refund of the full amount works)', async () => {
    const { go, refunded } = await world('bk-fail');
    await conn.collection('platformledgerentries').createIndex({ ref_id: 1 }, { unique: true, partialFilterExpression: { ref_id: 'boom' } });
    await conn.collection('platformledgerentries').insertOne({ type: 'noise', ref_id: 'boom', amount: 0 });   // makes the ledger append of refund id 'boom' fail with E11000
    await expect(go('boom', 100)).rejects.toBeDefined();
    expect(await refunded()).toBe(0);
    await expect(go('after', 100)).resolves.toMatchObject({ ok: true });
    expect(await refunded()).toBe(100);
  });
});
