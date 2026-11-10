import { AppointmentsService } from './appointments.service';
import { UserRole } from '../../common/enums';

// B-11 review: the preview uses exactly the cancel rules (no-show 0%, doctor penalty kept) and changes nothing.
function make(appt: any) {
  const doc: any = { ...appt, save: jest.fn() };
  const apptModel: any = { findOne: jest.fn(async () => doc), updateOne: jest.fn(async (_q: any, u: any) => { Object.assign(doc, u.$set); }) };
  const svc: any = new AppointmentsService(apptModel, {} as any, {} as any, { emit: jest.fn() } as any, {} as any, {} as any);
  svc.assertAppointmentAccess = jest.fn(async () => undefined);
  return { svc, doc };
}
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

describe('refund preview (B-11)', () => {
  // D-26 (owner): the full-refund window is 2 h (was 24 h).
  it('patient > 2h: 100% to source; < 2h: 50%, still to the original payment; nothing saved', async () => {
    const far = make({ id: 'a', patient_id: 'p', slot_start: inHours(48), total_price: 200 });
    await expect(far.svc.previewRefund('a', { id: 'p', role: UserRole.PATIENT })).resolves.toEqual({ refund_percentage: 100, refund_destination: 'source', penalty_amount: 0, estimated_amount: 200, free_reschedule: { available: true, late: false, within_days: 14 } });
    const near = make({ id: 'a', patient_id: 'p', slot_start: inHours(1), total_price: 200 });
    await expect(near.svc.previewRefund('a', { id: 'p', role: UserRole.PATIENT })).resolves.toMatchObject({ refund_percentage: 50, refund_destination: 'source', estimated_amount: 100 });
    expect(near.doc.save).not.toHaveBeenCalled();
    // inside the last 2 hours the cancel gives the late refund, and the patient can instead use the one free reschedule (within 14 days)
    await expect(near.svc.previewRefund('a', { id: 'p', role: UserRole.PATIENT })).resolves.toMatchObject({ free_reschedule: { available: true, late: true, within_days: 14 } });
    // only the patient side is offered it
    await expect(near.svc.previewRefund('a', { id: 'd', role: UserRole.DOCTOR })).resolves.toMatchObject({ free_reschedule: { available: false, late: true } });
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

  // The booking made by the late free reschedule must not become a way round the late percentage.
  describe('a booking made by the late free reschedule', () => {
    const lateBooking = (extra: any = {}) => ({ id: 'b', patient_id: 'p', doctor_user_id: 'd', total_price: 200, late_free_reschedule: true, rescheduled_from_id: 'a', ...extra });

    it('a patient cancelling it 20 hours ahead gets the LATE percentage (50 %), not 100 %; the preview shows the same', async () => {
      const m = make(lateBooking({ slot_start: inHours(20) }));
      m.svc.transition = jest.fn(async () => ({}));
      await expect(m.svc.previewRefund('b', { id: 'p', role: UserRole.PATIENT })).resolves.toMatchObject({ refund_percentage: 50, estimated_amount: 100, free_reschedule: { available: false } });
      await m.svc.cancel('b', { id: 'p', role: UserRole.PATIENT }, 'changed my mind');
      expect(m.doc.refund_percentage).toBe(50);
      expect(m.doc.refund_destination).toBe('source');
    });
    it('an ordinary booking cancelled 20 hours ahead is still 100 % (the cap is only for the rescheduled-late one)', async () => {
      const m = make(lateBooking({ late_free_reschedule: undefined, slot_start: inHours(20) }));
      m.svc.transition = jest.fn(async () => ({}));
      await m.svc.cancel('b', { id: 'p', role: UserRole.PATIENT }, 'changed my mind');
      expect(m.doc.refund_percentage).toBe(100);
    });
    it('the provider cancelling it stays 100 % (with the doctor penalty), and the provider no-show stays 100 %', async () => {
      const m = make(lateBooking({ slot_start: inHours(20) }));
      m.svc.transition = jest.fn(async () => ({}));
      await m.svc.cancel('b', { id: 'd', role: UserRole.DOCTOR }, 'emergency at the clinic');
      expect([m.doc.refund_percentage, m.doc.doctor_penalty]).toEqual([100, 50]);
      const ns = make(lateBooking({ slot_start: inHours(-1) }));
      ns.svc.transition = jest.fn(async () => ({}));
      await ns.svc.cancel('b', { id: 'p', role: UserRole.PATIENT }, 'provider_no_show', false, true);
      expect(ns.doc.refund_percentage).toBe(100);
    });
    it('a patient no-show on it stays 0 %', async () => {
      const m = make(lateBooking({ slot_start: inHours(20) }));
      m.svc.transition = jest.fn(async () => ({}));
      await m.svc.cancel('b', { id: 'p', role: UserRole.PATIENT }, 'no_show');
      expect(m.doc.refund_percentage).toBe(0);
    });
    it('it has no second free reschedule: the patient is refused', async () => {
      const m = make(lateBooking({ slot_start: inHours(30), status: 'CONFIRMED' }));
      m.svc.getRefundPolicy = async () => ({ consultation: { free_reschedules: 3, free_reschedule_min_hours: 2, full_refund_min_hours: 2, late_refund_percent: 50 } });
      await expect(m.svc.reschedule('b', { id: 'p', role: UserRole.PATIENT }, { slot_start: inHours(50) })).rejects.toThrow('no_free_reschedules_left');
    });
  });
});

