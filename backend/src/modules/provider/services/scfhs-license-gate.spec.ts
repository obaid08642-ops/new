/** 19.3: approval and reactivation of a doctor, pharmacist or individual nurse need a confirmed SCFHS licence. */
import { ConflictException } from '@nestjs/common';
import { ProviderAdminService } from './provider-admin.service';
import { ProvidersService } from '../providers.service';
import { ProviderAccountStatus } from '../provider.enums';

const ADMIN = { id: 'admin-1', role: 'admin' };
const future = () => new Date(Date.now() + 90 * 24 * 3600 * 1000).toISOString();

function adminSetup(profile: any, scfhs: any, status = ProviderAccountStatus.PENDING_ADMIN_APPROVAL) {
  const profileCol = { findOne: jest.fn(async () => profile), updateMany: jest.fn(async () => ({ modifiedCount: 1 })) };
  const usersCol = { findOne: jest.fn(async () => null), updateOne: jest.fn(async () => ({})) };
  const db = { collection: jest.fn((n: string) => (n === 'users' ? usersCol : profileCol)) };
  const account = { id: 'acc-1', status, status_history: [], provider_type: profile.type, email: 'p@example.com', save: jest.fn(async function (this: any) { return this; }), toObject() { return { ...this }; } };
  const accounts = { findOne: jest.fn(async () => account), model: { db } };
  const generic = { updateOne: jest.fn(), updateMany: jest.fn(), findOne: jest.fn(async () => null), create: jest.fn() };
  const svc = new ProviderAdminService(accounts as any, generic as any, generic as any, generic as any, { create: jest.fn() } as any,
    { processEntity: jest.fn(async () => ({})) } as any, { emit: jest.fn() } as any, scfhs, { refresh: jest.fn(async () => ({})) } as any);
  return { svc, account, profileCol };
}
const scfhsStub = (verdict: any) => ({
  decideFor: jest.fn(async () => ({ decision: verdict, result: null, number: '1' })),
  store: jest.fn(async () => undefined),
});
const GOOD = { verified: true, license_status: 'verified', source: 'admin_manual' };
const BAD = { verified: false, license_status: 'pending_verification', reason: 'scfhs_unavailable_manual_check_required' };

describe('ProviderAdminService: SCFHS licence gate', () => {
  it('refuses to approve a doctor whose licence is not verified, and changes nothing', async () => {
    const scfhs = scfhsStub(BAD);
    const { svc, account, profileCol } = adminSetup({ id: 'p1', type: 'doctor', license_number: '1' }, scfhs);
    await expect(svc.approve(ADMIN, 'acc-1', {})).rejects.toThrow(new ConflictException('scfhs_unavailable_manual_check_required'));
    expect(account.status).toBe(ProviderAccountStatus.PENDING_ADMIN_APPROVAL);
    expect(account.save).not.toHaveBeenCalled();
    expect(profileCol.updateMany).not.toHaveBeenCalled();
  });

  it('approves on a verified licence, passes the admin\'s manual check on, and stores the decision', async () => {
    const scfhs = scfhsStub(GOOD);
    const { svc, account } = adminSetup({ id: 'p1', type: 'doctor', license_number: '1' }, scfhs);
    const manual = { reference: 'R-77', expiry_date: future() };
    await svc.approve(ADMIN, 'acc-1', { manual_license_check: manual });
    expect(scfhs.decideFor).toHaveBeenCalledWith(expect.objectContaining({ type: 'doctor' }), manual);
    expect(scfhs.store).toHaveBeenCalledWith({ account_id: 'acc-1', user_id: { $exists: true } }, GOOD, null, 'admin-1', manual);
    expect(account.status).toBe(ProviderAccountStatus.APPROVED);
  });

  it('does not ask SCFHS about a lab, radiology centre or nursing company', async () => {
    const scfhs = scfhsStub(BAD);
    const { svc, account } = adminSetup({ id: 'p2', type: 'lab', license_number: 'L1' }, scfhs);
    await svc.approve(ADMIN, 'acc-1', {});
    expect(scfhs.decideFor).not.toHaveBeenCalled();
    expect(account.status).toBe(ProviderAccountStatus.APPROVED);
  });

  it('reactivating a provider suspended for its licence needs a verified licence again', async () => {
    const scfhs = scfhsStub(BAD);
    const { svc, account, profileCol } = adminSetup({ id: 'p1', type: 'doctor', license_number: '1' }, scfhs, ProviderAccountStatus.SUSPENDED);
    await expect(svc.reactivate(ADMIN, 'acc-1', { reason: 'appeal' })).rejects.toBeInstanceOf(ConflictException);
    expect(account.status).toBe(ProviderAccountStatus.SUSPENDED);
    expect(profileCol.updateMany).not.toHaveBeenCalled();
    scfhs.decideFor.mockResolvedValue({ decision: GOOD, result: null, number: '1' });
    await svc.reactivate(ADMIN, 'acc-1', { reason: 'renewed', manual_license_check: { reference: 'R', expiry_date: future() } });
    expect(account.status).toBe(ProviderAccountStatus.APPROVED);
    expect(scfhs.store).toHaveBeenCalled();
  });
});
