import { HomeCareSvc } from './home-care.service';
import { NursingBookingState } from '../../schemas/home-care.schema';

/** D2: a home-care booking named by the licence lapse sweep is cancelled through the normal cancel as the platform; the event it emits is what the nursing refund listener refunds in full. */
describe('HomeCareSvc.onLicenceLapseCancel (D2)', () => {
  const event = { kind: 'home_care', booking_id: 'h1', patient_id: 'pat-1', provider_profile_id: 'nurse-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;
  const make = (state: string | null) => {
    const booking: any = { id: 'h1', patient_id: 'pat-1', state, state_history: [], total: 300, payment_method: 'card', scheduled_at: new Date('2026-12-05T10:00:00Z'), save: jest.fn(async () => undefined), toObject() { return { id: this.id, state: this.state }; } };
    const q = (v: unknown) => ({ lean: async () => v, then: (res: any, rej: any) => Promise.resolve(v).then(res, rej) });
    const svc: any = Object.create(HomeCareSvc.prototype);
    svc.bkgModel = { findOne: jest.fn(() => q(state ? booking : null)) };
    svc.engine = { apply: jest.fn(async (o: any) => o.mutate()) };
    svc.events = { emit: jest.fn() };
    return { svc, booking };
  };

  it.each([NursingBookingState.CONFIRMED, NursingBookingState.PROVIDER_ASSIGNED])('cancels a %s booking: CANCELLED with the lapse note, and homecare.booking_cancelled says prior_state before transit, cancelled_by admin (the full-refund case)', async (state) => {
    const { svc, booking } = make(state);
    await svc.onLicenceLapseCancel(event);
    expect(booking.state).toBe('CANCELLED');
    expect(booking.state_history[0]).toMatchObject({ from: state, to: 'CANCELLED', by_user_id: 'system', note: 'provider_license_expired' });
    expect(svc.engine.apply).toHaveBeenCalledWith(expect.objectContaining({ reason: 'provider_license_expired', actor_role: 'admin' }));
    expect(svc.events.emit).toHaveBeenCalledWith('homecare.booking_cancelled', expect.objectContaining({ booking_id: 'h1', patient_id: 'pat-1', prior_state: state, total: 300, cancelled_by: 'admin' }));
  });

  it.each([NursingBookingState.IN_TRANSIT, NursingBookingState.ARRIVED, NursingBookingState.CARE_IN_PROGRESS, NursingBookingState.COMPLETED, NursingBookingState.CANCELLED, NursingBookingState.NEW_REQUEST, null])('leaves a booking that is %s alone', async (state) => {
    const { svc, booking } = make(state as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.engine.apply).not.toHaveBeenCalled();
    expect(svc.events.emit).not.toHaveBeenCalled();
    if (state) expect(booking.state).toBe(state);
  });

  it('ignores events of other kinds and never throws', async () => {
    const { svc } = make(NursingBookingState.CONFIRMED);
    await svc.onLicenceLapseCancel({ ...event, kind: 'lab' });
    expect(svc.engine.apply).not.toHaveBeenCalled();
    svc.engine.apply.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
  });

  it('a patient cancel still has no note and the same reason as before (cancel(id, user) is unchanged)', async () => {
    const { svc, booking } = make(NursingBookingState.CONFIRMED);
    await svc.cancel('h1', { id: 'pat-1', role: 'patient' });
    expect(svc.engine.apply).toHaveBeenCalledWith(expect.objectContaining({ reason: 'user_cancelled' }));
    expect(booking.state_history[0].note).toBeUndefined();
    expect(svc.events.emit).toHaveBeenCalledWith('homecare.booking_cancelled', expect.objectContaining({ cancelled_by: 'patient' }));
  });
});
