import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

// PV-21: a doctor who cancels an accepted booking must say why; the patient cancelling needs no reason.
describe('provider cancels a booking', () => {
  const make = () => {
    const svc: any = Object.create(AppointmentsService.prototype);
    const appt = { id: 'a1', patient_id: 'pat1', doctor_id: 'd1', doctor_user_id: 'doc-user', status: 'CONFIRMED' };
    svc.apptModel = { findOne: async () => appt };
    svc.assertAppointmentAccess = async () => undefined;
    svc.calculateRefund = jest.fn(async () => ({ refundPercentage: 100, refundDestination: 'source', penaltyAmount: 0 }));
    svc.transition = jest.fn(async () => ({}));
    return svc;
  };
  const doctor = { id: 'doc-user', role: 'doctor' };

  it.each([undefined, '', '  ', 'x'])('refuses the doctor\'s cancel with reason %p', async (reason) => {
    const svc = make();
    await expect(svc.cancel('a1', doctor, reason as any)).rejects.toThrow(new BadRequestException('cancel_reason_required'));
    expect(svc.transition).not.toHaveBeenCalled();
  });

  it('lets the doctor cancel with a reason, and the patient cancel without one', async () => {
    const svc = make();
    svc.apptModel.updateOne = async () => undefined;
    svc.events = { emit: jest.fn() };
    await svc.cancel('a1', doctor, 'ظرف طارئ').catch(() => undefined);
    expect(svc.transition).toHaveBeenCalled();
    const svc2 = make();
    svc2.apptModel.updateOne = async () => undefined;
    svc2.events = { emit: jest.fn() };
    await svc2.cancel('a1', { id: 'pat1', role: 'patient' }, undefined).catch(() => undefined);
    expect(svc2.transition).toHaveBeenCalled();
  });
});
