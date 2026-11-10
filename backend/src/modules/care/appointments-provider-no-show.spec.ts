import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { DEFAULT_REFUND_POLICY } from '../refund-policy/refund-policy.defaults';

// Owner decision 2026-11-09: >= 2 h before = 100 %, < 2 h = 50 % (card), patient no-show = 0 %, the provider cancels or does not attend = 100 % at once.
const NOW = new Date('2026-11-09T12:00:00Z');
const HOUR = 3600_000;

function make(over: Record<string, unknown> = {}, policy: any = DEFAULT_REFUND_POLICY) {
  const appt: any = { id: 'a1', patient_id: 'pat1', doctor_id: 'd1', doctor_user_id: 'doc-user', status: 'CONFIRMED', total_price: 200, slot_start: new Date(NOW.getTime() - 11 * 60_000), ...over };
  const svc: any = Object.create(AppointmentsService.prototype);
  svc.apptModel = { findOne: async () => appt, updateOne: jest.fn(async () => undefined) };
  svc.assertAppointmentAccess = async () => undefined;
  svc.getRefundPolicy = async () => policy;
  svc.transition = jest.fn(async () => ({ id: 'a1', status: 'CANCELLED' }));
  svc.events = { emit: jest.fn() };
  return { svc, appt };
}
const patient = { id: 'pat1', role: 'patient' };
const doctor = { id: 'doc-user', role: 'doctor' };
const refundEvent = (svc: any) => svc.events.emit.mock.calls.find((c: any[]) => c[0] === 'appointment.refund.calculated')?.[1];

beforeEach(() => { jest.useFakeTimers({ now: NOW }); });
afterEach(() => { jest.useRealTimers(); });

describe('the consultation refund table (default policy)', () => {
  const pct = async (hoursBefore: number, user: any = patient, reason?: string, isNoShow = false) => {
    const { svc } = make({ slot_start: new Date(NOW.getTime() + hoursBefore * HOUR) });
    await svc.cancel('a1', user, reason ?? (user === doctor ? 'ظرف طارئ' : undefined), isNoShow);
    return refundEvent(svc).refund_percentage;
  };
  it('the default is 2 h / 50 % / 0 %', () => {
    expect(DEFAULT_REFUND_POLICY.consultation).toMatchObject({ full_refund_min_hours: 2, late_refund_percent: 50, patient_no_show_percent: 0 });
  });
  it('2 hours or more before: 100 %; less than 2 hours: 50 %, to the card', async () => {
    expect(await pct(24)).toBe(100);
    expect(await pct(2.01)).toBe(100);
    expect(await pct(1.99)).toBe(50);
    expect(await pct(0.1)).toBe(50);
    const { svc } = make({ slot_start: new Date(NOW.getTime() + HOUR) });
    await svc.cancel('a1', patient);
    expect(refundEvent(svc)).toMatchObject({ refund_percentage: 50, refund_destination: 'source' });   // never a wallet credit
  });
  it('a patient no-show is 0 %', async () => {
    expect(await pct(-1, patient, 'no_show', true)).toBe(0);
  });
  it('the doctor cancelling, at any time, is 100 % at once', async () => {
    expect(await pct(0.5, doctor)).toBe(100);
    expect(await pct(48, doctor)).toBe(100);
  });
});

