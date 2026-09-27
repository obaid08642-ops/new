import { BadRequestException, NotFoundException } from '@nestjs/common';
import { BedsService, ShiftsService } from './facility-ops.module';

// Live hospital journey findings: beds/admissions were not scoped to the facility, a bed could be taken
// twice in a race, and shifts accepted any user id and free-form times.
describe('facility beds ownership and atomic admission', () => {
  const make = (ward: any, taken = 1) => {
    const wardModel: any = { findOne: jest.fn().mockReturnValue({ lean: () => ward, then: (r: any) => r(ward) }), updateOne: jest.fn() };
    const bedModel: any = {
      findOne: jest.fn().mockResolvedValue({ id: 'bed-1', ward_id: 'ward-1', status: 'available' }),
      find: jest.fn().mockReturnValue({ lean: () => [] }),
      updateOne: jest.fn().mockResolvedValue({ modifiedCount: taken }),
    };
    const admissionModel: any = { create: jest.fn().mockResolvedValue({ id: 'adm-1' }) };
    const conn: any = { db: { collection: () => ({ findOne: jest.fn().mockResolvedValue({ _id: 'u' }) }) } };
    return { svc: new BedsService(wardModel, bedModel, admissionModel, conn), wardModel, bedModel, admissionModel };
  };

  it('another facility cannot read the ward beds', async () => {
    const { svc, wardModel } = make(null);
    await expect(svc.getWardBeds('facility-b', 'ward-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(wardModel.findOne).toHaveBeenCalledWith({ id: { $eq: 'ward-1' }, facility_id: { $eq: 'facility-b' } });
  });

  it('another facility cannot admit into the bed', async () => {
    const { svc, admissionModel } = make(null);
    await expect(svc.admitPatient('facility-b', 'patient-1', 'bed-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(admissionModel.create).not.toHaveBeenCalled();
  });

  it('a bed taken by a concurrent admission is refused', async () => {
    const { svc, bedModel, admissionModel } = make({ id: 'ward-1', facility_id: 'facility-a' }, 0);
    await expect(svc.admitPatient('facility-a', 'patient-1', 'bed-1')).rejects.toBeInstanceOf(BadRequestException);
    expect(bedModel.updateOne).toHaveBeenCalledWith({ id: { $eq: 'bed-1' }, status: 'available' }, expect.anything());
    expect(admissionModel.create).not.toHaveBeenCalled();
  });
});

describe('facility shifts validation', () => {
  const make = (member: boolean) => {
    const col = (name: string) => ({
      findOne: jest.fn().mockResolvedValue(name === 'provider_accounts' ? (member ? { _id: 1 } : null) : null),
    });
    const shiftModel: any = { db: { collection: col }, create: jest.fn().mockResolvedValue({ id: 's1' }) };
    return { svc: new ShiftsService(shiftModel, {} as any), shiftModel };
  };
  const body = { user_id: 'doc-1', day_of_week: 'Sunday', start_time: '08:00', end_time: '16:00' };

  it('rosters a linked provider', async () => {
    const { svc, shiftModel } = make(true);
    await svc.createShift('facility-a', body);
    expect(shiftModel.create).toHaveBeenCalledWith(expect.objectContaining({ facility_id: 'facility-a', user_id: 'doc-1', status: 'scheduled' }));
  });

  it('refuses someone outside the facility, a bad time or a bad day', async () => {
    await expect(make(false).svc.createShift('facility-a', body)).rejects.toBeInstanceOf(BadRequestException);
    await expect(make(true).svc.createShift('facility-a', { ...body, start_time: '8am' })).rejects.toBeInstanceOf(BadRequestException);
    await expect(make(true).svc.createShift('facility-a', { ...body, day_of_week: 'Funday' })).rejects.toBeInstanceOf(BadRequestException);
  });
});
