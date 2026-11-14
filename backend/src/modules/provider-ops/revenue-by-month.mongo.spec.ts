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

  // The widgets the phone used to add up from its newest 200 rows: earnings by what they were earned on, movements by ledger type, and the all-time wallet figures.
  it('aggregates the widgets on the server: by_service, by_type and the all-time wallet totals', async () => {
    const now = new Date();
    const thisMonth = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 15, 9));
    const longAgo = new Date(Date.UTC(now.getUTCFullYear() - 2, now.getUTCMonth(), 15, 9));
    const L = conn.collection('platformledgerentries');
    await L.deleteMany({});
    await L.insertMany([
      { provider_account_id: 'acc-1', type: 'provider_earning', ref_type: 'consultation', amount: 100, amount_halalas: 10000, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_earning', ref_type: 'consultation', amount: 0.1, createdAt: thisMonth },          // no shadow: the double is used
      { provider_account_id: 'acc-1', type: 'provider_earning', ref_type: 'lab_booking', amount: 40, amount_halalas: 4000, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_earning', amount: 5, amount_halalas: 500, createdAt: thisMonth },                 // no ref_type: "other"
      { provider_account_id: 'acc-1', type: 'commission', amount: 7, amount_halalas: 700, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'payout', amount: 60, amount_halalas: 6000, createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_earning', ref_type: 'nursing_visit', amount: 25, amount_halalas: 2500, state: 'pending', createdAt: thisMonth },
      { provider_account_id: 'acc-1', type: 'provider_earning', ref_type: 'consultation', amount: 11, amount_halalas: 1100, createdAt: longAgo },   // outside a 3-month range, inside the wallet totals
      { provider_account_id: 'acc-2', type: 'provider_earning', ref_type: 'consultation', amount: 777, createdAt: thisMonth },          // another provider
    ]);
    const out = await new ProviderOpsService(conn).revenueByMonth('acc-1', 3);

    // earnings of the range by what they were earned on, largest first; a row with no ref_type is "other"
    expect(out.by_service).toEqual([
      { key: 'consultation', amount: 100.1 },
      { key: 'lab_booking', amount: 40 },
      { key: 'nursing_visit', amount: 25 },
      { key: 'other', amount: 5 },
    ]);
    // every movement of the range by ledger type (the earnings of the range add up to 170.1)
    expect(out.by_type).toEqual([
      { key: 'provider_earning', amount: 170.1 },
      { key: 'payout', amount: 60 },
      { key: 'commission', amount: 7 },
    ]);
    // all-time: the 2-year-old earning counts here although it is outside the 3 months, and the pending row is pending
    expect(out.wallet).toEqual({ earned: 181.1, paid: 60, pending: 25, balance: 121.1 });
  });
});
