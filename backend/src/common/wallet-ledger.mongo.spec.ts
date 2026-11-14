/** R11 P1: the wallet ledger writes integer halalas next to the doubles on a real MongoDB (upsert, repeat, debit). */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { postWalletEntry } from './wallet-ledger';

jest.setTimeout(120_000);

describe('postWalletEntry halala shadows (real MongoDB)', () => {
  let mongo: MongoMemoryServer; let conn: Connection;
  beforeAll(async () => { mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } }); conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'wl' }).asPromise(); });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('credit, repeat and debit keep amount_halalas and balance_halalas equal to the doubles', async () => {
    const base = { ownerId: 'p1', ownerType: 'patient', description: 'x' };
    await postWalletEntry(conn as never, { ...base, amount: 40.1, type: 'credit', referenceType: 'refund', referenceId: 'r1' }, { createWalletIfMissing: true });
    let w: any = await conn.collection('wallets').findOne({ ownerId: 'p1' });
    expect([w.balance, w.balance_halalas]).toEqual([40.1, 4010]);
    const repeat = await postWalletEntry(conn as never, { ...base, amount: 40.1, type: 'credit', referenceType: 'refund', referenceId: 'r1' });
    expect(repeat.credited).toBe(false);
    await postWalletEntry(conn as never, { ...base, amount: 15.05, type: 'debit', referenceType: 'booking', referenceId: 'b1' });
    w = await conn.collection('wallets').findOne({ ownerId: 'p1' });
    expect([w.balance, w.balance_halalas]).toEqual([25.05, 2505]);
    const rows: any[] = await conn.collection('wallet_transactions').find({ walletId: w.id }).sort({ createdAt: 1 }).toArray();
    expect(rows.map((r) => [r.amount, r.amount_halalas])).toEqual([[40.1, 4010], [15.05, 1505]]);
  });
});
