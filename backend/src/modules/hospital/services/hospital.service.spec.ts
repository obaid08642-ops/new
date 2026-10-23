import { ForbiddenException } from '@nestjs/common';
import { HospitalService } from './hospital.service';

describe('HospitalService UUID and ownership contract', () => {
  function make() {
    const branchModel: any = { create: jest.fn(), find: jest.fn() };
    const departmentModel: any = { create: jest.fn(), find: jest.fn() };
    const staffModel: any = { create: jest.fn(), find: jest.fn() };
    const invitationModel: any = {};
    const doctorModel: any = { find: jest.fn(), findOneAndUpdate: jest.fn() };
    const userModel: any = {
      findOne: jest.fn().mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ _id: 'mongo-hospital-id' }) }) }),
      findByIdAndUpdate: jest.fn(),
    };
    const appointmentModel: any = { find: jest.fn(), findOneAndUpdate: jest.fn() };
    return { service: new HospitalService(branchModel, departmentModel, staffModel, invitationModel, doctorModel, userModel, appointmentModel), branchModel, staffModel, userModel, doctorModel, appointmentModel };
  }

  it('resolves UUID hospital id to the stored Mongo _id for staff reads', async () => {
    const { service, staffModel } = make();
    staffModel.find.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([]) }) });
    await service.getStaff('hospital-uuid', { id: 'hospital-uuid', role: 'hospital_admin' });
    expect(staffModel.find).toHaveBeenCalledWith({ hospital_id: 'mongo-hospital-id', is_active: true });
  });

  it('accepts an approved hospital provider identity normalized from provider_type', async () => {
    const { service, staffModel } = make();
    staffModel.find.mockReturnValue({ sort: () => ({ lean: jest.fn().mockResolvedValue([]) }) });
    await service.getStaff('hospital-uuid', { id: 'hospital-uuid', role: 'provider', provider_type: 'hospital' });
    expect(staffModel.find).toHaveBeenCalledWith({ hospital_id: 'mongo-hospital-id', is_active: true });
  });

  it('rejects a patient-shaped actor and a non-facility provider before querying facility data', async () => {
    const { service, staffModel } = make();
    await expect(service.getStaff('hospital-uuid', { id: 'patient-1', role: 'patient' })).rejects.toBeInstanceOf(ForbiddenException);
    await expect(service.getStaff('hospital-uuid', { id: 'doctor-1', role: 'provider', provider_type: 'doctor' })).rejects.toBeInstanceOf(ForbiddenException);
    expect(staffModel.find).not.toHaveBeenCalled();
  });

  it('scopes appointment status update to doctors affiliated with the hospital', async () => {
    const { service, doctorModel, appointmentModel } = make();
    doctorModel.find.mockReturnValue({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ doctor_id: 'doctor-1' }]) }) });
    appointmentModel.findOneAndUpdate.mockResolvedValue({ id: 'appt-1', status: 'completed' });
    await service.updateAppointmentStatus('hospital-uuid', 'appt-1', 'completed', { id: 'hospital-uuid', role: 'hospital_admin' });
    expect(appointmentModel.findOneAndUpdate).toHaveBeenCalledWith(
      { id: 'appt-1', doctor_id: { $in: ['doctor-1'] } },
      { $set: { status: 'completed' } },
      { new: true },
    );
  });

  it('a clinical sub-account created by a facility is never licence-verified or bookable until an admin approves it', async () => {
    const { service, staffModel, userModel } = make();
    const chain = (v: any) => ({ select: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(v) }) });
    userModel.findOne = jest.fn().mockReturnValueOnce(chain({ _id: 'mongo-hospital-id' })).mockReturnValue(chain(null));
    userModel.create = jest.fn(async (u: any) => ({ ...u, _id: 'u-oid', id: 'u1' }));
    const inserted: Record<string, any[]> = {};
    staffModel.db = { collection: (name: string) => ({ findOne: jest.fn().mockResolvedValue(null), insertOne: jest.fn(async (d: any) => { (inserted[name] ||= []).push(d); }) }) };
    staffModel.create = jest.fn(async (d: any) => d);
    await service.addStaff('hospital-1', { full_name: 'Dr A', email: 'a@example.com', password: 'Passw0rdOK1', staff_role: 'doctor', scfhs: '12-3456' });
    expect(inserted.provider_accounts[0].status).toBe('email_verified'); // not approved: it still has to submit onboarding and wait in the admin queue
    expect(inserted.provider_profiles[0]).toMatchObject({ license_verified: false, public_eligibility: false, medical_review_status: 'pending' });
  });
});
