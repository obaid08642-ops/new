import { CommissionResolver } from '../finance-engine/finance-engine.module';
import { ProviderOpsService } from './provider-ops.module';
import { promoBoundary } from '../../common/commission-promo';

/** A small in-memory database: just what CommissionResolver and creditEarning read and write. */
function world(w: { config?: any; rules?: any[]; profile?: any; promos?: any[] } = {}) {
  const promos: any[] = (w.promos ?? []).map((p) => ({ active: true, used_orders: 0, max_orders: null, starts_at: null, ends_at: null, createdAt: new Date('2026-01-01'), ...p }));
  const ledger: any[] = [];
  const cols: Record<string, any> = {
    finance_config: { findOne: async () => w.config ?? null },
    commissionrules: { findOne: async (q: any) => (w.rules ?? []).find((r) => r.scope === q.scope && (q.scope_id === undefined || r.scope_id === q.scope_id) && (q.scope !== 'service' || r.scope_id === 'doctor' || r.service_type === 'doctor')) ?? null },
    provider_profiles: { findOne: async () => w.profile ?? null },
    provider_commission_promos: {
      find: (q: any) => ({ sort: () => ({ toArray: async () => promos.filter((p) => p.active !== false && p.provider_account_id === q.provider_account_id).slice().reverse() }) }),
      // atomic claim: the count is checked and incremented in one step, as the database does it
      updateOne: async (q: any, u: any) => {
        const p = promos.find((x) => x.id === q.id);
        if (!p || p.active === false || (p.max_orders != null && p.used_orders >= p.max_orders)) return { matchedCount: 0, modifiedCount: 0 };
        p.used_orders += u.$inc.used_orders; return { matchedCount: 1, modifiedCount: 1 };
      },
    },
    platformledgerentries: { findOne: async (q: any) => ledger.find((r) => r.ref_id === q.ref_id) ?? null, insertOne: async (r: any) => { ledger.push(r); } },
  };
  const conn: any = { collection: (n: string) => cols[n] };
  return { conn, promos, ledger };
}
const config = { service_types: { doctor: { percent: 15 } }, tax: { vat_percent: 15 } };
const D = (iso: string) => new Date(iso);

describe('CommissionResolver: provider override → type default → system default, with a promotion on top', () => {
  it('no override: the type default from finance_config; no config: the one system default', async () => {
    expect(await new CommissionResolver(world({ config }).conn).resolve('doctor', { providerId: 'p1' })).toMatchObject({ percent: 15, source: 'finance_config' });
    expect(await new CommissionResolver(world().conn).resolve('doctor', { providerId: 'p1' })).toMatchObject({ percent: 10, source: 'system_default' });
  });
  it('the percent the admin set on the provider beats the type default, cash and insured apart', async () => {
    const w = world({ config, profile: { commission_cash_pct: 8, commission_insurance_pct: 12 } });
    const r = new CommissionResolver(w.conn);
    expect(await r.resolve('doctor', { providerId: 'p1', paymentMethod: 'cash' })).toMatchObject({ percent: 8, source: 'provider_profile' });
    expect(await r.resolve('doctor', { providerId: 'p1', paymentMethod: 'insurance' })).toMatchObject({ percent: 12, source: 'provider_profile' });
  });
  it('an override of 0 is an override, not "unset"', async () => {
    const r = new CommissionResolver(world({ config, profile: { commission_cash_pct: 0 } }).conn);
    expect(await r.resolve('doctor', { providerId: 'p1', paymentMethod: 'cash' })).toMatchObject({ percent: 0, source: 'provider_profile' });
  });
  it('a provider rule beats the profile percent; a promotion beats both', async () => {
    const rules = [{ scope: 'provider', scope_id: 'p1', percent: 7, id: 'r1' }];
    const w = world({ config, rules, profile: { commission_cash_pct: 8 }, promos: [{ id: 'promo1', provider_account_id: 'p1', percent: 3, ends_at: D('2027-01-01') }] });
    const r = new CommissionResolver(w.conn);
    expect(await r.resolve('doctor', { providerId: 'p1' })).toMatchObject({ percent: 3, source: 'provider_promo', promo_id: 'promo1' });
    expect(await new CommissionResolver(world({ config, rules, profile: { commission_cash_pct: 8 } }).conn).resolve('doctor', { providerId: 'p1' })).toMatchObject({ percent: 7, source: 'provider_override' });
  });
});

