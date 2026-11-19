import { LabsService } from './labs.service';
import { LabBookingState } from '../../schemas/lab.schema';
import { LICENCE_LAPSE_CANCEL_EVENT } from '../../common/licence-lapse-cancel';

/** D2: a lab booking named by the licence lapse sweep is cancelled through the normal transition as the platform; the event it emits is what the finance listener refunds in full. */
describe('LabsService.onLicenceLapseCancel (D2)', () => {
  const event = { kind: 'lab', booking_id: 'b1', patient_id: 'pat-1', provider_profile_id: 'lab-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;
  const make = (state: string | null) => {
    const booking: any = { id: 'b1', patient_id: 'pat-1', state, state_history: [], tracking_id: 't1', save: jest.fn(async () => undefined), toObject() { return { id: this.id, state: this.state }; } };
    const q = (v: unknown) => ({ lean: async () => v, then: (res: any, rej: any) => Promise.resolve(v).then(res, rej) });
    const svc: any = Object.create(LabsService.prototype);
    svc.bkgModel = { findOne: jest.fn(() => q(state ? booking : null)) };
    svc.engine = { apply: jest.fn(async (o: any) => o.mutate()) };
    svc.events = { emit: jest.fn() };
    return { svc, booking };
  };

  it('cancels a CONFIRMED booking: state CANCELLED with the lapse note, and lab.booking_cancelled says cancelled_by provider (the existing full-refund case)', async () => {
    const { svc, booking } = make(LabBookingState.CONFIRMED);
    await svc.onLicenceLapseCancel(event);
    expect(booking.state).toBe(LabBookingState.CANCELLED);
    expect(booking.state_history[0]).toMatchObject({ from: 'CONFIRMED', to: 'CANCELLED', by_user_id: 'system', by_role: 'admin', note: 'provider_license_expired' });
    expect(svc.events.emit).toHaveBeenCalledWith('lab.booking_cancelled', { booking_id: 'b1', patient_id: 'pat-1', prior_state: 'CONFIRMED', cancelled_by: 'provider' });
  });

  it.each([LabBookingState.CANCELLED, LabBookingState.NEW_REQUEST, LabBookingState.SAMPLE_COLLECTED, null])('leaves a booking that is %s alone', async (state) => {
    const { svc, booking } = make(state as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.engine.apply).not.toHaveBeenCalled();
    expect(svc.events.emit).not.toHaveBeenCalled();
    if (state) expect(booking.state).toBe(state);
  });

  it('ignores events of other kinds and never throws', async () => {
    const { svc } = make(LabBookingState.CONFIRMED);
    await svc.onLicenceLapseCancel({ ...event, kind: 'radiology' });
    expect(svc.engine.apply).not.toHaveBeenCalled();
    svc.engine.apply.mockRejectedValueOnce(new Error('boom'));
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
  });

  it('the event name is the one the sweep emits', () => {
    expect(LICENCE_LAPSE_CANCEL_EVENT).toBe('provider.licence_lapse_cancel');
  });
});
