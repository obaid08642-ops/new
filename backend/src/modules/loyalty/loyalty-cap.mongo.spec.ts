// 83e550f review (R6.F6): the cap counter must never let an award exceed the cap.
//  - with no counter yet, the first award was inserted with count = pts even
//    when pts > cap, so it was granted in full above the cap;
//  - an insert error other than a duplicate key granted the award (fail-open).
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LoyaltyService } from './loyalty.service';

jest.setTimeout(60_000);
type Reserve = { conn: unknown; reserveCapped(u: string, r: string, p: 'daily' | 'monthly', cap: number, pts: number): Promise<number> };

describe('loyalty cap reservation on a real MongoDB (R6.F6)', () => {
  let mongo: MongoMemoryServer;
  let conn: Connection;
  beforeAll(async () => {
    mongo = await MongoMemoryServer.create();
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'loyalty_cap_test' }).asPromise();
  });
  afterAll(async () => { await conn.close(); await mongo.stop(); });
  beforeEach(async () => { await conn.db!.collection('loyalty_cap_counters').deleteMany({}); });
  const svc = (c: unknown = conn) => { const s = Object.create(LoyaltyService.prototype) as Reserve; s.conn = c; return s; };

  it('a first award larger than the cap is refused', async () => {
    expect(await svc().reserveCapped('u1', 'review_submitted', 'daily', 50, 80)).toBe(0);
    expect(await conn.db!.collection('loyalty_cap_counters').countDocuments({})).toBe(0);
  });

  it('awards up to the cap and refuses the one that would cross it', async () => {
    const s = svc();
    expect(await s.reserveCapped('u2', 'booking_completed', 'daily', 100, 60)).toBe(60);
    expect(await s.reserveCapped('u2', 'booking_completed', 'daily', 100, 40)).toBe(40);
    expect(await s.reserveCapped('u2', 'booking_completed', 'daily', 100, 1)).toBe(0);
  });

  it('a counter write failure grants nothing', async () => {
    const real = conn.collection('loyalty_cap_counters');
    const broken = {
      collection: () => ({
        findOneAndUpdate: real.findOneAndUpdate.bind(real),
        findOne: real.findOne.bind(real),
        insertOne: async () => { throw Object.assign(new Error('not primary'), { code: 10107 }); },
      }),
    };
    expect(await svc(broken).reserveCapped('u3', 'booking_completed', 'daily', 100, 10)).toBe(0);
  });
});
