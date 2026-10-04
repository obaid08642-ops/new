import { InsuranceFlowService } from './insurance-engine.module';

/**
 * F2 — benefits-summary must return an ARRAY (the client does
 * `Array.isArray(res) ? res : []`). Returning myPolicy's object meant every
 * policy holder silently saw an empty list with a 200. Every number asserted
 * here comes from a record; nothing is invented.
 */
describe('InsuranceFlowService.benefitsSummary', () => {
  const svc = (policy: any, contracts: any[] = [], rules: any[] = [], claims: any[] = []) => {
    const col = (docs: any[], filter?: (q: any) => any[]) => ({
      find: jest.fn((q: any) => ({ toArray: jest.fn(async () => (filter ? filter(q) : docs)) })),
    });
    const service: any = Object.create(InsuranceFlowService.prototype);
    service.patients = {
      findOne: jest.fn(() => ({ lean: async () => ({ insurance: policy }) })),
      db: {
        collection: jest.fn((name: string) => {
          if (name === 'insurance_network_contracts') return col(contracts);
          if (name === 'insurance_coverage_rules') return col(rules);
          if (name === 'insurance_claims') {
            // Honor the status filter like Mongo would: only approved/reimbursed
            // claims count toward usage. A mock returning everything would hide
            // a missing filter in the implementation.
            return col(claims, (q: any) => {
              const allowed: string[] = q?.status?.$in || [];
              return claims.filter((c) => allowed.includes(c.status));
            });
          }
          return col([]);
        }),
      },
    };
    return service;
  };

  it('returns [] when there is no policy', async () => {
    const service = svc(null);
    await expect(service.benefitsSummary({ id: 'p1' })).resolves.toEqual([]);
  });

  it('returns [] when no coverage rules link to the company', async () => {
    const service = svc({ company_id: 'c1' }, [], [], []);
    await expect(service.benefitsSummary({ id: 'p1' })).resolves.toEqual([]);
  });

  it('returns one real entry per capped rule with usage summed from approved claims', async () => {
    const service = svc(
      { company_id: 'c1' },
      [{ network_id: 'n1' }],
      [
        { service_type: 'consultation', copay_percent: 20, max_annual_limit: 50000 },
        { service_type: 'lab', copay_percent: 0, max_annual_limit: 10000 },
        { service_type: 'pharmacy' }, // no cap → skipped, never fabricated
      ],
      [
        { service: 'consultation', covered: 1000, status: 'approved' },
        { service: 'consultation', covered: 500, status: 'reimbursed' },
        { service: 'consultation', covered: 9999, status: 'rejected' }, // not counted
        { service: 'lab', covered: 200, status: 'approved' },
      ],
    );
    await expect(service.benefitsSummary({ id: 'p1' })).resolves.toEqual([
      {
        service: 'consultation', coverage: 80, annualLimit: 50000,
        usedAmount: 1500, remaining: 48500, icon: 'stethoscope',
      },
      {
        service: 'lab', coverage: 100, annualLimit: 10000,
        usedAmount: 200, remaining: 9800, icon: 'flask',
      },
    ]);
  });
});
