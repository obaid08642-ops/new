import { BadRequestException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';

function build(appt: any) {
  const svc: any = Object.create(AppointmentsService.prototype);
  svc.apptModel = { findOne: async () => appt };
  svc.transition = jest.fn(async () => ({ ok: true }));
  return svc;
}

describe('a doctor confirming a pending appointment', () => {
  it('cannot confirm an unpaid card booking (the payment confirms it)', async () => {
    const svc = build({ id: 'a1', status: 'PENDING', payment_method: 'card', payment_status: 'pending' });
    await expect(svc.confirm('a1', { id: 'd1', role: 'doctor' })).rejects.toBeInstanceOf(BadRequestException);
    expect(svc.transition).not.toHaveBeenCalled();
  });
  it('can confirm a paid card booking, a cash booking and an insurance booking', async () => {
    for (const a of [{ payment_method: 'card', payment_status: 'paid' }, { payment_method: 'cash', payment_status: 'pending' }, { payment_method: 'insurance', payment_status: 'pending' }]) {
      const svc = build({ id: 'a1', status: 'PENDING', ...a });
      await svc.confirm('a1', { id: 'd1', role: 'doctor' });
      expect(svc.transition).toHaveBeenCalledTimes(1);
    }
  });
});
