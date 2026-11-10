import { ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

// PT-03: a guardian who booked and paid for a dependant can cancel it (and gets the refund); they cannot run the visit.
describe('the booker of a visit for someone else', () => {
  const make = () => {
    const svc: any = Object.create(AppointmentsService.prototype);
    const appt = { id: 'a1', patient_id: 'member', booked_by_user_id: 'guardian', doctor_id: 'd1', doctor_user_id: 'doc-user', status: 'CONFIRMED' };
    svc.apptModel = { findOne: async () => appt, findOneAndUpdate: async () => null, updateOne: async () => ({}) };
    svc.isDoctorOwner = async () => false;
    svc.isFacilityOwner = async () => false;
    return svc;
  };
  const guardian = { id: 'guardian', role: 'patient' };

  it('passes the access check of the cancel transition (it was refused 403 after cancel() let them in)', async () => {
    const svc = make();
    const err = await svc.transition('a1', 'CANCELLED', guardian, 'qa').then(() => null, (e: any) => e);
    expect(err).not.toBeInstanceOf(ForbiddenException);
  });

  it('cannot move the visit any other way', async () => {
    const svc = make();
    for (const to of ['COMPLETED', 'IN_PROGRESS', 'CHECKED_IN']) {
      await expect(svc.transition('a1', to, guardian)).rejects.toBeInstanceOf(ForbiddenException);
    }
  });

  it('a stranger is refused the cancel too', async () => {
    const svc = make();
    await expect(svc.transition('a1', 'CANCELLED', { id: 'stranger', role: 'patient' }, 'x')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
