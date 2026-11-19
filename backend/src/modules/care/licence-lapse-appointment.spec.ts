import { AppointmentsService } from './appointments.service';
import { UserRole } from '../../common/enums';
import { LICENCE_LAPSE_CANCEL_REASON } from '../../common/licence-lapse-cancel';

/** D2: an appointment named by the licence lapse sweep is cancelled through the normal cancel as the platform (admin role): 100% back to the card, nothing refunded by hand. */
describe('AppointmentsService.onLicenceLapseCancel (D2)', () => {
  const event = { kind: 'appointment', booking_id: 'a1', patient_id: 'pat-1', provider_profile_id: 'doc-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;
  const make = (status: string | null) => {
    const svc: any = Object.create(AppointmentsService.prototype);
    svc.apptModel = { findOne: jest.fn(async () => (status ? { id: 'a1', status } : null)) };
    svc.cancel = jest.fn(async () => ({}));
    svc.logger = { error: jest.fn() };
    return svc;
  };

  it('cancels a CONFIRMED visit as the platform with the lapse reason', async () => {
    const svc = make('CONFIRMED');
    await svc.onLicenceLapseCancel(event);
    expect(svc.cancel).toHaveBeenCalledTimes(1);
    expect(svc.cancel).toHaveBeenCalledWith('a1', { id: 'system', role: UserRole.ADMIN }, LICENCE_LAPSE_CANCEL_REASON);
  });

  it.each(['CANCELLED', 'IN_PROGRESS', 'COMPLETED', 'CHECKED_IN', null])('leaves a visit that is %s alone', async (status) => {
    const svc = make(status as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.cancel).not.toHaveBeenCalled();
  });

  it('ignores events for other booking kinds, and a failing cancel is logged, not thrown', async () => {
    const svc = make('CONFIRMED');
    await svc.onLicenceLapseCancel({ ...event, kind: 'lab' });
    expect(svc.cancel).not.toHaveBeenCalled();
    svc.cancel.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
    expect(svc.logger.error).toHaveBeenCalled();
  });

  it('the refund for that actor is 100% to the source, with no penalty on the doctor (the existing facility/admin branch)', async () => {
    const svc: any = Object.create(AppointmentsService.prototype);
    svc.getRefundPolicy = jest.fn(async () => ({}));
    const appt = { patient_id: 'pat-1', doctor_user_id: 'doc-u', slot_start: new Date(Date.now() + 5 * 24 * 3600_000), total_price: 200 };
    const out = await (AppointmentsService.prototype as any).calculateRefund.call(svc, appt, { id: 'system', role: UserRole.ADMIN }, LICENCE_LAPSE_CANCEL_REASON);
    expect(out).toEqual({ refundPercentage: 100, refundDestination: 'source', penaltyAmount: 0 });
  });
});
