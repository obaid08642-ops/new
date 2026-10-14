import { LegalService } from './legal.module';

// D-38: GET /legal/pending lists only the policies that apply to the caller.
const POLICIES = [
  { key: 'patient_terms', requires_acceptance: true, applies_to: ['patient'] },
  { key: 'privacy_policy', requires_acceptance: true, applies_to: ['all'] },
  { key: 'provider_agreement', requires_acceptance: true, applies_to: ['provider'] },
  { key: 'telehealth_consent', requires_acceptance: true, applies_to: ['patient'] },
  { key: 'refund_policy', requires_acceptance: false, applies_to: ['all'] },
];

function serviceFor() {
  const service: any = Object.create(LegalService.prototype);
  service.conn = {
    collection: jest.fn((name: string) => {
      if (name === 'legal_policies') {
        return {
          find: jest.fn().mockImplementation((q: any) => ({
            toArray: jest.fn().mockResolvedValue(
              POLICIES.filter((p) => (q?.requires_acceptance === true ? p.requires_acceptance : true)),
            ),
          })),
        };
      }
      return { find: jest.fn().mockReturnValue({ toArray: jest.fn().mockResolvedValue([]) }) };
    }),
  };
  return service as LegalService;
}

describe('D-38 legal pending is side-aware', () => {
  it('a patient is asked only for the patient and shared texts', async () => {
    const rows: any[] = await serviceFor().pendingAcceptances({ id: 'pat-1', role: 'patient' });
    expect(rows.map((p: any) => p.key).sort()).toEqual(['patient_terms', 'privacy_policy', 'telehealth_consent']);
  });

  it('a provider is asked only for the provider and shared texts', async () => {
    const rows: any[] = await serviceFor().pendingAcceptances({ id: 'prov-ph', role: 'provider', provider_type: 'pharmacy' });
    expect(rows.map((p: any) => p.key).sort()).toEqual(['privacy_policy', 'provider_agreement']);
  });
});
