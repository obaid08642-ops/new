import { AppointmentsService } from './appointments.service';
import { UserRole } from '../../common/enums';

// B-11 review: the preview uses exactly the cancel rules (no-show 0%, doctor penalty kept) and changes nothing.
function make(appt: any) {
  const doc: any = { ...appt, save: jest.fn() };
  const apptModel: any = { findOne: jest.fn(async () => doc) };
  const svc: any = new AppointmentsService(apptModel, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any);
  svc.assertAppointmentAccess = jest.fn(async () => undefined);
  return { svc, doc };
}
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe('refund preview (B-11)', () => {
  // D-26 (owner): the full-refund window is 2 h (was 24 h).
  it('patient > 2h: 100% to source; < 2h: 50% to wallet; nothing saved', async () => {
    const far = make({ id: 'a', patient_id: 'p', slot_start: inHours(48), total_price: 200 });
    await expect(far.svc.previewRefund('a', { id: 'p', role: UserRole.PATIENT })).resolves.toEqual({ refund_percentage: 100, refund_destination: 'source', penalty_amount: 0, estimated_amount: 200 });
    const near = make({ id: 'a', patient_id: 'p', slot_start: inHours(1), total_price: 200 });
    await expect(near.svc.previewRefund('a', { id: 'p', role: UserRole.PATIENT })).resolves.toMatchObject({ refund_percentage: 50, refund_destination: 'wallet', estimated_amount: 100 });
    expect(far.doc.save).not.toHaveBeenCalled();
  });

  it('cancel keeps the no-show rule and the doctor penalty', async () => {
    const noShow = make({ id: 'a', patient_id: 'p', slot_start: inHours(48), total_price: 200 });
    noShow.svc.transition = jest.fn(async () => ({}));
    await noShow.svc.cancel('a', { id: 'p', role: UserRole.PATIENT }, 'no_show');
    expect(noShow.doc.refund_percentage).toBe(0);
    const byDoctor = make({ id: 'a', patient_id: 'p', doctor_user_id: 'd', slot_start: inHours(48), total_price: 200 });
    byDoctor.svc.transition = jest.fn(async () => ({}));
    await byDoctor.svc.cancel('a', { id: 'd', role: UserRole.DOCTOR }, 'sick');
    expect([byDoctor.doc.refund_percentage, byDoctor.doc.doctor_penalty]).toEqual([100, 50]);
  });
});
