import { AppointmentsService } from './appointments.service';
import { UserRole } from '../../common/enums';

// Lead order a (2026-11-13): a late patient cancel when the doctor has no free slot within 14 days = 100% to the card; a provider cancel of
// the rescheduled visit = 100%. Any doubt about the schedule keeps the normal late percentage.
const inHours = (h: number) => new Date(Date.now() + h * 3_600_000).toISOString();

function make(appt: any, slotService: any) {
  const doc: any = { ...appt, save: jest.fn() };
  const apptModel: any = { findOne: jest.fn(async () => doc), updateOne: jest.fn(async (_q: any, u: any) => { Object.assign(doc, u.$set); }) };
  const providerModel: any = { findOne: jest.fn(() => ({ lean: async () => ({ id: 'doc1', consultation_modes: ['clinic'] }) })) };
  const svc: any = new AppointmentsService(apptModel, providerModel, {} as any, { emit: jest.fn() } as any, {} as any, {} as any, undefined, undefined, undefined, undefined, slotService);
  svc.assertAppointmentAccess = jest.fn(async () => undefined);
  svc.transition = jest.fn(async () => ({}));
  return { svc, doc };
}
const lateAppt = (extra: any = {}) => ({ id: 'a', patient_id: 'p', doctor_id: 'doc1', doctor_user_id: 'd', service_type: 'clinic', total_price: 200, slot_start: inHours(1), ...extra });
const patient = { id: 'p', role: UserRole.PATIENT };

describe('late cancel when the doctor has no free slot within 14 days', () => {
  it('no available slot in 15 days: 100% to the card, in the preview and in the cancel', async () => {
    const slotService = { slotsForDate: jest.fn(async (_d: any, date: string) => ({ date, slots: [{ start: inHours(30), available: false }] })) };
    const m = make(lateAppt(), slotService);
    await expect(m.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 100, refund_destination: 'source', estimated_amount: 200 });
    await m.svc.cancel('a', patient, 'no time');
    expect(m.doc.refund_percentage).toBe(100);
    expect(m.doc.refund_destination).toBe('source');
    expect(slotService.slotsForDate).toHaveBeenCalledTimes(30);
  });

  it('one free slot inside the window keeps the late 50%', async () => {
    const slotService = { slotsForDate: jest.fn(async (_d: any, date: string) => ({ date, slots: [{ start: inHours(72), available: true }] })) };
    const m = make(lateAppt(), slotService);
    await expect(m.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 50, estimated_amount: 100 });
  });

  it('a free slot beyond 14 days does not count (no slot inside the window = 100%)', async () => {
    const slotService = { slotsForDate: jest.fn(async (_d: any, date: string) => ({ date, slots: [{ start: inHours(24 * 20), available: true }] })) };
    const m = make(lateAppt(), slotService);
    await expect(m.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 100 });
  });

  it('a lookup error or a missing slot service keeps 50% (never a full refund by accident)', async () => {
    const broken = make(lateAppt(), { slotsForDate: jest.fn(async () => { throw new Error('db down'); }) });
    await expect(broken.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 50 });
    const none = make(lateAppt(), undefined);
    await expect(none.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 50 });
  });

  it('a cancel 48 hours ahead is 100% without any slot lookup', async () => {
    const slotService = { slotsForDate: jest.fn() };
    const m = make(lateAppt({ slot_start: inHours(48) }), slotService);
    await expect(m.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 100 });
    expect(slotService.slotsForDate).not.toHaveBeenCalled();
  });

  it('the visit made by the late free reschedule stays 0% inside the last 2 hours even with no free slot (no way round)', async () => {
    const slotService = { slotsForDate: jest.fn(async (_d: any, date: string) => ({ date, slots: [] })) };
    const m = make(lateAppt({ late_free_reschedule: true, rescheduled_from_id: 'x' }), slotService);
    await expect(m.svc.previewRefund('a', patient)).resolves.toMatchObject({ refund_percentage: 0 });
  });

  it('the provider cancelling the rescheduled visit refunds 100% to the card', async () => {
    const m = make(lateAppt({ late_free_reschedule: true, rescheduled_from_id: 'x' }), { slotsForDate: jest.fn() });
    await m.svc.cancel('a', { id: 'd', role: UserRole.DOCTOR }, 'sick');
    expect(m.doc.refund_percentage).toBe(100);
    expect(m.doc.refund_destination).toBe('source');
  });
});
