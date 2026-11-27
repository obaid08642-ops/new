/** Money step M5b: a platform ledger row carries its own currency and `_minor`; SAR rows keep exactly the halala lines they had. Real MongoDB. */
import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { LedgerService } from './finance-engine.module';
import { runWithMarketContext } from '../markets/market-context';

jest.setTimeout(120_000);
const inMarket = <T>(currency: string, fn: () => T) => runWithMarketContext({ currency } as any, fn);

describe('LedgerService.append by currency', () => {
  let mongo: MongoMemoryServer; let conn: Connection; let svc: LedgerService;
  const row = (id: string) => conn.collection('platformledgerentries').findOne({ id } as any) as Promise<any>;

  beforeAll(async () => {
    mongo = await MongoMemoryServer.create({ instance: { launchTimeout: 120_000 } });
    conn = await mongoose.createConnection(mongo.getUri(), { dbName: 'lc' }).asPromise();
    svc = new LedgerService(conn as any);
  });
  afterAll(async () => { await conn?.close(); await mongo?.stop(); });

  it('SAR (no market): the same halala lines as before, plus _minor (same value) and currency', async () => {
    const d: any = await svc.append({ type: 'provider_earning', amount: 85.5, gross: 100, commission: 12, vat: 2.5, ref_type: 'order', ref_id: 'o1', order_id: 'o1' });
    const r = await row(d.id);
    expect(r.amount).toBe(85.5);
    expect([r.amount_halalas, r.gross_halalas, r.commission_halalas, r.vat_halalas]).toEqual([8550, 10000, 1200, 250]);
    expect([r.amount_minor, r.gross_minor, r.commission_minor, r.vat_minor]).toEqual([8550, 10000, 1200, 250]);
    expect(r.currency).toBe('SAR');
  });

  it('a row appended inside a BHD market is BHD: 3 digits are kept, fils in _minor, no halalas', async () => {
    const d: any = await inMarket('BHD', () => svc.append({ type: 'provider_earning', amount: 12.345, gross: 15, commission: 1.5, vat: 1.155, ref_type: 'order', ref_id: 'o2', order_id: 'o2' }));
    const r = await row(d.id);
    expect(r.amount).toBe(12.345);                         // not rounded to 12.35
    expect([r.amount_minor, r.gross_minor, r.commission_minor, r.vat_minor]).toEqual([12345, 15000, 1500, 1155]);
    expect(r.currency).toBe('BHD');
    expect(Object.keys(r).filter((k) => k.endsWith('_halalas'))).toEqual([]);
  });

  it('an explicit currency wins over the market, and is frozen on the row', async () => {
    const d: any = await inMarket('SAR', () => svc.append({ type: 'refund', amount: 1.234, currency: 'BHD', ref_type: 'refund', ref_id: 'rf1', order_id: 'o3' }));
    const r = await row(d.id);
    expect(r.currency).toBe('BHD'); expect(r.amount_minor).toBe(1234); expect(r.amount_halalas).toBeUndefined();
  });

  it('SAR amounts are still rounded exactly as before (1.005 becomes 1.01)', async () => {
    const d: any = await svc.append({ type: 'refund', amount: 1.005, ref_type: 'refund', ref_id: 'rf2', order_id: 'o4' });
    const r = await row(d.id);
    expect(r.amount).toBe(1.01); expect(r.amount_halalas).toBe(101); expect(r.amount_minor).toBe(101);
  });
});
