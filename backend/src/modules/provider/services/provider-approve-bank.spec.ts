import { ProviderAdminService } from './provider-admin.service';
import { ProviderAccountStatus } from '../provider.enums';

/** Approving a provider reviews the provider and its documents; the payout bank is reviewed separately (approve-bank). */
describe('ProviderAdminService.approve leaves the bank account to its own review', () => {
  it('approves pending documents but never touches the bank rows', async () => {
    const profile = { id: 'p1', type: 'lab', license_number: 'L1' };
    const profileCol = { findOne: jest.fn(async () => profile), updateMany: jest.fn(async () => ({ modifiedCount: 1 })) };
    const usersCol = { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({})) };
    const db = { collection: jest.fn((n: string) => (n === 'users' ? usersCol : profileCol)) };
    const account = { id: 'acc-1', status: ProviderAccountStatus.PENDING_ADMIN_APPROVAL, status_history: [], provider_type: 'lab', email: 'p@example.com', save: jest.fn(async function (this: any) { return this; }), toObject() { return { ...this }; } };
    const accounts = { findOne: jest.fn(async () => account), model: { db } };
    const profiles = { updateOne: jest.fn() };
    const docs = { updateMany: jest.fn(async () => ({})) };
    const banks = { updateMany: jest.fn(), updateOne: jest.fn(), findOne: jest.fn() };
    const svc = new ProviderAdminService(accounts as any, profiles as any, docs as any, banks as any, { create: jest.fn() } as any,
      { processEntity: jest.fn(async () => ({})) } as any, { emit: jest.fn() } as any, { decideFor: jest.fn(), store: jest.fn() } as any, { refresh: jest.fn(async () => ({})) } as any);
    await svc.approve({ id: 'admin-1', role: 'admin' }, 'acc-1', {});
    expect(account.status).toBe(ProviderAccountStatus.APPROVED);
    expect(docs.updateMany).toHaveBeenCalled();
    expect(banks.updateMany).not.toHaveBeenCalled();
    expect(banks.updateOne).not.toHaveBeenCalled();
  });
});
