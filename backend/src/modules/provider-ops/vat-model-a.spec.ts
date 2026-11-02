import { LegalEnterpriseService } from '../legal/legal-enterprise.service';
import { ProviderOpsService } from './provider-ops.module';

/**
 * VAT model A (owner, 2026-11-01): the provider supplies the service; the platform's VAT is only on its commission (the platform →
 * provider commission invoice) and on the delivery fee. The settlement and the provider statement take VAT on the commission and on
 * nothing else: the service price carries no platform VAT.
 */
const config = { service_types: { doctor: { percent: 15 }, pharmacy: { percent: 10 } }, tax: { vat_percent: 15 } };

describe('the settlement takes VAT on the commission only', () => {
  function earning() {
    const inserted: any[] = [];
    const cols: Record<string, any> = {
      platformledgerentries: { findOne: async () => null, insertOne: async (d: any) => { inserted.push(d); } },
      finance_config: { findOne: async () => config },
      commissionrules: { findOne: async () => null },
      provider_profiles: { findOne: async () => null },
      provider_commission_promos: { find: () => ({ sort: () => ({ toArray: async () => [] }) }) },
    };
    return { service: new ProviderOpsService({ collection: (n: string) => cols[n] } as any), inserted };
  }
  it('a 200 SAR consultation: commission 30, VAT 4.50 (15% of the 30), the provider is paid 165.50; no VAT on the 200', async () => {
    const { service, inserted } = earning();
    await service.creditEarning('p1', 'doctor', 200, 'appointment', 'a1');
    expect(inserted[0]).toMatchObject({ gross: 200, commission: 30, vat: 4.5, amount: 165.5 });
  });
});

describe('the provider statement', () => {
  it('shows VAT on the commission, not on the order total', async () => {
    const orders = [{ id: 'o1', total: 200, createdAt: new Date('2026-11-01'), state: 'completed' }];
    const cols: Record<string, any> = {
      orders: { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => orders }) }) }) },
      platformledgerentries: { find: () => ({ sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }) },
      finance_config: { findOne: async () => config },
    };
    const svc = new LegalEnterpriseService({ collection: (n: string) => cols[n] } as any);
    const data = await svc.settlementData('p1');
    expect(data.rows[0]).toMatchObject({ total: 200, commission: 20, vat_on_commission: 3, net_provider: 177 });
    expect(data.totals).toMatchObject({ total: 200, commission: 20, vat: 3, net: 177 });
  });
});
