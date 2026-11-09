import { BadRequestException, NotFoundException } from '@nestjs/common';
import { registerAuditSink } from '../../../common/audit-record';
import { HospitalService } from './hospital.service';

describe('facility invitations and memberships (gap 8)', () => {
  const lean = (rows: unknown) => ({ sort: () => ({ limit: () => ({ lean: async () => rows }) }), select: () => ({ limit: () => ({ lean: async () => rows }), lean: async () => rows }), lean: async () => rows });
  function make(inv: any, users: any[] = []) {
    const save = jest.fn(async () => undefined);
    const doc = inv ? { ...inv, save } : null;
    const invitationModel: any = { findOne: jest.fn(async () => doc), find: jest.fn(() => lean(inv ? [inv] : [])) };
    const staffModel: any = { db: { collection: () => ({ updateOne: jest.fn() }) } };
    const userModel: any = { find: jest.fn(() => lean(users)), findOne: jest.fn(() => ({ lean: async () => users[0] || null, then: undefined })), updateOne: jest.fn(), };
    const service = new HospitalService({} as any, {} as any, staffModel, invitationModel, {} as any, userModel, {} as any);
    return { service, doc, save, invitationModel, userModel };
  }
  const facility = { id: 'fac-1', role: 'hospital' };
  let events: any[];
  beforeEach(() => { events = []; registerAuditSink(async (e) => { events.push(e); }); });
  afterAll(() => registerAuditSink(null));

  it('the facility withdraws its own pending invitation: status cancelled, who and when recorded, audited', async () => {
    const { service, doc, save } = make({ id: 'inv-1', facility_id: 'fac-1', invitee_id: 'u-1', status: 'pending' });
    await service.cancelInvitation('fac-1', 'inv-1', facility);
    expect(doc!.status).toBe('cancelled');
    expect((doc as any).cancelled_at).toBeInstanceOf(Date);
    expect((doc as any).cancelled_by).toBe('fac-1');
    expect(save).toHaveBeenCalled();
    expect(events).toEqual([expect.objectContaining({ action: 'facility_invitation.cancelled', resource_id: 'inv-1' })]);
  });

  it("another facility's invitation is 404 (no IDOR), an answered one is refused, an admin may withdraw any pending one", async () => {
    const other = make({ id: 'inv-2', facility_id: 'fac-OTHER', invitee_id: 'u-1', status: 'pending' });
    await expect(other.service.cancelInvitation('fac-1', 'inv-2', facility)).rejects.toBeInstanceOf(NotFoundException);
    expect(other.save).not.toHaveBeenCalled();
    const answered = make({ id: 'inv-3', facility_id: 'fac-1', invitee_id: 'u-1', status: 'accepted' });
    await expect(answered.service.cancelInvitation('fac-1', 'inv-3', facility)).rejects.toBeInstanceOf(BadRequestException);
    expect(answered.save).not.toHaveBeenCalled();
    const admin = make({ id: 'inv-4', facility_id: 'fac-OTHER', invitee_id: 'u-1', status: 'pending' });
    await admin.service.cancelInvitation('admin-1', 'inv-4', { id: 'admin-1', role: 'admin' }, true);
    expect(admin.doc!.status).toBe('cancelled');
    expect(events.at(-1)).toMatchObject({ details: { by_admin: true } });
    const missing = make(null);
    await expect(missing.service.cancelInvitation('fac-1', 'nope', facility)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('admin list filters by status and facility and names both sides', async () => {
    const { service, invitationModel } = make({ id: 'inv-1', facility_id: 'fac-1', invitee_id: 'u-1', status: 'pending' }, [{ id: 'fac-1', full_name: 'Facility' }, { id: 'u-1', full_name: 'Dr A' }]);
    const rows = await service.adminListInvitations({ status: 'pending', facility_id: 'fac-1' });
    expect(invitationModel.find).toHaveBeenCalledWith({ status: { $eq: 'pending' }, facility_id: { $eq: 'fac-1' } });
    expect(rows[0]).toMatchObject({ facility_name: 'Facility', invitee_name: 'Dr A' });
  });

  it('PV-12: the invitee is told when invited and the facility when the invitee answers', async () => {
    const emitted: any[] = [];
    const { service, userModel, invitationModel } = make({ id: 'inv-9', facility_id: 'fac-1', invitee_id: 'u-1', status: 'pending', permissions: {} }, [{ id: 'u-1' }]);
    (service as any).events = { emit: (n: string, p: any) => emitted.push([n, p]) };
    invitationModel.findOne = jest.fn()
      .mockResolvedValueOnce(null) // no pending invitation yet
      .mockResolvedValueOnce({ id: 'inv-9', facility_id: 'fac-1', invitee_id: 'u-1', status: 'pending', permissions: {}, save: jest.fn() });
    invitationModel.create = jest.fn(async (d: any) => ({ id: 'inv-9', ...d }));
    await service.createInvitation('fac-1', { identifier: '0500000000' });
    expect(emitted[0]).toEqual(['hospital.invitation_created', { invitation_id: 'inv-9', invitee_id: 'u-1', facility_id: 'fac-1' }]);
    await service.respondInvitation('u-1', 'inv-9', true);
    expect(emitted[1]).toEqual(['hospital.invitation_answered', { invitation_id: 'inv-9', invitee_id: 'u-1', facility_id: 'fac-1', accepted: true }]);
    expect(userModel.updateOne).toHaveBeenCalled();
  });
});
