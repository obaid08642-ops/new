import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { HospitalService } from './hospital.service';

describe('HospitalService staff credentialing fields', () => {
  const STAFF_ID = '507f1f77bcf86cd799439011';
  const actor = { id: 'hospital-uuid', role: 'hospital_admin' };

  function make(updated: any) {
    const staffModel: any = {
      find: jest.fn(),
      findOneAndUpdate: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(updated) }),
      db: { collection: () => ({ insertOne: jest.fn().mockResolvedValue({}) }) },
    };
    const userModel: any = {
      findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: '507f1f77bcf86cd799439012' }) }) }),
      find: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }) }),
    };
    const service = new HospitalService({} as any, {} as any, staffModel, {} as any, {} as any, userModel, {} as any);
    return { service, staffModel };
  }

  it('stores licence expiry and malpractice cover on the facility\'s own active staff record only', async () => {
    const { service, staffModel } = make({ _id: STAFF_ID, scfhs: 'L-1', license_expiry: new Date('2027-01-01'), malpractice_insurance: true, malpractice_expiry: new Date('2027-06-01') });
    const out = await service.updateStaffCredentials('hospital-uuid', STAFF_ID, { scfhs: 'L-1', license_expiry: '2027-01-01', malpractice_insurance: true, malpractice_expiry: '2027-06-01' }, actor);
    const [filter, update] = staffModel.findOneAndUpdate.mock.calls[0];
    expect(String(filter._id)).toBe(STAFF_ID);
    expect(String(filter.hospital_id)).toBe('507f1f77bcf86cd799439012');
    expect(filter.is_active).toBe(true);
    expect(update.$set.license_expiry).toEqual(new Date('2027-01-01'));
    expect(update.$set.malpractice_insurance).toBe(true);
    expect(out.malpractice_insurance).toBe(true);
    expect(out.scfhs).toBe('L-1');
  });

  it('only sets the fields that were sent', async () => {
    const { service, staffModel } = make({ _id: STAFF_ID });
    await service.updateStaffCredentials('hospital-uuid', STAFF_ID, { malpractice_insurance: false }, actor);
    expect(Object.keys(staffModel.findOneAndUpdate.mock.calls[0][1].$set)).toEqual(['malpractice_insurance']);
  });

  it('404s for a staff member of another facility and refuses a non-facility actor', async () => {
    const { service } = make(null);
    await expect(service.updateStaffCredentials('hospital-uuid', STAFF_ID, { scfhs: 'x' }, actor)).rejects.toBeInstanceOf(NotFoundException);
    await expect(service.updateStaffCredentials('hospital-uuid', STAFF_ID, { scfhs: 'x' }, { id: 'p1', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('lists the credentialing fields', async () => {
    const { service, staffModel } = make(null);
    staffModel.find.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([{ _id: STAFF_ID, user_id: 'u1', role: 'doctor', license_expiry: new Date('2027-01-01'), malpractice_insurance: true }]) }) });
    const rows = await service.getStaff('hospital-uuid', actor);
    expect(rows[0]).toMatchObject({ malpractice_insurance: true, malpractice_expiry: null });
    expect(rows[0].license_expiry).toEqual(new Date('2027-01-01'));
  });
});
