import { RadiologyOpsService } from './radiology.service';

/** D2 follow-up: an older radiology CENTRE booking named by the licence lapse sweep is cancelled through the same transition (the centre model, `status` ACCEPTED) as the platform. */
describe('RadiologyOpsService.onLicenceLapseCancel for centre bookings', () => {
  const event = { kind: 'radiology_center', booking_id: 'c1', patient_id: 'pat-1', provider_profile_id: 'rad-1', lapse_at: '2026-11-30T21:00:00.000Z' } as any;
  const make = (status: string | null) => {
    const booking: any = { id: 'c1', patient_id: 'pat-1', status, state_history: [], save: jest.fn(async () => undefined), markModified: jest.fn() };
    const q = (v: unknown) => ({ lean: async () => v, then: (res: any, rej: any) => Promise.resolve(v).then(res, rej) });
    const svc: any = Object.create(RadiologyOpsService.prototype);
    svc.bkgModel = { findOne: jest.fn(() => q(null)) };
    svc.centerBkgModel = { findOne: jest.fn(() => q(status ? booking : null)) };
    svc.events = { emit: jest.fn() };
    return { svc, booking };
  };

  it.each(['ACCEPTED', 'CONFIRMED'])('cancels a %s centre booking as the platform; radiology.booking_cancelled says cancelled_by provider (the existing full-refund case)', async (status) => {
    const { svc, booking } = make(status);
    await svc.onLicenceLapseCancel(event);
    expect(booking.status).toBe('CANCELLED');
    expect(booking.state_history[0]).toMatchObject({ to: 'CANCELLED', by_user_id: 'system', by_role: 'admin', note: 'provider_license_expired' });
    expect(svc.events.emit).toHaveBeenCalledWith('radiology.booking_cancelled', expect.objectContaining({ booking_id: 'c1', cancelled_by: 'provider' }));
  });

  it.each(['PENDING_ACCEPTANCE', 'CHECKED_IN', 'SCANNING_COMPLETED', 'REPORT_UPLOADED', 'CANCELLED', null])('leaves a centre booking that is %s alone', async (status) => {
    const { svc, booking } = make(status as any);
    await svc.onLicenceLapseCancel(event);
    expect(svc.events.emit).not.toHaveBeenCalled();
    if (status) expect(booking.status).toBe(status);
  });

  it('a centre event does not touch the ops bookings model, and a failure is never thrown', async () => {
    const { svc } = make('ACCEPTED');
    await svc.onLicenceLapseCancel(event);
    expect(svc.bkgModel.findOne).not.toHaveBeenCalledWith({ id: 'c1' }, { state: 1 });
    svc.centerBkgModel.findOne.mockImplementationOnce(() => { throw new Error('boom'); });
    await expect(svc.onLicenceLapseCancel(event)).resolves.toBeUndefined();
  });
});
