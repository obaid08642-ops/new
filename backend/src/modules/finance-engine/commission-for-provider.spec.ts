/** One commission resolution for the ledger and the admin list: rule > the provider's own rate > service default > the one defaults table. */
import { CommissionResolver } from './finance-engine.module';
import { COMMISSION_SERVICE_BY_PROVIDER_TYPE, DEFAULT_COMMISSIONS } from '../../common/commission-defaults';
import { CommissionsController } from '../admin/governance/admin-governance.module';

const conn = (opts: { rules?: any[]; profile?: any; cfg?: any } = {}): any => ({
  collection: (name: string) => ({
    commissionrules: { findOne: async (q: any) => (opts.rules ?? []).find((r) => r.scope === q.scope && (!q.scope_id || r.scope_id === q.scope_id)) ?? null },
    provider_profiles: { findOne: async () => opts.profile ?? null },
    finance_config: { findOne: async () => opts.cfg ?? null },
  } as any)[name],
});

describe('CommissionResolver.forProvider', () => {
  it('with no config at all it uses the one defaults table, not a flat 10 (doctor 15, lab 12, pharmacy 10)', async () => {
    for (const [type, pct] of Object.entries(DEFAULT_COMMISSIONS.service_types)) {
      expect((await new CommissionResolver(conn()).forProvider(type, 'acc-1')).percent).toBe(pct.percent);
    }
  });
  it('the provider\'s own rate beats the service default, by payment method; a provider rule beats both', async () => {
    const profile = { commission_cash_pct: 8, commission_insurance_pct: 6 };
    const r = new CommissionResolver(conn({ profile }));
    expect(await r.forProvider('lab', 'acc-1', 'card')).toMatchObject({ percent: 8, source: 'provider_profile' });
    expect(await r.forProvider('lab', 'acc-1', 'insurance')).toMatchObject({ percent: 6, source: 'provider_profile' });
    const withRule = new CommissionResolver(conn({ profile, rules: [{ scope: 'provider', scope_id: 'acc-1', percent: 5, id: 'r1' }] }));
    expect(await withRule.forProvider('lab', 'acc-1', 'card')).toMatchObject({ percent: 5, source: 'provider_override' });
  });
  it('an unset profile rate never stands in for the service default (the old single rate is not read)', async () => {
    const r = new CommissionResolver(conn({ profile: { commission_rate: 10 }, cfg: { service_types: { doctor: { percent: 15 } } } }));
    expect(await r.forProvider('doctor', 'acc-1', 'card')).toMatchObject({ percent: 15, source: 'finance_config' });
  });
  it('every provider type maps to a service type that has a commission', () => {
    for (const service of Object.values(COMMISSION_SERVICE_BY_PROVIDER_TYPE)) expect(Object.keys(DEFAULT_COMMISSIONS.service_types)).toContain(service);
  });
});

describe('admin commissions list shows the rates the ledger applies', () => {
  it('a lab with its own cash rate and no insurance rate: 8 cash, the service default 12 for insurance', async () => {
    const empty = { find: () => ({ lean: async () => [] }) };
    const profiles = { find: () => ({ lean: async () => [{ account_id: 'acc-1', name_ar: 'مختبر', type: 'lab', commission_rate: 10, commission_cash_pct: 8 }] }) };
    const ctrl: any = new (CommissionsController as any)(profiles, empty, empty, empty, empty, empty, conn({ profile: { commission_cash_pct: 8 } }));
    const [row] = await ctrl.list();
    expect(row).toMatchObject({ commission_cash_pct: 8, commission_insurance_pct: 12, commission: 8 });
  });
});
