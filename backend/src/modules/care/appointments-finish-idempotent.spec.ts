import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

// X3: finishing a visit that is already over never rewrites its summary.
describe('finish an appointment twice', () => {
  const make = (status: string) => {
    const save = jest.fn();
    const appt: any = { id: 'a1', status, summary: { diagnosis: 'original' }, save, toObject() { return { id: 'a1', status, summary: this.summary }; } };
    const svc: any = Object.create(AppointmentsService.prototype);
    svc.apptModel = { findOne: async () => appt };
    svc.assertAppointmentAccess = async () => undefined;
    svc.transition = jest.fn(async () => ({ id: 'a1', status: 'COMPLETED' }));
    return { svc, appt, save };
  };
  const doctor = { id: 'doc', role: 'doctor' };

  it('a repeated finish reports the visit and keeps the written summary', async () => {
    const { svc, appt, save } = make('COMPLETED');
    const out = await svc.finish('a1', { diagnosis: 'changed' }, doctor);
    expect(out).toMatchObject({ success: true, already_completed: true });
    expect(appt.summary.diagnosis).toBe('original');
    expect(save).not.toHaveBeenCalled();
    expect(svc.transition).not.toHaveBeenCalled();
  });

  it.each(['CANCELLED', 'NO_SHOW', 'RESCHEDULED'])('a %s visit is refused before anything is written', async (status) => {
    const { svc, save } = make(status);
    await expect(svc.finish('a1', { diagnosis: 'x' }, doctor)).rejects.toThrow(new BadRequestException('appointment_not_finishable'));
    expect(save).not.toHaveBeenCalled();
  });

  it('an in-progress visit still finishes', async () => {
    const { svc, save } = make('IN_PROGRESS');
    const out = await svc.finish('a1', { diagnosis: 'flu' }, doctor);
    expect(out.success).toBe(true);
    expect(save).toHaveBeenCalled();
    expect(svc.transition).toHaveBeenCalled();
  });
});
