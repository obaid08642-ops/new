import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { checkShadows, halalaCountLines, planBackfill } from './halala-backfill';

/** The same counts as halala-counts.spec.ts, against a real MongoDB (the `$type` / `$exists` filters and the cursor). */
jest.setTimeout(120_000);
describe('halala counts against a real MongoDB (read-only)', () => {
  let mongod: MongoMemoryServer; let conn: Connection; let db: any;
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); db = conn.getClient().db(conn.name); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => { await db.collection('transactions').deleteMany({}); });

  it('counts missing, unclean and disagreeing shadows, and changes nothing', async () => {
    await db.collection('transactions').insertMany([
      { id: 'a', amount: 12.34, amount_halalas: 1234 },   // agrees
      { id: 'b', amount: 10, amount_halalas: 1001 },      // disagrees
      { id: 'c', amount: 7.5 },                           // clean, missing
      { id: 'd', amount: 0.1 + 0.2 },                     // unclean, missing
      { id: 'e', amount: 'text' },                        // not a double
    ]);
    const before = await db.collection('transactions').find({}).sort({ id: 1 }).toArray();
    const target = [{ collection: 'transactions', fields: ['amount'] }];
    const plan = await planBackfill(db, target, 0);
    const shadows = await checkShadows(db, target);
    expect(plan[0]).toMatchObject({ to_fill: 1, unclean: 1 });
    expect(shadows[0]).toEqual({ collection: 'transactions', field: 'amount', doubles: 4, shadow_present: 2, shadow_disagree: 1 });
    expect(halalaCountLines(plan, shadows)[1]).toBe('halala-counts: TOTAL fields=1 missing_shadow=2 unclean=1 shadow_disagree=1');
    expect(await db.collection('transactions').find({}).sort({ id: 1 }).toArray()).toEqual(before);   // nothing was written
  });
});