describe('a promotion between two dates', () => {
  const promos = [{ id: 'promo1', provider_account_id: 'p1', percent: 5, starts_at: promoBoundary('2026-11-10', 'start'), ends_at: promoBoundary('2026-11-20', 'end') }];
  const at = async (iso: string) => new CommissionResolver(world({ config, profile: { commission_cash_pct: 9 }, promos }).conn).resolve('doctor', { providerId: 'p1', now: D(iso) });
  it('the day before it: the provider\'s own commission', async () => expect(await at('2026-11-09T20:59:59.999Z')).toMatchObject({ percent: 9, source: 'provider_profile' }));
  it('the first instant of the first day: the promotion', async () => expect(await at('2026-11-09T21:00:00.000Z')).toMatchObject({ percent: 5, source: 'provider_promo' }));
  it('the last instant of the last day: still the promotion', async () => expect(await at('2026-11-20T20:59:59.999Z')).toMatchObject({ percent: 5, source: 'provider_promo' }));
  it('one millisecond later: back to the provider\'s own commission, with nothing edited', async () => expect(await at('2026-11-20T21:00:00.000Z')).toMatchObject({ percent: 9, source: 'provider_profile' }));
  it('only that provider', async () => {
    const w = world({ config, promos });
    expect(await new CommissionResolver(w.conn).resolve('doctor', { providerId: 'someone-else', now: D('2026-11-15') })).toMatchObject({ source: 'finance_config' });
  });
});

describe('a promotion of 0% (no commission)', () => {
  it('resolves to 0, not to the default', async () => {
    const w = world({ config, promos: [{ id: 'free', provider_account_id: 'p1', percent: 0, ends_at: D('2027-01-01') }] });
    expect(await new CommissionResolver(w.conn).resolve('doctor', { providerId: 'p1', now: D('2026-11-15') })).toMatchObject({ percent: 0, source: 'provider_promo' });
  });
});

describe('a promotion for the first N completed orders', () => {
  it('claims at most N orders, even when completions arrive together', async () => {
    const w = world({ config, promos: [{ id: 'first3', provider_account_id: 'p1', percent: 0, max_orders: 3 }] });
    const r = new CommissionResolver(w.conn);
    const results = await Promise.all(Array.from({ length: 6 }, () => r.claimPromoOrder('first3')));
    expect(results.filter(Boolean)).toHaveLength(3);
    expect(w.promos[0].used_orders).toBe(3);
    expect(await r.resolve('doctor', { providerId: 'p1' })).toMatchObject({ percent: 15, source: 'finance_config' }); // exhausted: normal commission
  });
});

describe('creditEarning uses the promotion and falls back by itself', () => {
  async function earn(w: ReturnType<typeof world>, ref: string) {
    const svc = new ProviderOpsService(w.conn);
    return svc.creditEarning('p1', 'doctor', 200, 'appointment', ref);
  }
  it('0% promo: the provider gets the gross, the row names the promo', async () => {
    const w = world({ config, promos: [{ id: 'free', provider_account_id: 'p1', percent: 0, ends_at: D('2099-01-01') }] });
    const row = await earn(w, 'a1');
    expect(row).toMatchObject({ commission_percent: 0, commission: 0, vat: 0, amount: 200, gross: 200, commission_source: 'provider_promo', promo_id: 'free' });
  });
  it('first 2 orders at 5%, the 3rd and the 4th at the normal 15% (+15% VAT on the commission)', async () => {
    const w = world({ config, promos: [{ id: 'first2', provider_account_id: 'p1', percent: 5, max_orders: 2 }] });
    const rows = [];
    for (const ref of ['a1', 'a2', 'a3', 'a4']) rows.push(await earn(w, ref));
    expect(rows.map((r: any) => [r.commission_percent, r.commission_source])).toEqual([[5, 'provider_promo'], [5, 'provider_promo'], [15, 'finance_config'], [15, 'finance_config']]);
    expect(rows[0]).toMatchObject({ commission: 10, vat: 1.5, amount: 188.5 });
    expect(rows[2]).toMatchObject({ commission: 30, vat: 4.5, amount: 165.5 });
    expect(rows[2].promo_id).toBeUndefined();
    expect(w.promos[0].used_orders).toBe(2);
  });
  it('a repeated completion of the same order is not counted twice', async () => {
    const w = world({ config, promos: [{ id: 'first2', provider_account_id: 'p1', percent: 5, max_orders: 2 }] });
    await earn(w, 'a1'); await earn(w, 'a1');
    expect(w.promos[0].used_orders).toBe(1);
  });
  it('no promo: the provider\'s own commission drives the settlement (the admin field is not ignored)', async () => {
    const w = world({ config, profile: { commission_cash_pct: 8 } });
    expect(await earn(w, 'a1')).toMatchObject({ commission_percent: 8, commission_source: 'provider_profile', commission: 16 });
  });
});
