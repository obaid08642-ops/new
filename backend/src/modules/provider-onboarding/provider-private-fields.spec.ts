import { ProviderOnboardingService } from './provider-onboarding.module';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { PROVIDER_PRIVATE_FIELDS } from './provider-private-fields';

/**
 * Q93: GET /search/providers (public) and POST /workflow/match (any signed-in
 * user) returned provider IBAN, bank account name and commission terms.
 * The fake model applies Mongo projections (inclusion and exclusion) the way Mongo does.
 */
const stored = {
  id: 'prov-1', user_id: 'u-1', type: 'doctor', status: 'active', name_ar: 'د. اختبار', specialty: 'cardiology',
  rating: 5, iban: 'SA0380000000608010167519', bank_account_name: 'Synthetic Bank Acct', national_id: '1000000001',
  tax_number: '300000000000003', signature_url: 'https://r2/sig.png', commission_rate: 10,
  commission_cash_pct: 12, commission_insurance_pct: 8, license_documents: ['doc'],
};

function fakeModel() {
  return {
    find: (_filter: unknown, projection?: Record<string, 0 | 1>) => {
      let doc: Record<string, unknown> = { ...stored };
      const entries = Object.entries(projection || {});
      // Like Mongo: any 1 means "only these fields"; 0 drops a field.
      if (entries.some(([, v]) => v === 1)) doc = Object.fromEntries(Object.entries(doc).filter(([k]) => projection![k] === 1));
      for (const [k, v] of entries) if (v === 0) delete doc[k];
      const chain = { sort: () => chain, limit: () => chain, lean: async () => [doc] };
      return chain;
    },
  };
}

describe('provider listings never expose private provider fields (Q93)', () => {
  it('unifiedSearch (GET /search/providers) drops bank, identity and commission fields', async () => {
    const svc = new ProviderOnboardingService({} as any, fakeModel() as any, {} as any, {} as any);
    const [row]: any[] = await svc.unifiedSearch({ type: 'doctor' as any });
    expect(row.id).toBe('prov-1');
    for (const f of PROVIDER_PRIVATE_FIELDS) expect(row).not.toHaveProperty(f);
    expect(row).not.toHaveProperty('license_documents');
  });

  it('rankProviders (POST /workflow/match) drops the same fields', async () => {
    const svc = new WorkflowEngineService({} as any, {} as any, {} as any, fakeModel() as any, {} as any, { emit: jest.fn() } as any);
    const rows: any[] = await svc.rankProviders({ kind: 'consultation' } as any);
    expect(rows.length).toBe(1);
    expect(rows[0].id).toBe('prov-1');
    for (const f of PROVIDER_PRIVATE_FIELDS) expect(rows[0]).not.toHaveProperty(f);
  });
});
