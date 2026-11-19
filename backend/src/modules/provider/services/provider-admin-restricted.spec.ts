/** B2 + C2: an admin brings a RESTRICTED account (lapsed licence) back only with a renewed future expiry date; the profile then shows again with the new date. */
import { ConflictException } from '@nestjs/common';
import { ProviderAdminService } from './provider-admin.service';
import { ProviderAccountStatus } from '../provider.enums';

const ADMIN = { id: 'admin-1', role: 'admin' };
const DAY = 86400000;

function setup(profile: any) {
  const profileCol = { findOne: jest.fn(async () => profile), updateMany: jest.fn(async () => ({ modifiedCount: 1 })) };
  const usersCol = { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({})) };
  const db = { collection: jest.fn((n: string) => (n === 'users' ? usersCol : profileCol)) };
  const account: any = { id: 'acc-1', status: ProviderAccountStatus.RESTRICTED, status_history: [], provider_type: profile.type, email: 'p@example.com', save: jest.fn(async function (this: any) { return this; }), toObject() { return { ...this }; } };
  const accounts = { findOne: jest.fn(async () => account), model: { db } };
  const generic = { updateOne: jest.fn(), updateMany: jest.fn(), findOne: jest.fn(async () => null), create: jest.fn() };
  const scfhs = { decideFor: jest.fn(async () => null), store: jest.fn() };
  const svc = new ProviderAdminService(accounts as any, generic as any, generic as any, generic as any, { create: jest.fn() } as any,
    { processEntity: jest.fn(async () => ({})) } as any, { emit: jest.fn() } as any, scfhs as any, { refresh: jest.fn(async () => ({})) } as any);
  return { svc, account, profileCol };
}

describe('reactivating a restricted account (lapsed licence)', () => {
  it('with a renewed future expiry date: the account is approved again and the profile gets the new date and is shown again', async () => {
    const { svc, account, profileCol } = setup({ id: 'p1', type: 'lab', license_expiry_date: new Date(Date.now() - 3 * DAY) });
    const renewed = new Date(Date.now() + 365 * DAY).toISOString();
    await svc.reactivate(ADMIN, 'acc-1', { reason: 'renewed licence checked', license_expiry_date: renewed });
    expect(account.status).toBe(ProviderAccountStatus.APPROVED);
    const set = (profileCol.updateMany.mock.calls as unknown[][])[0][1] as any;
    expect(set.$set).toMatchObject({ status: 'active', public_eligibility: true, license_status: 'active', license_verified: true });
    expect(new Date(set.$set.license_expiry_date).toISOString()).toBe(renewed);
  });

  it('without a renewed date while the stored one has passed: refused, nothing changes (the monitor would restrict them again the next morning)', async () => {
    const { svc, account, profileCol } = setup({ id: 'p1', type: 'lab', license_expiry_date: new Date(Date.now() - 3 * DAY) });
    await expect(svc.reactivate(ADMIN, 'acc-1', { reason: 'appeal' })).rejects.toThrow(new ConflictException('license_expired_renew_first'));
    expect(account.status).toBe(ProviderAccountStatus.RESTRICTED);
    expect(profileCol.updateMany).not.toHaveBeenCalled();
  });

  it('a renewed date that is not in the future is refused', async () => {
    const { svc, account } = setup({ id: 'p1', type: 'lab', license_expiry_date: new Date(Date.now() - 3 * DAY) });
    await expect(svc.reactivate(ADMIN, 'acc-1', { reason: 'x', license_expiry_date: new Date(Date.now() - DAY).toISOString() })).rejects.toThrow('license_expiry_date_must_be_in_the_future');
    expect(account.status).toBe(ProviderAccountStatus.RESTRICTED);
  });
});
