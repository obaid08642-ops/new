import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { applyBackfill, planBackfill } from './halala-backfill';

jest.setTimeout(120_000);
describe('halala backfill (expand phase)', () => {
  let mongod: MongoMemoryServer; let conn: Connection; let db: any;
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); db = conn.getClient().db(conn.name); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => { for (const c of ['transactions', 'moyasar_payments', 'platformledgerentries', 'einvoices', 'refundrequests', 'wallets', 'wallet_transactions']) await db.collection(c).deleteMany({}); });

  const seed = async () => {
    await db.collection('transactions').insertMany([
      { id: 't1', amount: 12.34, refunded_amount: 0 },
      { id: 't2', amount: 0.1 + 0.2, refunded_amount: 5 },           // float drift: must not be written
      { id: 't3', amount: 100 },                                      // no refunded_amount
      { id: 't4', amount: 10, amount_halalas: 1000 },                 // already filled
    ]);
    await db.collection('platformledgerentries').insertOne({ id: 'l1', type: 'provider_earning', amount: 70, gross: 90, commission: 20, vat: 3 });
  };

  it('dry run counts what it would fill and lists the unclean values; writes nothing', async () => {
    await seed();
    const plan = await planBackfill(db);
    const tx = plan.find((p) => p.collection === 'transactions' && p.field === 'amount')!;
    expect(tx).toMatchObject({ to_fill: 2, unclean: 1 });
    expect(tx.unclean_sample[0]).toMatchObject({ id: 't2' });
    expect(await db.collection('transactions').countDocuments({ amount_halalas: { $exists: true } })).toBe(1);   // only t4, as seeded
  });

  it('apply fills clean values as integers, skips the unclean one, leaves the originals alone, skips the ledger without the flag, and is idempotent', async () => {
    await seed();
    const first = await applyBackfill(db);
    expect(first).toEqual({ written: 4, skipped_unclean: 1 });   // t1.amount, t1.refunded, t2.refunded, t3.amount ; t2.amount unclean
    const t1 = await db.collection('transactions').findOne({ id: 't1' });
    expect(t1).toMatchObject({ amount: 12.34, amount_halalas: 1234, refunded_amount: 0, refunded_amount_halalas: 0 });
    expect(Number.isInteger(t1.amount_halalas)).toBe(true);
    expect(await db.collection('transactions').findOne({ id: 't2' })).not.toHaveProperty('amount_halalas');
    expect(await db.collection('transactions').findOne({ id: 't3' })).toMatchObject({ amount_halalas: 10000 });
    expect(await db.collection('platformledgerentries').findOne({ id: 'l1' })).not.toHaveProperty('amount_halalas');
    expect(await applyBackfill(db)).toEqual({ written: 0, skipped_unclean: 1 });
    expect(await applyBackfill(db, { includeLedger: true })).toMatchObject({ written: 4 });
    expect(await db.collection('platformledgerentries').findOne({ id: 'l1' })).toMatchObject({ amount: 70, amount_halalas: 7000, gross_halalas: 9000, commission_halalas: 2000, vat_halalas: 300 });
  });

  it('unclean rows at the front of a page do not hide the clean rows behind them', async () => {
    await db.collection('transactions').insertMany([
      ...Array.from({ length: 7 }, (_, i) => ({ id: `bad${i}`, amount: i + 0.005 })),
      { id: 'good', amount: 9.99 },
    ]);
    expect(await applyBackfill(db, { batch: 3 })).toMatchObject({ written: 1 });
    expect(await db.collection('transactions').findOne({ id: 'good' })).toMatchObject({ amount_halalas: 999 });
  });

  it('wallet balances and wallet ledger rows are filled', async () => {
    await db.collection('wallets').insertOne({ id: 'w1', ownerId: 'p1', balance: 50.5 });
    await db.collection('wallet_transactions').insertMany([{ id: 'x1', walletId: 'w1', amount: 40 }, { id: 'x2', walletId: 'w1', amount: 10.5 }]);
    const plan = await planBackfill(db);
    expect(plan.find((p) => p.collection === 'wallets' && p.field === 'balance')).toMatchObject({ to_fill: 1, unclean: 0 });
    await applyBackfill(db);
    expect((await db.collection('wallets').findOne({ id: 'w1' })).balance_halalas).toBe(5050);
    expect((await db.collection('wallet_transactions').findOne({ id: 'x2' })).amount_halalas).toBe(1050);
  });

  it('invoices keep the sign of a credit note; refund requests are filled; a negative amount elsewhere is still listed as unclean', async () => {
    await db.collection('einvoices').insertMany([
      { id: 'i1', subtotal: 130.43, vat_amount: 19.57, total: 150, discount: 0 },
      { id: 'c1', type: 'credit_note', subtotal: -65.22, vat_amount: -9.78, total: -75 },
    ]);
    await db.collection('refundrequests').insertOne({ id: 'r1', amount: 49.9 });
    await db.collection('refundrequests').insertOne({ id: 'r2', amount_paid: 200, refund_amount: 100 });
    await db.collection('transactions').insertOne({ id: 'neg', amount: -5 });
    const plan = await planBackfill(db);
    expect(plan.find((p) => p.collection === 'einvoices' && p.field === 'total')).toMatchObject({ to_fill: 2, unclean: 0 });
    expect(plan.find((p) => p.collection === 'transactions' && p.field === 'amount')).toMatchObject({ unclean: 1 });
    await applyBackfill(db);
    const cn = await db.collection('einvoices').findOne({ id: 'c1' });
    expect([cn.subtotal_halalas, cn.vat_amount_halalas, cn.total_halalas]).toEqual([-6522, -978, -7500]);
    expect((await db.collection('refundrequests').findOne({ id: 'r1' })).amount_halalas).toBe(4990);
    expect((await db.collection('refundrequests').findOne({ id: 'r2' })).refund_amount_halalas).toBe(10000);
    expect((await db.collection('transactions').findOne({ id: 'neg' })).amount_halalas).toBeUndefined();
  });
});
