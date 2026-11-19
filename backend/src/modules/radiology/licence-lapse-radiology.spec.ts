import { RadiologyOpsService } from './radiology.service';
import { RadiologyBookingState } from '../../schemas/radiology.schema';

/** D2: a radiology booking named by the licence lapse sweep is cancelled through the normal transition as the platform; the event it emits is what the finance listener refunds in full. */
describe('RadiologyOpsService.onLicenceLapseCancel (D2)', () => {
  const event = { kind: 'radiology', booking_id: 'r1', patient_id: 'pat-1', provider_profile_id: 'rad-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;
  const make = (state: string | null) => {
    const booking: any = { id: 'r1', patient_id: 'pat-1', state, state_history: [], save: jest.fn(async () => undefined), markModified: jest.fn() };
    const q = (v: unknown) => ({ lean: async () => v, then: (res: any, rej: any) => Promise.resolve(v).then(res, rej) });
    const svc: any = Object.create(RadiologyOpsService.prototype);
    svc.bkgModel = { findOne: jest.fn(() => q(state ? booking : null)) };
    svc.centerBkgModel = { findOne: jest.fn(() => q(null)) };
    svc.events = { emit: jest.fn() };
    return { svc, booking };
  };

  it('cancels a CONFIRMED booking: state CANCELLED with the lapse note, and radiology.booking_cancelled says cancelled_by provider (the existing full-refund case)', async () => {
    const { svc, booking } = make(RadiologyBookingState.CONFIRMED);
    await svc.onLicenceLapseCancel(event);
    expect(booking.state).toBe(RadiologyBookingState.CANCELLED);
    expect(booking.state_history[0]).toMatchObject({ from: 'CONFIRMED', to: 'CANCELLED', by_user_id: 'system', by_role: 'admin', note: 'provider_license_expired' });
    expect(svc.events.emit).toHaveBeenCalledWith('radiology.booking_cancelled', expect.objectContaining({ booking_id: 'r1', patient_id: 'pat-1', prior_state: 'CONFIRMED', cancelled_by: 'provider' }));
  });

  it.each([RadiologyBookingState.CANCELLED, RadiologyBookingState.NEW_REQUEST, RadiologyBookingState.IN_SCANNING, null])('leaves a booking that is %s alone', async (state) => {
    const { svc, booking } = make(state as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.events.emit).not.toHaveBeenCalled();
    if (state) expect(booking.state).toBe(state);
  });

  it('ignores events of other kinds and never throws', async () => {
    const { svc } = make(RadiologyBookingState.CONFIRMED);
    await svc.onLicenceLapseCancel({ ...event, kind: 'lab' });
    expect(svc.events.emit).not.toHaveBeenCalled();
    svc.bkgModel.findOne.mockImplementationOnce(() => { throw new Error('boom'); });
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
  });
});
