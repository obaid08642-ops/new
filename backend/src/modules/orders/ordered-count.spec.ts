import { MongoMemoryServer } from 'mongodb-memory-server';
import mongoose from 'mongoose';
import { MedicineSchema } from '../../schemas/medicine.schema';
import { countDeliveredOrder, DELIVERED_COUNT_PIPELINE } from './ordered-count';

/** "Most ordered": a delivered order counts once per product, in one write, and the listing reads the count from an index. */
describe('orders_count (Most ordered)', () => {
  let mongod: MongoMemoryServer;
  let meds: mongoose.mongo.Collection;
  const PUBLIC = { public_eligibility: true, medical_review_status: 'approved' };

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri(), { dbName: 'ordered_count' });
    meds = mongoose.connection.collection('medicines');
    // the index exactly as the schema declares it (the schema's two text indexes cannot coexist on a real server, so createIndexes() is not used)
    const [keys, options] = MedicineSchema.indexes().find(([, o]) => o?.name === 'public_most_ordered') as [any, any];
    await meds.createIndex(keys, { name: options.name });
    await meds.insertMany(['a', 'b', 'c', 'd'].map((id) => ({ id, name_ar: id, ...PUBLIC, orders_count: 0 })));
  }, 120_000);
  afterAll(async () => { await mongoose.disconnect(); await mongod.stop(); });

  const counts = async () => Object.fromEntries((await meds.find({}).toArray()).map((m: any) => [m.id, m.orders_count]));

  it('adds 1 to each distinct product of the order, once, whatever the quantity or repeated lines', async () => {
    const items = [{ medicine_id: 'a', qty: 5 }, { medicine_id: 'a', qty: 1 }, { medicine_id: 'b', qty: 1 }, { medicine_id: '' }, {}, { medicine_id: 42 }];
    await countDeliveredOrder(mongoose.connection, items);
    expect(await counts()).toEqual({ a: 1, b: 1, c: 0, d: 0 });
  });

  it('is one update for the whole order, and an empty or malformed order writes nothing', async () => {
    const updateMany = jest.fn().mockResolvedValue({ modifiedCount: 2 });
    const conn: any = { collection: jest.fn(() => ({ updateMany })) };
    expect(await countDeliveredOrder(conn, [{ medicine_id: 'x' }, { medicine_id: 'y' }, { medicine_id: 'x' }])).toBe(2);
    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updateMany).toHaveBeenCalledWith({ id: { $in: ['x', 'y'] } }, { $inc: { orders_count: 1 } });
    expect(await countDeliveredOrder(conn, undefined)).toBe(0);
    expect(await countDeliveredOrder(conn, [])).toBe(0);
    expect(updateMany).toHaveBeenCalledTimes(1);
  });

  it('a failing write never throws (it must not block the delivery)', async () => {
    const conn: any = { collection: () => ({ updateMany: () => Promise.reject(new Error('mongo down')) }) };
    await expect(countDeliveredOrder(conn, [{ medicine_id: 'a' }])).resolves.toBe(0);
  });

  it('the listing order is most orders first with the id as tie-break, read from the public_most_ordered index (no in-memory sort)', async () => {
    await meds.updateOne({ id: 'c' }, { $set: { orders_count: 7 } });
    await meds.updateOne({ id: 'd' }, { $set: { orders_count: 1 } });
    // a (1), b (1), c (7), d (1); a hidden product with the highest count never shows
    await meds.insertOne({ id: 'hidden', ...PUBLIC, public_eligibility: false, orders_count: 99 });
    const ids = (await meds.find(PUBLIC).sort({ orders_count: -1, _id: 1 }).toArray()).map((m: any) => m.id);
    expect(ids[0]).toBe('c');
    expect(ids).not.toContain('hidden');
    const plan: any = await meds.find(PUBLIC).sort({ orders_count: -1, _id: 1 }).limit(24).explain('executionStats');
    const text = JSON.stringify(plan.queryPlanner.winningPlan);
    expect(text).toContain('IXSCAN');
    expect(text).toContain('public_most_ordered');
    expect(text).not.toContain('"SORT"');
  });

  it('the recount pipeline counts orders per product (not units), only DELIVERED ones, one per order', async () => {
    const orders = mongoose.connection.collection('orders');
    await orders.insertMany([
      { id: 'o1', state: 'DELIVERED', items: [{ medicine_id: 'a', qty: 9 }, { medicine_id: 'a', qty: 1 }, { medicine_id: 'b', qty: 1 }] },
      { id: 'o2', state: 'DELIVERED', items: [{ medicine_id: 'a', qty: 1 }] },
      { id: 'o3', state: 'CANCELLED', items: [{ medicine_id: 'a', qty: 1 }, { medicine_id: 'c', qty: 1 }] },
      { id: 'o4', state: 'DELIVERED', items: [{ name_ar: 'free text' }] },
    ]);
    const out = Object.fromEntries((await orders.aggregate(DELIVERED_COUNT_PIPELINE as any).toArray()).map((r: any) => [r._id, r.orders]));
    expect(out).toEqual({ a: 2, b: 1 });
  });
});
