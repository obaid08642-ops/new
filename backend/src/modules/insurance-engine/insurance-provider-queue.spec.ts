import { InsuranceFlowService, PROVIDER_CLAIM_STATES } from './insurance-engine.module';

// Claims hub: `?scope=all` lists decided claims too, with the patient's name and the company; the default queue is unchanged.
function setup(rows: any[], users: any[] = []) {
  const find = jest.fn((_filter: any) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }) }));
  const service: any = Object.create(InsuranceFlowService.prototype);
  service.requests = {
    find,
    db: { collection: () => ({ find: () => ({ toArray: async () => users }) }) },
  };
  return { service, find };
}
const user = { id: 'prov1' };

describe('providerQueue', () => {
  it('default queue keeps the three open states and adds nothing to the rows', async () => {
    const rows = [{ id: 'r1', patient_id: 'p1', state: 'PENDING_PROVIDER_REVIEW' }];
    const { service, find } = setup(rows);
    const out = await service.providerQueue(user, undefined, undefined);
    expect(find.mock.calls[0][0]).toEqual({ provider_id: 'prov1', state: { $in: ['PENDING_PROVIDER_REVIEW', 'COPAY_PENDING', 'COPAY_PAID'] } });
    expect(out).toBe(rows);
  });

  it('scope=all lists the decided states, never cancelled or expired', async () => {
    const { service, find } = setup([]);
    await service.providerQueue(user, undefined, 'all');
    expect(find.mock.calls[0][0].state.$in).toEqual(PROVIDER_CLAIM_STATES);
    expect(PROVIDER_CLAIM_STATES).toEqual(expect.arrayContaining(['APPROVED_FULL', 'REJECTED']));
    expect(PROVIDER_CLAIM_STATES).not.toContain('CANCELLED');
    expect(PROVIDER_CLAIM_STATES).not.toContain('EXPIRED');
  });

  it('scope=all rows carry the patient name, company, plan and the insurer share', async () => {
    const rows = [{ id: 'r1', patient_id: 'p1', state: 'APPROVED_PARTIAL', price: 1000, copay_amount: 200, policy: { company_name: 'Bupa', plan_class: 'GOLD' } }];
    const { service } = setup(rows, [{ id: 'p1', name: 'Sara' }]);
    const [row] = await service.providerQueue(user, undefined, 'all');
    expect(row).toMatchObject({ patient_name: 'Sara', company_name: 'Bupa', plan: 'GOLD', insurer_share: 800, state: 'APPROVED_PARTIAL' });
  });

  it('scope=all with an unknown patient gives null, not an invented name', async () => {
    const { service } = setup([{ id: 'r1', patient_id: 'gone', state: 'REJECTED', price: 50, policy: {} }]);
    const [row] = await service.providerQueue(user, undefined, 'all');
    expect(row.patient_name).toBeNull();
    expect(row.company_name).toBeNull();
  });
});
