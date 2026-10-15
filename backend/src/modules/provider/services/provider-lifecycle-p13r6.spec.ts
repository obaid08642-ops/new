import { ProviderAdminService } from './provider-admin.service';
import { ProviderAccountStatus } from '../provider.enums';

// P13-R6: status changes propagate to search, sitemap, cache and MCP.
// Red on the base: reactivate restores the flags but never re-runs the SEO
// pipeline nor the public-catalog projection, so the provider stays hidden;
// suspend deactivates SEO but never refreshes the projection either.
describe('P13-R6 provider suspend/reactivate propagation', () => {
  const ADMIN = { id: 'admin-1', role: 'admin' };

  function setup(accountStatus: string) {
    const prof = { id: 'prof-1', account_id: 'acc-1', type: 'doctor', status: accountStatus === 'suspended' ? 'suspended' : 'active' };
    const profileCol = {
      updateMany: jest.fn(async () => ({ modifiedCount: 1 })),
      findOne: jest.fn(async () => prof),
    };
    const usersCol = { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({ modifiedCount: 0 })) };
    const db = { collection: jest.fn((name: string) => (name === 'users' ? usersCol : profileCol)) };
    const account = {
      id: 'acc-1', status: accountStatus, status_history: [], email: 'doc@example.com',
      save: jest.fn(async function (this: any) { return this; }),
      toObject: function (this: any) { return { ...this }; },
    };
    const accounts = { findOne: jest.fn(async () => account), model: { db } };
    const audit = { create: jest.fn(async () => null) };
    const seoPipeline = { processEntity: jest.fn(async () => ({ published: true })) };
    const publication = { refresh: jest.fn(async () => ({ published: true })) };
    const svc = new ProviderAdminService(
      accounts as any, {} as any, {} as any, {} as any, audit as any,
      seoPipeline as any, {} as any, publication as any,
    );
    return { svc, account, profileCol, usersCol, audit, seoPipeline, publication };
  }

  it('reactivate restores discovery: SEO reactivate + projection refresh', async () => {
    const { svc, seoPipeline, publication, profileCol } = setup(ProviderAccountStatus.SUSPENDED);
    await svc.reactivate(ADMIN as any, 'acc-1', { reason: 'appeal won' });
    expect(profileCol.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'acc-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'active', public_eligibility: true }) }),
    );
    expect(seoPipeline.processEntity).toHaveBeenCalledWith(expect.objectContaining({ action: 'reactivate' }));
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'provider' }));
  });

  it('suspend removes discovery: SEO deactivate + projection refresh', async () => {
    const { svc, seoPipeline, publication, profileCol } = setup(ProviderAccountStatus.APPROVED);
    await svc.suspend(ADMIN as any, 'acc-1', { reason: 'complaint' });
    expect(profileCol.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'acc-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ status: 'suspended', public_eligibility: false }) }),
    );
    expect(seoPipeline.processEntity).toHaveBeenCalledWith(expect.objectContaining({ action: 'deactivate' }));
    expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({ entityType: 'provider' }));
  });
});
