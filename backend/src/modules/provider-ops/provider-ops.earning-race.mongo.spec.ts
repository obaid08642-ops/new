import mongoose, { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { ProviderOpsService } from './provider-ops.module';
import { EARNING_KEY_INDEX, countEarningDuplicates, earningIndexPresent } from '../finance-engine/earning-key';

/** Two parallel service.completed events for one booking, against a real MongoDB: one earning row, both calls answer with it. */
jest.setTimeout(120_000);
describe('creditEarning against a real MongoDB: parallel credits of one booking', () => {
  let mongod: MongoMemoryServer; let conn: Connection;
  const ledger = () => conn.collection('platformledgerentries');
  const service = () => {
    const svc = new ProviderOpsService(conn);
    jest.spyOn(svc, 'commissionFor').mockResolvedValue({ percent: 10, source: 'rule' });
    return svc;
  };
  beforeAll(async () => { mongod = await MongoMemoryServer.create(); conn = await mongoose.createConnection(mongod.getUri()).asPromise(); });
  afterAll(async () => { await conn.close(); await mongod.stop(); });
  beforeEach(async () => { await ledger().deleteMany({}); try { await ledger().dropIndex(EARNING_KEY_INDEX); } catch { /* none yet */ } });

  it('ten parallel credits of the same booking leave exactly one earning row', async () => {
    const svc = service();
    const rows = await Promise.all(Array.from({ length: 10 }, () => svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'appt-race')));
    expect(await ledger().countDocuments({ type: 'provider_earning', ref_type: 'appointment', ref_id: 'appt-race' })).toBe(1);
    expect(new Set(rows.map((r: any) => r.id)).size).toBe(1);
    expect(await earningIndexPresent(conn)).toBe(true);
  });

  it('different bookings are all credited', async () => {
    const svc = service();
    await Promise.all(['a', 'b', 'c'].map((id) => svc.creditEarning('prov-1', 'doctor', 100, 'appointment', `appt-${id}`)));
    expect(await ledger().countDocuments({ type: 'provider_earning' })).toBe(3);
  });

  it('rows of other types or without a string ref are outside the index', async () => {
    await ledger().insertMany([
      { type: 'provider_earning', provider_account_id: 'p', amount: 1 },                       // legacy: no ref
      { type: 'provider_earning', provider_account_id: 'p', amount: 1 },
      { type: 'provider_debit', ref_type: 'refund', ref_id: 'r1', amount: 1 },
      { type: 'provider_debit', ref_type: 'refund', ref_id: 'r1', amount: 1 },
    ]);
    await service().creditEarning('prov-1', 'doctor', 100, 'appointment', 'appt-x');
    expect(await earningIndexPresent(conn)).toBe(true);
    expect(await ledger().countDocuments({})).toBe(5);
  });

  it('with a duplicate already in the ledger the index is not built, and credits still work', async () => {
    await ledger().insertMany([
      { type: 'provider_earning', ref_type: 'appointment', ref_id: 'dup', amount: 1 },
      { type: 'provider_earning', ref_type: 'appointment', ref_id: 'dup', amount: 1 },
    ]);
    expect(await countEarningDuplicates(conn)).toEqual({ groups: 1, extra_rows: 1 });
    await service().creditEarning('prov-1', 'doctor', 100, 'appointment', 'appt-y');
    expect(await earningIndexPresent(conn)).toBe(false);
    expect(await ledger().countDocuments({ ref_id: 'appt-y' })).toBe(1);
  });
});
