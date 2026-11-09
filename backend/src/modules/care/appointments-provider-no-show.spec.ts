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
