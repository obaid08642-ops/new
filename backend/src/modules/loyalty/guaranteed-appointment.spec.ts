import { delayCreditText, doctorSideDelayMinutes, qualifiesForDelayCredit, DELAY_CREDIT_TEXT } from './guaranteed-appointment';
import { LoyaltyService } from './loyalty.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AppointmentsService } from '../care/appointments.service';

const SLOT = '2026-10-24T09:00:00Z';
const at = (m: number) => new Date(Date.parse(SLOT) + m * 60_000).toISOString();

describe('guaranteed appointment: delay credit', () => {
  it('measures from the later of the slot and the patient check-in', () => {
    expect(doctorSideDelayMinutes({ service_type: 'clinic', slot_start: SLOT, checked_in_at: at(-10), started_at: at(45) })).toBe(45);
    // the patient arrived 40 minutes late: the doctor-side wait is only 5
    expect(doctorSideDelayMinutes({ service_type: 'clinic', slot_start: SLOT, checked_in_at: at(40), started_at: at(45) })).toBe(5);
    expect(doctorSideDelayMinutes({ service_type: 'video', slot_start: SLOT, started_at: at(35) })).toBe(35);
  });

  it('qualifies only above 30 minutes, for clinic and video, and a clinic visit needs a check-in', () => {
    expect(qualifiesForDelayCredit({ service_type: 'clinic', slot_start: SLOT, checked_in_at: at(0), started_at: at(31) })).toBe(true);
    expect(qualifiesForDelayCredit({ service_type: 'clinic', slot_start: SLOT, checked_in_at: at(0), started_at: at(30) })).toBe(false);
    expect(qualifiesForDelayCredit({ service_type: 'clinic', slot_start: SLOT, started_at: at(90) })).toBe(false);
    expect(qualifiesForDelayCredit({ service_type: 'home', slot_start: SLOT, checked_in_at: at(0), started_at: at(90) })).toBe(false);
    expect(qualifiesForDelayCredit({ service_type: 'video', slot_start: SLOT, started_at: at(31) })).toBe(true);
    expect(qualifiesForDelayCredit({ service_type: 'video', slot_start: 'junk', started_at: at(31) })).toBe(false);
  });

  it('the loyalty handler awards 20 points once per appointment with the ledger reason, and says so', async () => {
    const svc: any = Object.create(LoyaltyService.prototype);
    svc.events = { emit: jest.fn() };
    svc.awardPoints = jest.fn(async () => ({ ok: true, points_awarded: 20 }));
    await svc.onAppointmentStarted({ id: 'ap1', patient_id: 'pat1', service_type: 'clinic', slot_start: SLOT, checked_in_at: at(-5), started_at: at(50) });
    expect(svc.awardPoints).toHaveBeenCalledWith('pat1', 'appointment_delay_credit', 'appointment', 'ap1');
    expect(svc.events.emit).toHaveBeenCalledWith('loyalty.appointment_delay_credit', expect.objectContaining({ user_id: 'pat1', points: 20, appointment_id: 'ap1', delay_minutes: 50 }));
    // on time, or a duplicate/capped award: nothing is awarded, no notification
    svc.awardPoints.mockClear(); svc.events.emit.mockClear();
    await svc.onAppointmentStarted({ id: 'ap2', patient_id: 'pat1', service_type: 'clinic', slot_start: SLOT, checked_in_at: at(0), started_at: at(10) });
    expect(svc.awardPoints).not.toHaveBeenCalled();
    svc.awardPoints.mockResolvedValue({ ok: true, points_awarded: 0, duplicate: true });
    await svc.onAppointmentStarted({ id: 'ap1', patient_id: 'pat1', service_type: 'clinic', slot_start: SLOT, checked_in_at: at(-5), started_at: at(50) });
    expect(svc.events.emit).not.toHaveBeenCalled();
  });

  it('the points table carries the 20-point default, awarded under the existing caps (not a purchase reason)', async () => {
    const svc: any = Object.create(LoyaltyService.prototype);
    expect((await svc.earnTable()).appointment_delay_credit).toBe(20);
  });

  it('the notification is stored in the patient language, English for any other', async () => {
    for (const lang of ['ar', 'en', 'ur', 'hi', 'bn', 'fil'] as const) {
      const t = delayCreditText(lang, 20);
      expect(t.title).toBe(DELAY_CREDIT_TEXT[lang].title);
      expect(t.body).toContain('20');
      expect(t.body).not.toContain('{points}');
    }
    expect(delayCreditText('tl-PH', 20).title).toBe(DELAY_CREDIT_TEXT.fil.title);
    expect(delayCreditText('fr', 20).title).toBe(DELAY_CREDIT_TEXT.en.title);
    expect(delayCreditText(undefined, 20).title).toBe(DELAY_CREDIT_TEXT.en.title);

    const svc: any = Object.create(NotificationsService.prototype);
    svc.model = { db: { collection: () => ({ findOne: async () => ({ locale: 'hi-IN' }) }) } };
    svc.create = jest.fn(async () => undefined);
    await svc.onAppointmentDelayCredit({ user_id: 'pat1', points: 20, appointment_id: 'ap1' });
    expect(svc.create).toHaveBeenCalledWith(expect.objectContaining({ user_id: 'pat1', title: DELAY_CREDIT_TEXT.hi.title, action: { route: '/loyalty/hub' } }));
  });

  it('starting the consultation emits the slot, check-in and start the credit needs', async () => {
    const history: any[] = [{ state: 'CONFIRMED', at: at(-60) }, { state: 'CHECKED_IN', at: at(-5) }];
    const appt: any = { id: 'ap1', status: 'CHECKED_IN', patient_id: 'pat1', service_type: 'clinic', slot_start: new Date(SLOT), state_history: history, save: jest.fn(), toObject: () => ({}) };
    const svc: any = Object.create(AppointmentsService.prototype);
    svc.apptModel = { findOne: async () => appt };
    svc.assertAppointmentAccess = async () => undefined;
    svc.engine = { apply: async (a: any) => a.mutate() };
    svc.events = { emit: jest.fn() };
    await svc.transition('ap1', 'IN_PROGRESS', { id: 'doc1', role: 'doctor' });
    const call = svc.events.emit.mock.calls.find((c: any[]) => c[0] === 'appointment.in_progress');
    expect(call[1]).toMatchObject({ id: 'ap1', patient_id: 'pat1', service_type: 'clinic' });
    expect(new Date(call[1].checked_in_at).toISOString()).toBe(at(-5));
    expect(call[1].started_at).toBeTruthy();
  });
});
