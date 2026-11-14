import { ProviderOpsService } from './provider-ops.module';
import { EARNING_KEY_FILTER, EARNING_KEY_INDEX, countEarningDuplicates, ensureEarningUniqueIndex } from '../finance-engine/earning-key';

// The race on "already credited": the read passes twice, the unique index refuses the second insert, and that refusal is "already credited".
function world(opts: { duplicates?: Array<{ n: number }>; insertError?: any; existing?: any } = {}) {
  const ledger = {
    findOne: jest.fn().mockResolvedValueOnce(null).mockResolvedValue(opts.existing ?? { id: 'earn_first', ref_type: 'appointment', ref_id: 'a1' }),
    insertOne: jest.fn(async () => { if (opts.insertError) throw opts.insertError; return {}; }),
    aggregate: jest.fn(() => ({ toArray: async () => opts.duplicates ?? [] })),
    createIndex: jest.fn().mockResolvedValue('ok'),
  };
  const promos = { updateOne: jest.fn().mockResolvedValue({ matchedCount: 1, modifiedCount: 1 }) };
  const conn: any = { collection: jest.fn((n: string) => (n === 'platformledgerentries' ? ledger : n === 'finance_config' ? { findOne: jest.fn().mockResolvedValue(null) } : promos)) };
  const svc = new ProviderOpsService(conn);
  jest.spyOn(svc, 'commissionFor').mockResolvedValue({ percent: 10, source: 'rule' });
  return { svc, ledger, promos };
}
const dup = Object.assign(new Error('E11000 duplicate key'), { code: 11000 });

describe('creditEarning: a parallel duplicate is "already credited"', () => {
  it('a first credit inserts once, after the unique index was ensured', async () => {
    const { svc, ledger } = world();
    const row = await svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1');
    expect(ledger.createIndex).toHaveBeenCalledWith({ ref_type: 1, ref_id: 1 }, { unique: true, name: EARNING_KEY_INDEX, partialFilterExpression: EARNING_KEY_FILTER });
    expect(ledger.insertOne).toHaveBeenCalledTimes(1);
    expect(row).toMatchObject({ amount: 88.5, commission: 10, vat: 1.5, ref_id: 'a1' });
  });

  it('the loser of the race gets the first row back and no error', async () => {
    const { svc, ledger } = world({ insertError: dup });
    const row = await svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1');
    expect(row).toMatchObject({ id: 'earn_first' });
    expect(ledger.insertOne).toHaveBeenCalledTimes(1);
  });

  it('an order the loser claimed on a limited promotion is given back, once', async () => {
    const { svc, promos } = world({ insertError: dup });
    (svc.commissionFor as jest.Mock).mockResolvedValue({ percent: 5, source: 'promo', promo_id: 'promo-1' });
    await svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1');
    const incs = promos.updateOne.mock.calls.map((c: any[]) => c[1].$inc.used_orders);
    expect(incs).toEqual([1, -1]);                                        // claimed, then released
    expect(promos.updateOne.mock.calls[1][0]).toMatchObject({ id: 'promo-1', used_orders: { $gt: 0 } });
  });

  it('any other insert error is still thrown', async () => {
    const { svc } = world({ insertError: new Error('disk full') });
    await expect(svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1')).rejects.toThrow('disk full');
  });

  it('with duplicates already in the ledger the index is not built (and nothing breaks)', async () => {
    const { svc, ledger } = world({ duplicates: [{ n: 2 }, { n: 3 }] });
    const warn = jest.spyOn((svc as any).logger, 'warn').mockImplementation(() => undefined);
    await svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1');
    expect(ledger.createIndex).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('2 provider_earning (ref_type, ref_id) pairs have 3 extra rows'));
    expect(ledger.insertOne).toHaveBeenCalledTimes(1);
  });

  it('the index is ensured once per process, not on every credit', async () => {
    const { svc, ledger } = world();
    await svc.creditEarning('prov-1', 'doctor', 100, 'appointment', 'a1');
    await svc.creditEarning('prov-1', 'doctor', 50, 'appointment', 'a2');
    expect(ledger.createIndex).toHaveBeenCalledTimes(1);
  });
});

describe('earning-key helpers', () => {
  it('counts groups and extra rows only', async () => {
    const db: any = { collection: () => ({ aggregate: () => ({ toArray: async () => [{ n: 2 }, { n: 4 }] }) }) };
    expect(await countEarningDuplicates(db)).toEqual({ groups: 2, extra_rows: 4 });
  });

  it('a failed index build is reported, never thrown', async () => {
    const db: any = { collection: () => ({ aggregate: () => ({ toArray: async () => [] }), createIndex: jest.fn().mockRejectedValue(new Error('too big')) }) };
    const warn = jest.fn();
    expect(await ensureEarningUniqueIndex(db, warn)).toBe('failed');
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('could not be built'));
  });

  it('when the earning index already exists the gate answers "present" and does not run the duplicate scan', async () => {
    const aggregate = jest.fn(() => ({ toArray: async () => [{ n: 2 }] }));
    const db: any = { collection: () => ({ listIndexes: () => ({ toArray: async () => [{ name: EARNING_KEY_INDEX }] }), aggregate, createIndex: jest.fn() }) };
    expect(await ensureEarningUniqueIndex(db)).toBe('present');
    expect(aggregate).not.toHaveBeenCalled();
  });
});

