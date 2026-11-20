import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { walletOwedCounts } from './wallet-owed';

jest.setTimeout(120_000);
describe('wallet owed counts (R11 wallet plan, step 3)', () => {
  let mongod: MongoMemoryServer; let conn: Connection; let db: any;
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); db = conn.getClient().db(conn.name); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => { await db.collection('wallets').deleteMany({}); await db.collection('wallet_transactions').deleteMany({}); });
  const now = Date.parse('2026-12-01T00:00:00Z');
  const monthsAgo = (m: number) => new Date(now - m * 30.44 * 86_400_000 - 1000);

  it('no wallets: all zero, nothing owed', async () => {
    expect(await walletOwedCounts(db, now)).toEqual({ rows: 0, zero_rows: 0, positive_rows: 0, negative_rows: 0, not_a_number_rows: 0, positive_total_sar: 0, positive_without_activity_rows: 0, positive_newest_activity_months_max: null, activity_checked: true });
  });

  it('counts zero / positive / negative / bad balances, one total from whole halalas, and how stale the positive ones are', async () => {
    await db.collection('wallets').insertMany([
      { id: 'w1', balance: 0 }, { id: 'w2', balance: 50.5 }, { id: 'w3', balance: 0.1 + 0.2 }, { id: 'w4', balance: -3 }, { id: 'w5', balance: 'x' }, { id: 'w6' },
    ]);
    await db.collection('wallet_transactions').insertMany([
      { id: 't1', walletId: 'w2', amount: 50.5, createdAt: monthsAgo(14) },
      { id: 't2', walletId: 'w2', amount: 1, createdAt: monthsAgo(9) },     // the newest of w2: 9 months
      { id: 't3', walletId: 'w3', amount: 0.3, createdAt: monthsAgo(2) },   // 2 months
    ]);
    const r = await walletOwedCounts(db, now);
    expect(r).toMatchObject({ rows: 6, zero_rows: 1, positive_rows: 2, negative_rows: 1, not_a_number_rows: 2, positive_without_activity_rows: 0 });
    expect(r.positive_total_sar).toBe(50.8);                    // 5050 + 30 halalas: no float drift
    expect(r.positive_newest_activity_months_max).toBe(9);      // the stalest of the positive wallets' newest transactions
  });

  it('a positive wallet with no transaction at all is counted separately', async () => {
    await db.collection('wallets').insertOne({ id: 'w1', balance: 12 });
    const r = await walletOwedCounts(db, now);
    expect(r).toMatchObject({ positive_rows: 1, positive_without_activity_rows: 1, positive_newest_activity_months_max: null });
  });

  it('returns no id and no per-row value, only the fixed set of counts, and writes nothing', async () => {
    await db.collection('wallets').insertOne({ id: 'SECRET-WALLET-ID', ownerId: 'SECRET-OWNER', balance: 7.25 });
    const r = await walletOwedCounts(db, now);
    expect(Object.keys(r).sort()).toEqual(['activity_checked', 'negative_rows', 'not_a_number_rows', 'positive_newest_activity_months_max', 'positive_rows', 'positive_total_sar', 'positive_without_activity_rows', 'rows', 'zero_rows']);
    expect(JSON.stringify(r)).not.toMatch(/SECRET/);
    expect(await db.collection('wallets').countDocuments({})).toBe(1);
    expect((await db.collection('wallets').findOne({ id: 'SECRET-WALLET-ID' })).balance_halalas).toBeUndefined();
  });
});
