/** The nursing visit steps and the radiology preparation reminders reach the patient: their events have a listener
 *  and every notification key has its texts (the old 'patient.notify' / 'doctor.notify' events had no listener). */
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NursingController } from './home-care.controller';
import { NotificationsService } from '../notifications/notifications.service';
import { DICTIONARY } from '../i18n/i18n.service';
import { RadiologyReminderCron } from '../radiology/cron/radiology-reminder.cron';

const notifications = () => {
  const svc: any = Object.create(NotificationsService.prototype);
  svc.create = jest.fn(async () => undefined);
  svc.model = { db: { model: () => ({ findOne: () => ({ lean: async () => null }) }) } };
  return svc;
};
const hasTexts = (key: string) => ['ar', 'en', 'ur'].every((l) => Boolean((DICTIONARY[key] as any)?.[l]));

describe('nursing visit steps notify the patient', () => {
  const visit = (state: string) => {
    const b: any = { id: 'bk-1', patient_id: 'pat-1', provider_id: 'prov-1', state, timers: {}, state_history: [], referring_doctor_id: 'doc-1', markModified: jest.fn(), save: jest.fn(async () => b) };
    return b;
  };
  const controllerFor = (b: any) => {
    const events = new EventEmitter2();
    const emitted: any[] = [];
    events.onAny((name: any, payload: any) => emitted.push([name, payload]));
    const c: any = Object.create(NursingController.prototype);
    c.events = events;
    c.findVisit = jest.fn(async () => b);
    c.assertProviderMutation = jest.fn();
    return { c, emitted };
  };

  it('completing the visit emits homecare.booking_state_changed (patient) and homecare.report_for_doctor', async () => {
    const b = visit('CARE_IN_PROGRESS');
    const { c, emitted } = controllerFor(b);
    await c.completeVisit('bk-1', { clinical_notes: 'ok', signature_base64: 'data:image/png;base64,iVBORw0KGgo=' }, { id: 'nurse' });
    expect(emitted).toContainEqual(['homecare.booking_state_changed', expect.objectContaining({ booking_id: 'bk-1', patient_id: 'pat-1', state: 'COMPLETED' })]);
    expect(emitted).toContainEqual(['homecare.report_for_doctor', { booking_id: 'bk-1', doctor_id: 'doc-1' }]);
    expect(emitted.map(([n]) => n)).not.toContain('patient.notify');
  });

  it('every visit state the field screen reaches has a patient notification with texts', async () => {
    const svc = notifications();
    for (const state of ['IN_TRANSIT', 'ARRIVED', 'CARE_IN_PROGRESS', 'NO_SHOW', 'ESCALATED_EMERGENCY', 'COMPLETED']) {
      svc.create.mockClear();
      await svc.onHomecareState({ booking_id: 'bk-1', patient_id: 'pat-1', state });
      const [arg] = svc.create.mock.calls[0];
      expect(arg.user_id).toBe('pat-1');
      expect(hasTexts(arg.title_key) && hasTexts(arg.body_key)).toBe(true);
    }
    await svc.onHomecareReportForDoctor({ booking_id: 'bk-1', doctor_id: 'doc-1' });
    const [arg] = svc.create.mock.calls.at(-1);
    expect(arg.user_id).toBe('doc-1');
    expect(hasTexts(arg.title_key) && hasTexts(arg.body_key)).toBe(true);
  });
});

describe('radiology preparation reminders notify the patient', () => {
  it('the cron emits radiology.prep_reminder and the listener sends the keyed reminder', async () => {
    const at = (h: number) => ({ id: `rb-${h}`, patient_id: 'pat-uuid-1', scheduled_at: new Date(Date.now() + h * 3600 * 1000 + 60 * 1000) });
    const events = new EventEmitter2();
    const emitted: any[] = [];
    events.onAny((name: any, payload: any) => emitted.push([name, payload]));
    const cron: any = new RadiologyReminderCron({ find: () => ({ populate: async () => [at(24), at(12), at(2), at(5)] }) } as any, events);
    await cron.handlePreparationReminders();
    expect(emitted.map(([n, p]) => `${n}:${p.hours}`)).toEqual(['radiology.prep_reminder:24', 'radiology.prep_reminder:12', 'radiology.prep_reminder:2']);
    const svc = notifications();
    for (const [, p] of emitted) await svc.onRadPrepReminder(p);
    expect(svc.create).toHaveBeenCalledTimes(3);
    for (const [arg] of svc.create.mock.calls) {
      expect(arg.user_id).toBe('pat-uuid-1');
      expect(hasTexts(arg.title_key) && hasTexts(arg.body_key)).toBe(true);
    }
  });
});
