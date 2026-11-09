import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProviderOpsService } from './provider-ops.module';

/** The revenue pipeline against a real MongoDB: Riyadh months, the halala shadow or the double, refunds netted, other providers and other row types left out. */
jest.setTimeout(120_000);
describe('revenue per month against a real MongoDB', () => {
  let mongod: MongoMemoryServer; let conn: Connection;
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });

  it('adds the month\'s earnings, takes the refund clawbacks off, and keeps the Riyadh month boundary', async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 9));
    const L = conn.collection('platformledgerentries');
    await L.deleteMany({});
    await L.insertMany([
      { provider_account_id: 'acc-1', type: 'provider_earning', amount: 100.1, amount_halalas: 10010, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_earning', amount: 0.2, createdAt: thisMonth },                                  // a row with no shadow yet: its double is used
      { provider_account_id: 'acc-1', type: 'provider_debit', ref_type: 'refund', amount: 30, amount_halalas: 3000, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_debit', ref_type: 'penalty', amount: 999, createdAt: thisMonth },                // not a refund
      { provider_account_id: 'acc-1', type: 'payout', amount: 50, createdAt: thisMonth },                                             // not revenue
      { provider_account_id: 'acc-2', type: 'provider_earning', amount: 777, createdAt: thisMonth },                                  // another provider
    ]);
    const out = await new ProviderOpsService(conn).revenueByMonth('acc-1', 3);
    const m = out.months[2];
    expect(m).toMatchObject({ earned: 100.3, refunded: 30, net: 70.3 });
    expect(out.months[0]).toMatchObject({ earned: 0, refunded: 0, net: 0 });
    expect(out.total).toEqual({ earned: 100.3, refunded: 30, net: 70.3 });
  });
});
