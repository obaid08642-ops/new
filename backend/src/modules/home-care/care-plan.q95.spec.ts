// Q95 (Round 11), same pattern as medical reports: any doctor could create a
// care plan for any patient. A doctor needs an appointment with that patient;
// a nurse needs a home-care booking with them (unchanged).
import { ForbiddenException } from '@nestjs/common';
import { HomeCareCompatController } from './home-care-compat.module';

describe('POST /home-care/care-plans/:patientId needs a care relationship (Q95)', () => {
  function controller(appointmentOwner: string | null) {
    const bookings = { findOne: jest.fn(async (q: { patient_id: string; provider_id: string }) => (q.provider_id === 'nurse-1' && q.patient_id === 'pat-P' ? { id: 'b1' } : null)) };
    const carePlans = { create: jest.fn(async (d: Record<string, unknown>) => d) };
    const conn = {
      collection: jest.fn(() => ({
        findOne: jest.fn(async (q: { patient_id: { $eq: string }; doctor_user_id: { $eq: string } }) =>
          (appointmentOwner && q.doctor_user_id.$eq === appointmentOwner && q.patient_id.$eq === 'pat-P' ? { id: 'appt-1' } : null)),
      })),
    };
    const ctrl = new HomeCareCompatController(bookings as never, {} as never, {} as never, carePlans as never, undefined, conn as never);
    return { ctrl, carePlans };
  }

  it('an unrelated doctor is refused', async () => {
    const { ctrl, carePlans } = controller('doc-treating');
    await expect(ctrl.createCarePlan({ id: 'doc-stranger', role: 'doctor' }, 'pat-P', { title: 'plan' } as never)).rejects.toBeInstanceOf(ForbiddenException);
    expect(carePlans.create).not.toHaveBeenCalled();
  });

  it('the treating doctor and the assigned nurse can create one', async () => {
    const { ctrl, carePlans } = controller('doc-treating');
    await ctrl.createCarePlan({ id: 'doc-treating', role: 'doctor' }, 'pat-P', { title: 'plan' } as never);
    await ctrl.createCarePlan({ id: 'nurse-1', role: 'nurse' }, 'pat-P', { title: 'plan' } as never);
    expect(carePlans.create).toHaveBeenCalledTimes(2);
  });
});
