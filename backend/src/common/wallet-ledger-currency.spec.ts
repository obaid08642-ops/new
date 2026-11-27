/** Money step M4: a wallet and its ledger rows carry `_minor` + `currency`; the wallet's own currency decides rounding and shadows. Real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { postWalletEntry, walletLedgerBalance, WalletInsufficientError } from './wallet-ledger';
import { runWithMarketContext } from '../modules/markets/market-context';

jest.setTimeout(120_000);
const inMarket = <T>(currency: string, fn: () => T) => runWithMarketContext({ currency } as any, fn);

describe('wallet ledger by currency', () => {
  let mongo: MongoMemoryServer; let conn: Connection; let n = 0;
  const owner = () => `owner${++n}`;
  const wallet = (ownerId: string) => conn.collection('wallets').findOne({ ownerId, ownerType: 'provider' } as any) as Promise<any>;
  const txs = (walletId: string) => conn.collection('wallet_transactions').find({ walletId } as any).toArray() as Promise<any[]>;
  const post = (ownerId: string, amount: number, type: 'credit' | 'debit', ref: string) =>
    postWalletEntry(conn as any, { ownerId, ownerType: 'provider', amount, type, referenceType: 'refund', referenceId: ref, description: 't' }, { createWalletIfMissing: true });

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'wl' }).asPromise();
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('SAR (no market): wallet and rows carry halalas and minor with the same value, currency SAR; amounts rounded as before', async () => {
    const o = owner();
    const r = await post(o, 10.555, 'credit', 'a');   // 10.555 -> 10.56 (roundSar, half up on the decimal text)
    expect(r).toEqual({ credited: true, balance: 10.56 });
    const w = await wallet(o);
    expect(w.currency).toBe('SAR');
    expect(w.balance).toBe(10.56); expect(w.balance_halalas).toBe(1056); expect(w.balance_minor).toBe(1056);
    const [t] = await txs(w.id);
    expect(t.amount).toBe(10.56); expect(t.amount_halalas).toBe(1056); expect(t.amount_minor).toBe(1056); expect(t.currency).toBe('SAR');
  });

  it('a wallet created in a BHD market is BHD: 3 digits, fils in _minor, no halalas anywhere', async () => {
    const o = owner();
    const r = await inMarket('BHD', () => post(o, 1.234, 'credit', 'a'));
    expect(r).toEqual({ credited: true, balance: 1.234 });
    const w = await wallet(o);
    expect(w.currency).toBe('BHD');
    expect(w.balance).toBe(1.234); expect(w.balance_minor).toBe(1234); expect(w.balance_halalas).toBeUndefined();
    const [t] = await txs(w.id);
    expect(t.amount).toBe(1.234); expect(t.amount_minor).toBe(1234); expect(t.amount_halalas).toBeUndefined(); expect(t.currency).toBe('BHD');
  });

  it('the BHD wallet keeps BHD for later entries outside any market, and sums fils exactly (no 2-digit rounding)', async () => {
    const o = owner();
    await inMarket('BHD', () => post(o, 1.234, 'credit', 'a'));
    const r = await post(o, 0.001, 'credit', 'b');        // outside a market: the wallet's currency decides
    expect(r.balance).toBe(1.235);
    expect((await wallet(o)).balance_minor).toBe(1235);
    expect(await walletLedgerBalance(conn as any, (await wallet(o)).id)).toBe(1.235);
  });

  it('a BHD debit larger than the balance is refused, and the balance stays', async () => {
    const o = owner();
    await inMarket('BHD', () => post(o, 1, 'credit', 'a'));
    await expect(post(o, 1.001, 'debit', 'b')).rejects.toBeInstanceOf(WalletInsufficientError);
    expect((await wallet(o)).balance).toBe(1);
  });

  it('a wallet from before currencies existed (no currency field) stays in the Saudi currency, even inside another market', async () => {
    const o = owner();
    await conn.collection('wallets').insertOne({ id: `w-${o}`, ownerId: o, ownerType: 'provider', balance: 0, balance_halalas: 0, savedCards: [] } as any);
    const r = await inMarket('BHD', () => post(o, 10.555, 'credit', 'a'));
    expect(r.balance).toBe(10.56);                         // rounded to 2 digits: it is a SAR wallet
    const w = await wallet(o);
    expect(w.balance_halalas).toBe(1056); expect(w.balance_minor).toBe(1056); expect(w.currency).toBe('SAR');
  });

  it('an amount that rounds to nothing creates neither a wallet nor a row', async () => {
    const o = owner();
    expect(await post(o, 0.004, 'credit', 'a')).toEqual({ credited: false, balance: null });
    expect(await wallet(o)).toBeNull();
    const o2 = owner();
    expect(await inMarket('BHD', () => post(o2, 0.0004, 'credit', 'a'))).toEqual({ credited: false, balance: null });
    expect(await wallet(o2)).toBeNull();
  });
});
