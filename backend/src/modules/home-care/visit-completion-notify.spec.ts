import { HomeCareCompatController } from './home-care-compat.module';
import { NursingController } from './home-care.controller';
import { NotificationsService } from '../notifications/notifications.service';
import { NursingBookingState } from '../../schemas/home-care.schema';

/**
 * provider-journeys#33: finishing a visit tells the patient, whichever route the nurse used:
 * POST /home-care/bookings/:id/visit-report (with result files) and POST /nursing/visits/:id/complete.
 * Both emit homecare.booking_state_changed with the patient id; NotificationsService turns it into
 * notif.homecare_completed for that patient.
 */
describe('visit completion notifies the patient', () => {
  const nurse = { id: 'nurse-1', role: 'nurse', provider_type: 'nursing' };

  it('visit-report completion emits the completed state for the patient', async () => {
    const booking: any = { id: 'visit-1', patient_id: 'patient-1', provider_id: 'nurse-1', state: 'CARE_IN_PROGRESS', state_history: [], save: jest.fn(), markModified: jest.fn() };
    const emitter: any = { emit: jest.fn() };
    const controller: any = new HomeCareCompatController({ findOne: jest.fn(async () => booking) } as any, {} as any, {} as any, {} as any, emitter, {} as any);
    await controller.visitReport(nurse, 'visit-1', { complete: true, clinical_notes: 'done', signature: 'data:image/png;base64,AAAA' });
    expect(emitter.emit).toHaveBeenCalledWith('homecare.booking_state_changed', expect.objectContaining({ booking_id: 'visit-1', patient_id: 'patient-1', state: 'COMPLETED' }));
  });

  it('/nursing/visits/:id/complete emits the same event (patient.notify had no listener)', async () => {
    const engine = { apply: jest.fn(async (a: any) => a.mutate()) };
    const booking: any = { toObject() { return this; }, id: 'visit-2', patient_id: 'patient-2', provider_id: 'nurse-1', state: NursingBookingState.CARE_IN_PROGRESS, timers: {}, state_history: [], save: jest.fn(), markModified: jest.fn() };
    const events: any = { emit: jest.fn() };
    const controller = new NursingController({ findOne: jest.fn().mockResolvedValue(booking) } as any, {} as any, {} as any, {} as any, events, engine as any, {} as any);
    await controller.completeVisit('visit-2', { clinical_notes: 'done', signature_base64: 'data:image/png;base64,AAAA' } as any, nurse);
    expect(events.emit).toHaveBeenCalledWith('homecare.booking_state_changed', expect.objectContaining({ booking_id: 'visit-2', patient_id: 'patient-2', state: NursingBookingState.COMPLETED }));
    expect(events.emit).not.toHaveBeenCalledWith('patient.notify', expect.anything());
    // completion goes through the workflow engine, once: service.completed is what credits the nurse's earning
    expect(engine.apply).toHaveBeenCalledTimes(1);
    expect(engine.apply).toHaveBeenCalledWith(expect.objectContaining({ kind: 'nursing', from_domain: NursingBookingState.CARE_IN_PROGRESS, to_domain: NursingBookingState.COMPLETED, entity_id: 'visit-2' }));
  });

  it('the completed state becomes notif.homecare_completed for the patient', async () => {
    const create = jest.fn();
    await NotificationsService.prototype.onHomecareState.call({ create }, { booking_id: 'visit-1', patient_id: 'patient-1', state: 'COMPLETED' });
    expect(create).toHaveBeenCalledWith(expect.objectContaining({
      user_id: 'patient-1', title_key: 'notif.homecare_completed.title', body_key: 'notif.homecare_completed.body',
      action: { route: '/nursing/tracking/visit-1' },
    }));
  });
});
