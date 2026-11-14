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
    // The licence rules have their own tests (scfhs-license-gate.spec.ts); here the licence is good.
    const scfhs = { decideFor: jest.fn(async () => ({ decision: { verified: true, license_status: 'verified' }, result: null, number: 'n' })), store: jest.fn(async () => undefined) };
    const publication = { refresh: jest.fn(async () => ({ published: true })) };
    const svc = new ProviderAdminService(
      accounts as any, {} as any, {} as any, {} as any, audit as any,
      seoPipeline as any, {} as any, scfhs as any, publication as any,
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

  it('an expired licence is reactivated only with the renewed expiry date, which is stored', async () => {
    const { svc, profileCol, account } = setup(ProviderAccountStatus.SUSPENDED);
    profileCol.findOne.mockResolvedValue({ id: 'prof-1', account_id: 'acc-1', type: 'lab', license_expiry_date: new Date(Date.now() - 86400000) } as any);
    await expect(svc.reactivate(ADMIN as any, 'acc-1', { reason: 'renewed' })).rejects.toThrow('license_expired_renew_first');
    await expect(svc.reactivate(ADMIN as any, 'acc-1', { license_expiry_date: '2020-01-01' })).rejects.toThrow('license_expiry_date_must_be_in_the_future');
    expect(account.status).toBe(ProviderAccountStatus.SUSPENDED);   // nothing changed by the refusals
    const renewed = new Date(Date.now() + 200 * 86400000).toISOString();
    await svc.reactivate(ADMIN as any, 'acc-1', { reason: 'renewed', license_expiry_date: renewed });
    expect(profileCol.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({ account_id: 'acc-1' }),
      expect.objectContaining({ $set: expect.objectContaining({ license_expiry_date: new Date(renewed), license_status: 'active' }), $unset: { suspended_reason: '', suspended_at: '' } }),
    );
  });
});

// Server gate (queue item 5): the central gate only checks provider-scope tokens, but approve turns the users row into the provider role, so a suspended
// provider kept a working provider session through the patient login. Suspend / reject now take the login back to the restricted role and revoke its sessions.
describe('a provider who is no longer approved loses the provider role of the login at once', () => {
  const ADMIN = { id: 'admin-1', role: 'admin' };
  function setup(status: string, extra: Record<string, unknown> = {}) {
    const profileCol = { updateMany: jest.fn(async () => ({})), findOne: jest.fn(async () => ({ id: 'prof-1', account_id: 'acc-1', type: 'doctor' })) };
    const usersCol = { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({ modifiedCount: 1 })) };
    const db = { collection: jest.fn((n: string) => (n === 'users' ? usersCol : profileCol)) };
    const account: any = { id: 'acc-1', user_id: 'user-1', provider_type: 'doctor', status, status_history: [], email: 'd@example.com', save: jest.fn(async () => undefined), toObject() { return { ...this }; }, ...extra };
    const accounts = { findOne: jest.fn(async () => account), model: { db } };
    const scfhs = { decideFor: jest.fn(async () => ({ decision: { verified: true }, result: null, number: 'n' })), store: jest.fn(async () => undefined) };
    const svc = new ProviderAdminService(accounts as any, {} as any, { updateMany: jest.fn(), create: jest.fn() } as any, {} as any, { create: jest.fn() } as any,
      { processEntity: jest.fn(async () => ({})) } as any, { emit: jest.fn() } as any, scfhs as any, { refresh: jest.fn(async () => ({})) } as any);
    return { svc, usersCol };
  }

  it('suspend: the login row holding the doctor role goes back to guest and its token version is bumped', async () => {
    const { svc, usersCol } = setup(ProviderAccountStatus.APPROVED);
    await svc.suspend(ADMIN as any, 'acc-1', { reason: 'complaint' });
    expect(usersCol.updateOne).toHaveBeenCalledWith({ id: 'user-1', role: 'doctor' }, { $set: { role: 'guest' }, $inc: { token_version: 1 } });
  });

  it('reject after suspend: the same demotion (the role is only taken from a row that really holds it)', async () => {
    const { svc, usersCol } = setup(ProviderAccountStatus.SUSPENDED);
    await svc.reject(ADMIN as any, 'acc-1', { reason: 'licence is not valid' });
    expect(usersCol.updateOne).toHaveBeenCalledWith({ id: 'user-1', role: 'doctor' }, expect.objectContaining({ $set: { role: 'guest' } }));
  });

  it('an unknown provider type demotes nothing (the filter can match no row)', async () => {
    const { svc, usersCol } = setup(ProviderAccountStatus.APPROVED, { provider_type: 'martian' });
    await svc.suspend(ADMIN as any, 'acc-1', { reason: 'x' });
    expect(usersCol.updateOne.mock.calls.filter((c: any[]) => c[1]?.$set?.role === 'guest').every((c: any[]) => c[0]._id === null)).toBe(true);
  });

  it('reactivate gives the provider role back with the new token version', async () => {
    const { svc, usersCol } = setup(ProviderAccountStatus.SUSPENDED);
    await svc.reactivate(ADMIN as any, 'acc-1', { reason: 'appeal won' });
    expect(usersCol.updateOne).toHaveBeenCalledWith({ id: 'user-1' }, { $set: { active: true, suspended: false, role: 'doctor' }, $inc: { token_version: 1 } });
  });
});

