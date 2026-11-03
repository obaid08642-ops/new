/** R11 P1: the integer shadows are written with every Mongoose write of a money field, and never rounded silently. Real MongoDB. */
import mongoose, { Connection, Model } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { TransactionSchema } from '../schemas/transaction.schema';
import { shadowFields } from './halala-shadow';

jest.setTimeout(120_000);

describe('halalaShadowPlugin (Transaction)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let Txn: Model<any>;
  let n = 0;
  const make = (over: Record<string, unknown> = {}) => Txn.create({ booking_kind: 'consultation', booking_id: `b${++n}`, patient_id: 'p1', amount: 150.5, status: 'paid', ...over });
  const raw = (id: string) => conn.collection('transactions').findOne({ id } as any) as Promise<any>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'hs' }).asPromise();
    Txn = conn.model('Transaction', TransactionSchema);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('create writes amount_halalas next to amount, and leaves the double as it was', async () => {
    const t = await make();
    const row = await raw(t.id);
    expect(row.amount).toBe(150.5);
    expect(row.amount_halalas).toBe(15050);
    expect(row.refunded_amount_halalas).toBeUndefined();   // no refunded amount yet
  });

  it('save() of a changed refunded_amount updates its shadow only', async () => {
    const t = await make({ amount: 99.99 });
    t.refunded_amount = 10.1;
    await t.save();
    const row = await raw(t.id);
    expect(row.refunded_amount).toBe(10.1);
    expect(row.refunded_amount_halalas).toBe(1010);
    expect(row.amount_halalas).toBe(9999);
  });

  it('updateOne $set, top-level fields and findOneAndUpdate carry the shadow in the same write', async () => {
    const t = await make();
    await Txn.updateOne({ id: t.id }, { $set: { refunded_amount: 20.25 } });
    expect((await raw(t.id)).refunded_amount_halalas).toBe(2025);
    await Txn.updateOne({ id: t.id }, { refunded_amount: 30 } as any);
    expect((await raw(t.id)).refunded_amount_halalas).toBe(3000);
    await Txn.findOneAndUpdate({ id: t.id }, { $set: { amount: 200 } });
    const row = await raw(t.id);
    expect(row.amount).toBe(200);
    expect(row.amount_halalas).toBe(20000);
  });

  it('$inc moves the shadow by the halalas of the delta', async () => {
    const t = await make({ refunded_amount: 5 });
    await Txn.updateOne({ id: t.id }, { $inc: { refunded_amount: 2.5 } });
    const row = await raw(t.id);
    expect(row.refunded_amount).toBe(7.5);
    expect(row.refunded_amount_halalas).toBe(500 + 250);
  });

  it('an update that names no money field is left alone', async () => {
    const t = await make();
    await Txn.updateOne({ id: t.id }, { $set: { status: 'refunded' } });
    const row = await raw(t.id);
    expect(row.status).toBe('refunded');
    expect(row.amount_halalas).toBe(15050);
  });

  it('a value with float drift is not rounded silently: the double is stored as given and the shadow stays unset', async () => {
    const t = await make({ amount: 0.1 + 0.2 });
    const row = await raw(t.id);
    expect(row.amount).toBe(0.30000000000000004);
    expect(row.amount_halalas).toBeUndefined();
  });

  it('shadowFields (for raw collection writes) returns shadows for clean numbers only', () => {
    expect(shadowFields({ refunded_amount: 12.34, amount: 0.1 + 0.2 }, ['refunded_amount', 'amount'])).toEqual({ refunded_amount_halalas: 1234 });
    expect(shadowFields({}, ['amount'])).toEqual({});
  });
});
