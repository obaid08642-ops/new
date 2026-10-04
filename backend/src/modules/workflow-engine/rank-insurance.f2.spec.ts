// F2: provider matching decides "accepts the patient's insurer" from what the
// provider saved (accepted_insurance), not from insurance_contracts (no real
// write path) or a network/class the app never sends.
import { WorkflowEngineService } from './workflow-engine.module';

const base = { type: 'doctor', status: 'active', name_ar: 'د', rating: 5 };
const rows = [
  { ...base, id: 'accepts', user_id: 'u1', accepted_insurance: ['bupa'] },
  { ...base, id: 'contract-only', user_id: 'u2', accepted_insurance: [], insurance_contracts: [{ company_id: 'bupa', network_id: 'gold', covered_classes: [] }] },
];

function model() {
  return { find: () => { const chain = { sort: () => chain, limit: () => chain, lean: async () => rows.map((r) => ({ ...r })) }; return chain; } };
}

describe('provider matching uses accepted_insurance (F2)', () => {
  const svc = new WorkflowEngineService({} as never, {} as never, {} as never, model() as never, {} as never, { emit: jest.fn() } as never);

  it('matches the provider that accepts the company, not one with only a stored contract', async () => {
    const out: any[] = await svc.rankProviders({ kind: 'consultation', insurance_company: 'bupa' });
    expect(out.map((p) => p.id)).toEqual(['accepts']);
  });

  it('"accepts insurance" means the provider lists at least one insurer', async () => {
    const out: any[] = await svc.rankProviders({ kind: 'consultation', accepts_insurance: true });
    expect(out.map((p) => p.id)).toEqual(['accepts']);
  });
});
