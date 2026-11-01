import { LegalEnterpriseService } from './legal-enterprise.service';

/** The provider statement is what the settlement wrote: the ledger's earnings, with each one's own percent, commission and VAT on the commission. */
function service(earnings: any[], transfers: any[] = []) {
  const col = {
    find: (q: any) => ({ sort: () => ({ limit: () => ({ toArray: async () => (q.type === 'provider_earning' ? earnings : transfers) }) }) }),
  };
  return new LegalEnterpriseService({ collection: () => col } as any);
}
const earn = (ref: string, percent: number, source: string, commission: number, vat: number, amount: number) => ({ ref_id: ref, ref_type: 'appointment', createdAt: new Date('2026-11-01'), gross: 200, commission_percent: percent, commission_source: source, commission, vat, amount, state: 'pending' });

describe('provider statement', () => {
  it('lists each earning with the percent the settlement charged (an override or a promotion included), VAT on the commission only', async () => {
    const svc = service([earn('a3', 8, 'provider_profile', 16, 2.4, 181.6), earn('a2', 0, 'provider_promo', 0, 0, 200), earn('a1', 0, 'provider_promo', 0, 0, 200)]);
    const d = await svc.settlementData('p1');
    expect(d.rows.map((r: any) => [r.order_id, r.commission_percent, r.commission_source, r.commission, r.vat_on_commission, r.net_provider])).toEqual([
      ['a3', 8, 'provider_profile', 16, 2.4, 181.6], ['a2', 0, 'provider_promo', 0, 0, 200], ['a1', 0, 'provider_promo', 0, 0, 200]]);
    expect(d.totals).toEqual({ total: 600, commission: 16, vat: 2.4, net: 581.6 }); // VAT is 15% of the 16 commission, none on the 600
  });
  it('a provider with no earnings has an empty statement', async () => {
    expect((await service([]).settlementData('p1')).rows).toEqual([]);
  });
  it('the date range applies to the earnings and to the transfers', async () => {
    const seen: any[] = [];
    const col = { find: (q: any) => { seen.push(q); return { sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }; } };
    await new LegalEnterpriseService({ collection: () => col } as any).settlementData('p1', '2026-11-01', '2026-11-30');
    expect(seen.every((q) => q.createdAt?.$gte && q.createdAt?.$lte)).toBe(true);
  });
});
