/**
 * 16.12 - "atomic stock reservation": parallel reservations against one pharmacy item can never take more than it holds,
 * and releasing an allocation twice gives the stock back once. The real SmartSplitService methods on a real MongoDB.
 */
import mongoose, { Connection, Model, Schema } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { SmartSplitService } from './smart-split.service';
import { AllocationItemAction } from '../schemas/pharmacy.schema';

jest.setTimeout(120_000);

describe('SmartSplitService stock reservation', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  let Inv: Model<any>;
  let Alloc: Model<any>;
  let svc: any;

  const stockOf = async (id = 'inv-1') => ((await Inv.findOne({ id }).lean()) as any).stock as number;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'stock' }).asPromise();
    Inv = conn.model('Inv', new Schema({ id: String, provider_account_id: String, stock: Number }, { strict: false }));
    svc = Object.create(SmartSplitService.prototype);
    svc.inv = {
      findOneAndUpdate: (f: any, u: any, o: any) => Inv.findOneAndUpdate(f, u, o),
      updateOne: (f: any, u: any) => Inv.updateOne(f, u),
    };
    Alloc = conn.model('Alloc', new Schema({ id: String, stock_reserved: Boolean }, { strict: false }));
    // the repository's updateOne is findOneAndUpdate: the updated document, or null when nothing matched
    svc.allocs = { updateOne: (f: any, u: any) => Alloc.findOneAndUpdate(f, u, { new: true }) };
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });
  beforeEach(async () => { await Inv.deleteMany({}); await Alloc.deleteMany({}); await Inv.create({ id: 'inv-1', provider_account_id: 'ph-1', stock: 5 }); await Alloc.create({ id: 'al1', stock_reserved: true }); });

  it('20 parallel single-unit reservations of 5 units: exactly 5 win and the stock is 0, never negative', async () => {
    const results = await Promise.all(Array.from({ length: 20 }, () => svc.reserveStock('ph-1', 'inv-1', 1)));
    expect(results.filter(Boolean)).toHaveLength(5);
    expect(await stockOf()).toBe(0);
  });

  it('parallel larger reservations never take more than is there', async () => {
    const results = await Promise.all([3, 3, 3, 2, 2].map((q) => svc.reserveStock('ph-1', 'inv-1', q)));
    const taken = [3, 3, 3, 2, 2].reduce((s, q, i) => s + (results[i] ? q : 0), 0);
    expect(taken).toBeLessThanOrEqual(5);
    expect(await stockOf()).toBe(5 - taken);
  });

  it("another pharmacy's item, a missing item and a non-positive quantity reserve nothing", async () => {
    expect(await svc.reserveStock('someone-else', 'inv-1', 1)).toBe(false);
    expect(await svc.reserveStock('ph-1', 'no-such-item', 1)).toBe(false);
    expect(await svc.reserveStock('ph-1', 'inv-1', 0)).toBe(false);
    expect(await svc.reserveStock('ph-1', 'inv-1', -3)).toBe(false);
    expect(await stockOf()).toBe(5);
  });

  it('releasing the same allocation twice (or in parallel) gives the stock back once', async () => {
    expect(await svc.reserveStock('ph-1', 'inv-1', 3)).toBe(true);
    const alloc: any = {
      id: 'al1', pharmacy_account_id: 'ph-1', stock_reserved: true,
      items: [{ action: AllocationItemAction.AVAILABLE, inventory_id: 'inv-1', qty_offered: 3 }],
    };
    // three callers at once, each with its own in-memory copy (as two requests would have)
    await Promise.all([1, 2, 3].map(() => svc.releaseStockForAllocation({ ...alloc, items: alloc.items.map((i: any) => ({ ...i })) })));
    await svc.releaseStockForAllocation(alloc);
    expect(await stockOf()).toBe(5);
  });
});