describe('the provider does not attend: the patient reports it', () => {
  it('10 minutes after the start, with the visit not started: cancelled as provider_no_show, 100 % to the card, no doctor penalty invented', async () => {
    const { svc } = make();
    const out = await svc.reportProviderNoShow('a1', patient);
    expect(svc.transition).toHaveBeenCalledWith('a1', 'CANCELLED', patient, 'provider_no_show');
    expect(refundEvent(svc)).toMatchObject({ appointment_id: 'a1', refund_percentage: 100, refund_destination: 'source', penalty_amount: 0, total_price: 200 });
    expect(out).toMatchObject({ refund_percentage: 100, cancellation_reason: 'provider_no_show' });
    expect(svc.events.emit).toHaveBeenCalledWith('appointment.provider_no_show', expect.objectContaining({ appointment_id: 'a1', doctor_user_id: 'doc-user' }));
  });

  it('the person who booked for the patient may report it too', async () => {
    const { svc } = make({ booked_by_user_id: 'booker1' });
    await svc.reportProviderNoShow('a1', { id: 'booker1', role: 'patient' });
    expect(refundEvent(svc).refund_percentage).toBe(100);
  });

  it('not before 10 minutes after the start, and not before the visit', async () => {
    for (const minutesAfterStart of [-60, -1, 0, 9.9]) {
      const { svc } = make({ slot_start: new Date(NOW.getTime() - minutesAfterStart * 60_000) });
      await expect(svc.reportProviderNoShow('a1', patient)).rejects.toThrow('provider_no_show_too_early');
      expect(svc.transition).not.toHaveBeenCalled();
    }
    const ok = make({ slot_start: new Date(NOW.getTime() - 10 * 60_000) });
    await ok.svc.reportProviderNoShow('a1', patient);
    expect(ok.svc.transition).toHaveBeenCalled();
  });

  it('only for a visit that never started: a visit in progress, finished, cancelled or still unconfirmed is refused', async () => {
    for (const status of ['IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'NO_SHOW', 'PENDING', 'ARRIVED']) {
      const { svc } = make({ status });
      await expect(svc.reportProviderNoShow('a1', patient)).rejects.toBeInstanceOf(BadRequestException);
      expect(svc.transition).not.toHaveBeenCalled();
    }
    for (const status of ['CONFIRMED', 'CHECKED_IN', 'EN_ROUTE']) {
      const { svc } = make({ status });
      await svc.reportProviderNoShow('a1', patient);
      expect(svc.transition).toHaveBeenCalled();
    }
  });

  it('the doctor and an admin cannot use it (the doctor cancels with a reason instead)', async () => {
    for (const user of [doctor, { id: 'adm', role: 'admin' }, { id: 'someone', role: 'patient' }]) {
      const { svc } = make();
      await expect(svc.reportProviderNoShow('a1', user)).rejects.toBeInstanceOf(ForbiddenException);
      expect(svc.transition).not.toHaveBeenCalled();
    }
  });

  it('NO LOOPHOLE: writing "provider_no_show" as the reason of an ordinary late cancel still gives 50 %, not 100 %', async () => {
    const { svc } = make({ slot_start: new Date(NOW.getTime() + HOUR) });
    await svc.cancel('a1', patient, 'provider_no_show');
    expect(refundEvent(svc).refund_percentage).toBe(50);
  });
});

describe('the provider side of the report (dispute, activity guard)', () => {
  it('a visit with provider activity is not refunded by the report: nothing is cancelled or emitted', async () => {
    const { svc } = make();
    svc.noShow = { assertNoProviderActivity: jest.fn(async () => { throw new BadRequestException('provider_activity_recorded'); }), autoRefundsInWindow: jest.fn(async () => 0), record: jest.fn() };
    await expect(svc.reportProviderNoShow('a1', patient)).rejects.toThrow('provider_activity_recorded');
    expect(svc.transition).not.toHaveBeenCalled();
    expect(svc.noShow.record).not.toHaveBeenCalled();
    expect(svc.events.emit).not.toHaveBeenCalled();
  });
  it('a refunded report is recorded for the provider (notice, 24 h dispute, count) after the cancel', async () => {
    const { svc, appt } = make({ service_type: 'video' });
    svc.noShow = { assertNoProviderActivity: jest.fn(async () => undefined), autoRefundsInWindow: jest.fn(async () => 0), record: jest.fn(async () => ({ flagged: false, recent_reports: 1, refund_after: null })) };
    const out = await svc.reportProviderNoShow('a1', patient);
    expect(svc.noShow.record).toHaveBeenCalledWith(appt, 'pat1', expect.any(Date), 'refunded');
    expect(out).toMatchObject({ status: 'refunded' });
  });
});

describe('owner decision 2026-11-10: video at once (max 2 per 30 days), clinic and home held for the dispute window', () => {
  const noShowMock = (autoRefunds = 0) => ({
    assertNoProviderActivity: jest.fn(async () => undefined),
    autoRefundsInWindow: jest.fn(async () => autoRefunds),
    record: jest.fn(async (_a: any, _u: string, now: Date, outcome: string) => ({ flagged: false, recent_reports: 1, refund_after: outcome === 'held' ? new Date(now.getTime() + 24 * 3600_000) : null })),
    markRefunded: jest.fn(async () => undefined),
    markReleaseFailed: jest.fn(async () => undefined),
  });

  it('video, first and second report in 30 days: cancelled and refunded at once', async () => {
    for (const before of [0, 1]) {
      const { svc } = make({ service_type: 'video' });
      svc.noShow = noShowMock(before);
      const out = await svc.reportProviderNoShow('a1', patient);
      expect(out.status).toBe('refunded');
      expect(svc.transition).toHaveBeenCalledTimes(1);
      expect(refundEvent(svc)).toMatchObject({ refund_percentage: 100 });
    }
  });
  it('video, the third in 30 days: nothing is cancelled or refunded, the report waits for an admin', async () => {
    const { svc } = make({ service_type: 'video' });
    svc.noShow = noShowMock(2);
    const out = await svc.reportProviderNoShow('a1', patient);
    expect(out).toMatchObject({ ok: true, status: 'pending_review' });
    expect(svc.transition).not.toHaveBeenCalled();
    expect(refundEvent(svc)).toBeUndefined();
    expect(svc.noShow.record).toHaveBeenCalledWith(expect.anything(), 'pat1', expect.any(Date), 'pending_review');
  });
  it('clinic and home: the report is held for 24 h, nothing is cancelled or refunded yet', async () => {
    for (const service_type of ['clinic', 'home']) {
      const { svc } = make({ service_type });
      svc.noShow = noShowMock(0);
      const out = await svc.reportProviderNoShow('a1', patient);
      expect(out).toMatchObject({ ok: true, status: 'held', appointment_id: 'a1' });
      expect(new Date(out.refund_after).getTime()).toBe(NOW.getTime() + 24 * 3600_000);
      expect(svc.transition).not.toHaveBeenCalled();
      expect(refundEvent(svc)).toBeUndefined();
      expect(svc.noShow.record).toHaveBeenCalledWith(expect.anything(), 'pat1', expect.any(Date), 'held');
    }
  });
  it('the release (the window passed, or an admin decided for the patient) cancels the visit as a provider no-show with a 100 % refund, then marks the report refunded', async () => {
    const { svc } = make({ service_type: 'clinic' });
    svc.noShow = noShowMock(0);
    await svc.onProviderNoShowRelease({ appointment_id: 'a1', patient_id: 'pat1' });
    expect(refundEvent(svc)).toMatchObject({ refund_percentage: 100 });
    expect(svc.noShow.markRefunded).toHaveBeenCalledWith('a1');
    expect(svc.noShow.markReleaseFailed).not.toHaveBeenCalled();
  });
  it('a release that cannot be paid (the visit was cancelled meanwhile) marks the report release_failed and throws nothing', async () => {
    const { svc } = make({ service_type: 'clinic' });
    svc.noShow = noShowMock(0);
    svc.transition = jest.fn(async () => { throw new BadRequestException('Invalid transition CANCELLED → CANCELLED'); });
    await expect(svc.onProviderNoShowRelease({ appointment_id: 'a1', patient_id: 'pat1' })).resolves.toBeUndefined();
    expect(svc.noShow.markReleaseFailed).toHaveBeenCalledWith('a1', expect.stringContaining('Invalid transition'));
    expect(svc.noShow.markRefunded).not.toHaveBeenCalled();
  });
});

