import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { UserRole } from '../../common/enums';
import { registerAuditSink } from '../../common/audit-record';
import { HospitalStaffService } from './hospital-staff.module';

describe('HospitalStaffService: membership changes', () => {
  const owner = { id: 'owner-user', role: UserRole.HOSPITAL };
  const facility = { id: 'fac-1' };
  const staffRow = (parent: string) => ({ get: (k: string) => ({ parent_provider_account_id: parent, role: 'doctor' } as Record<string, string>)[k] });
  let events: any[];

  const make = (staff: any) => {
    const users: any = { findOne: jest.fn(async () => staff), updateOne: jest.fn().mockResolvedValue({}), deleteOne: jest.fn(), create: jest.fn(), db: { collection: () => ({ updateMany: jest.fn().mockResolvedValue({}) }) } };
    const accounts: any = { findOne: jest.fn(async () => facility) };
    return { service: new HospitalStaffService(users, accounts, {} as any), users };
  };

  beforeEach(() => {
    events = [];
    registerAuditSink(async (e) => { events.push(e); });
  });
  afterAll(() => registerAuditSink(null));

  it('remove ends only the facility link: the user is kept (no delete), permissions cleared, and the change is audited', async () => {
    const { service, users } = make(staffRow('fac-1'));
    await expect(service.remove(owner, 'doc-1')).resolves.toEqual({ ok: true });
    expect(users.deleteOne).not.toHaveBeenCalled();
    const [filter, update] = users.updateOne.mock.calls[0];
    expect(filter).toEqual({ id: 'doc-1' });
    expect(update.$unset).toEqual({ parent_provider_account_id: '', parent_account_id: '', assigned_branch_id: '' });
    expect(update.$set.permissions).toEqual([]);
    expect(update.$set.removed_from_facility_at).toBeInstanceOf(Date);
    expect(events).toEqual([expect.objectContaining({ action: 'facility_staff.removed', user_id: 'owner-user', resource_kind: 'facility_staff', resource_id: 'doc-1', details: { facility_id: 'fac-1', staff_role: 'doctor' } })]);
  });

  it("another facility's staff cannot be removed, and an unknown id is 404; nothing is written or audited", async () => {
    const other = make(staffRow('fac-OTHER'));
    await expect(other.service.remove(owner, 'doc-1')).rejects.toBeInstanceOf(ForbiddenException);
    const missing = make(null);
    await expect(missing.service.remove(owner, 'nope')).rejects.toBeInstanceOf(NotFoundException);
    expect(other.users.updateOne).not.toHaveBeenCalled();
    expect(missing.users.updateOne).not.toHaveBeenCalled();
    expect(events).toEqual([]);
  });

  it('suspend and unsuspend are audited too', async () => {
    const { service, users } = make(staffRow('fac-1'));
    await service.suspend(owner, 'doc-1', true);
    await service.suspend(owner, 'doc-1', false);
    expect(events.map((e) => e.action)).toEqual(['facility_staff.suspended', 'facility_staff.unsuspended']);
    // X4: login reads `active`: suspending turns it off and ends the open sessions; unsuspending turns it back on
    const calls = (users as any).updateOne.mock.calls.map((c: any[]) => c[1]);
    expect(calls[0]).toEqual({ $set: { suspended: true, active: false }, $inc: { token_version: 1 } });
    expect(calls[1]).toEqual({ $set: { suspended: false, active: true } });
  });
});
