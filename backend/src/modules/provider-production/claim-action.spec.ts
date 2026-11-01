import { ProviderProductionService } from './provider-production.module';

// The facility's claim actions follow the one claim state machine: a decided claim is not moved again.
describe('facility claim actions', () => {
  function svc(claim: any) {
    const updateOne = jest.fn(async () => ({}));
    const col = { findOne: jest.fn(async () => claim), updateOne };
    const s = Object.create(ProviderProductionService.prototype) as any;
    s.conn = { collection: (n: string) => (n === 'insurance_claims' ? col : { findOne: async () => ({ facility_id: 'f1' }) }) };
    return { s: s as ProviderProductionService, updateOne };
  }
  const admin = { id: 'a1', role: 'admin' };

  it('a pending claim can be approved', async () => {
    const { s, updateOne } = svc({ id: 'c1', status: 'pending' });
    await s.claimAction(admin, 'c1', 'approve', {});
    expect(updateOne).toHaveBeenCalledWith({ id: 'c1' }, expect.objectContaining({ $set: expect.objectContaining({ status: 'approved' }) }));
  });
  it('a reimbursed claim cannot be rejected or resubmitted (it used to be reset to pending)', async () => {
    for (const action of ['reject', 'resubmit'] as const) {
      const { s, updateOne } = svc({ id: 'c1', status: 'reimbursed' });
      await expect(s.claimAction(admin, 'c1', action, { reason: 'x' })).rejects.toThrow('invalid_claim_status:reimbursed');
      expect(updateOne).not.toHaveBeenCalled();
    }
  });
  it('only a rejected claim can be resubmitted', async () => {
    const { s, updateOne } = svc({ id: 'c1', status: 'rejected' });
    await s.claimAction(admin, 'c1', 'resubmit', {});
    expect(updateOne).toHaveBeenCalledWith({ id: 'c1' }, expect.objectContaining({ $set: expect.objectContaining({ status: 'pending' }) }));
  });
});
