import { ProviderOnboardingService } from './provider-onboarding.module';

/** G6: a rejected applicant resubmits; the account goes back to the moderation queue and the reviewer's old reason is cleared. */
describe('ProviderOnboardingService.submit after a rejection', () => {
  function setup(accountStatus: string) {
    const account: any = { id: 'u1', email: 'a@b.test', status: accountStatus, rejection_reason: 'blurry licence' };
    const updates: any[] = [];
    const accounts = {
      findOne: jest.fn().mockResolvedValue(account),
      updateOne: jest.fn().mockImplementation(async (_f: any, u: any) => { updates.push(u); }),
    };
    const contractsCol = { updateOne: jest.fn().mockResolvedValue({}), findOne: jest.fn() };
    const profile: any = {
      id: 'p1', user_id: 'u1', type: 'lab', onboarding_step: 3, status: 'rejected', name_ar: 'مختبر',
      save: jest.fn().mockResolvedValue(undefined), toObject() { return { ...this }; },
    };
    const providerModel: any = {
      findOne: jest.fn().mockResolvedValue(profile),
      db: { collection: (n: string) => (n === 'provider_accounts' ? accounts : contractsCol) },
    };
    const userModel: any = { findOne: () => ({ lean: async () => ({ id: 'u1', email: 'a@b.test', phone: '500000001' }) }) };
    const bus = { emit: jest.fn().mockResolvedValue(undefined) };
    const contracts = { generate: jest.fn().mockResolvedValue({ pdf: Buffer.from('x'), sha256: 'h' }) };
    const scfhs = { recordAtSubmission: jest.fn().mockResolvedValue(undefined) };
    const service = new ProviderOnboardingService(userModel, providerModel, bus as any, contracts as any, scfhs as any);
    return { service, profile, updates, bus };
  }

  it('moves a REJECTED account to pending_admin_approval, clears the reason, and tells the review queue', async () => {
    const { service, profile, updates, bus } = setup('rejected');
    await service.submit({ id: 'u1' }, {});
    expect(profile.status).toBe('pending');
    expect(updates).toHaveLength(1);
    expect(updates[0].$set.status).toBe('pending_admin_approval');
    expect(updates[0].$unset).toEqual({ rejection_reason: '' });
    expect(updates[0].$push.status_history).toMatchObject({ from: 'rejected', to: 'pending_admin_approval', note: 'onboarding resubmitted' });
    expect(bus.emit).toHaveBeenCalledWith(expect.objectContaining({ type: 'provider.submitted_for_review' }));
  });

  it('never reopens a SUSPENDED account', async () => {
    const { service, updates } = setup('suspended');
    await service.submit({ id: 'u1' }, {});
    expect(updates).toHaveLength(1);
    expect(updates[0].$set.status).toBeUndefined();
  });
});
