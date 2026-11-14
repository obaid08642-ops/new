import { registerAuditSink } from '../../../common/audit-record';
import { ProviderCommissionService } from './provider-commission.service';

function world(profile: any = { account_id: 'p1', type: 'doctor' }) {
  const profiles: any[] = profile ? [{ ...profile }] : [];
  const promos: any[] = [];
  const cols: Record<string, any> = {
    finance_config: { findOne: async () => ({ service_types: { doctor: { percent: 15 } } }) },
    commissionrules: { findOne: async () => null },
    provider_profiles: {
      findOne: async () => (profiles[0] ? { ...profiles[0] } : null),
      updateOne: async (_q: any, u: any) => { if (u.$set) Object.assign(profiles[0], u.$set); if (u.$unset) for (const k of Object.keys(u.$unset)) delete profiles[0][k]; return { matchedCount: 1 }; },
    },
    provider_commission_promos: {
      find: (q: any) => ({ sort: () => ({ limit: () => ({ toArray: async () => promos.filter((p) => p.provider_account_id === q.provider_account_id).slice().reverse() }), toArray: async () => promos.filter((p) => p.provider_account_id === q.provider_account_id && p.active !== false).slice().reverse() }) }),
      updateMany: async (_q: any, u: any) => { let n = 0; for (const p of promos) if (p.active !== false) { Object.assign(p, u.$set); n++; } return { modifiedCount: n }; },
      insertOne: async (d: any) => { promos.push(d); },
    },
  };
  const svc = new ProviderCommissionService({ collection: (n: string) => cols[n] } as any);
  return { svc, profiles, promos };
}
const admin = { id: 'admin-1', role: 'admin' };
const reason = 'owner decision: early providers';
let audit: any[];
beforeEach(() => { audit = []; registerAuditSink(async (e) => { audit.push(e); }); });
afterAll(() => registerAuditSink(null));

describe('the admin sets a provider\'s commission', () => {
  it('one figure sets cash and insured visits; the settlement reads it; the change is audited with its reason', async () => {
    const w = world();
    const v = await w.svc.setOverride(admin, 'p1', { cash: 9, reason });
    expect(w.profiles[0]).toMatchObject({ commission_cash_pct: 9, commission_insurance_pct: 9 });
    expect(v.effective).toEqual({ cash: { percent: 9, source: 'provider_profile' }, insurance: { percent: 9, source: 'provider_profile' } });
    expect(audit).toEqual([expect.objectContaining({ action: 'provider_commission_override_set', user_id: 'admin-1', reason, changes: { before: { cash: null, insurance: null }, after: { cash: 9, insurance: 9 } } })]);
  });
  it('cash and insurance apart; 0 is allowed', async () => {
    const w = world();
    await w.svc.setOverride(admin, 'p1', { cash: 0, insurance: 4, reason });
    expect(w.profiles[0]).toMatchObject({ commission_cash_pct: 0, commission_insurance_pct: 4 });
  });
  it('needs a reason of at least ten characters and a percent in 0..100', async () => {
    const w = world();
    await expect(w.svc.setOverride(admin, 'p1', { cash: 9, reason: 'x' })).rejects.toThrow('reason_too_short');
    await expect(w.svc.setOverride(admin, 'p1', { cash: 9, reason: undefined })).rejects.toThrow('reason_required');
    await expect(w.svc.setOverride(admin, 'p1', { cash: 101, reason })).rejects.toThrow('percent_out_of_range');
    await expect(w.svc.setOverride(admin, 'p1', { reason })).rejects.toThrow('nothing_to_update');
    expect(audit).toHaveLength(0);
  });
  it('an unknown provider is a 404; clearing the override brings the type default back', async () => {
    await expect(world(null).svc.setOverride(admin, 'nope', { cash: 9, reason })).rejects.toThrow('provider_not_found');
    const w = world();
    await w.svc.setOverride(admin, 'p1', { cash: 9, reason });
    const v = await w.svc.clearOverride(admin, 'p1', reason);
    expect(v.effective.cash).toEqual({ percent: 15, source: 'finance_config' });
    expect(audit.map((a) => a.action)).toEqual(['provider_commission_override_set', 'provider_commission_override_cleared']);
  });
});

describe('the admin sets and sees a promotion', () => {
  it('shows it as active with its percent, dates and orders left; the effective commission is the promo\'s', async () => {
    const w = world();
    const v = await w.svc.setPromo(admin, 'p1', { percent: 0, ends_at: '2099-12-31', max_orders: 50, reason });
    expect(v.promos[0]).toMatchObject({ percent: 0, state: 'active', max_orders: 50, used_orders: 0, orders_left: 50 });
    expect(v.effective.cash).toEqual({ percent: 0, source: 'provider_promo' });
    expect(audit[0]).toMatchObject({ action: 'provider_commission_promo_set', reason });
  });
  it('a promo in the future is scheduled and changes nothing yet; a new promo replaces the running one', async () => {
    const w = world();
    const v = await w.svc.setPromo(admin, 'p1', { percent: 5, starts_at: '2099-01-01', ends_at: '2099-02-01', reason });
    expect(v.promos[0].state).toBe('scheduled');
    expect(v.effective.cash.source).toBe('finance_config');
    await w.svc.setPromo(admin, 'p1', { percent: 2, max_orders: 10, reason });
    expect(w.promos.filter((p) => p.active !== false)).toHaveLength(1);
    expect(w.promos[0].active).toBe(false);
  });
  it('refuses a promo with no end, and cancelling brings the normal commission back', async () => {
    const w = world();
    await expect(w.svc.setPromo(admin, 'p1', { percent: 5, reason })).rejects.toThrow('promo_needs_an_end');
    await w.svc.setPromo(admin, 'p1', { percent: 5, max_orders: 3, reason });
    const v = await w.svc.cancelPromo(admin, 'p1', reason);
    expect(v.effective.cash.source).toBe('finance_config');
    expect(v.promos[0].state).toBe('cancelled');
  });
});
