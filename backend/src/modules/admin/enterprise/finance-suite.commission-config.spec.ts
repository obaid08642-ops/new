/** Saving a service percent in the finance suite is the one service-default setter: it supersedes the service-scope rules it would otherwise hide. */
import { FinanceSuiteService } from './finance-suite.service';

const build = () => {
  const calls: Array<{ coll: string; op: string; args: any[] }> = [];
  const conn: any = {
    collection: (coll: string) => new Proxy({}, {
      get: (_t, op: string) => async (...args: any[]) => {
        calls.push({ coll, op, args });
        if (coll === 'finance_config' && op === 'findOne') return { key: 'commissions', service_types: { doctor: { percent: 15 } }, tax: { vat_percent: 15 } };
        return { modifiedCount: 1 };
      },
    }),
  };
  return { svc: new (FinanceSuiteService as any)(conn, { write: jest.fn(async () => undefined) }), calls };
};
const admin = { id: 'a1' };

describe('upsertCommissionConfig', () => {
  it('supersedes the active service-scope rules of the types it sets, and only those', async () => {
    const { svc, calls } = build();
    await svc.upsertCommissionConfig({ percents: { doctor: 12 } }, admin, 'owner changed the doctor rate');
    const update = calls.find((c) => c.coll === 'commissionrules' && c.op === 'updateMany');
    expect(update?.args[0]).toMatchObject({ scope: 'service', active: { $ne: false }, $or: [{ service_type: { $in: ['doctor'] } }, { scope_id: { $in: ['doctor'] } }] });
    expect(update?.args[1].$set).toMatchObject({ active: false, superseded_by: 'finance_config_update' });
    expect(calls.find((c) => c.coll === 'finance_config' && c.op === 'updateOne')?.args[1].$set['service_types.doctor.percent']).toBe(12);
  });

  it('a change of VAT alone leaves the service rules alone', async () => {
    const { svc, calls } = build();
    await svc.upsertCommissionConfig({ vat_percent: 15 }, admin, 'confirming the vat percent');
    expect(calls.find((c) => c.coll === 'commissionrules')).toBeUndefined();
  });
});
