import { BadRequestException } from '@nestjs/common';
import { LabsService } from './labs.service';

const hours = (n: number) => new Date(Date.now() + n * 3_600_000).toISOString();
function build(state: string) {
  const b: any = { id: 'l1', state, patient_id: 'p1', provider_account_id: 'prov-1', state_history: [], scheduled_at: new Date(), save: jest.fn(async () => b) };
  const svc: any = Object.create(LabsService.prototype);
  svc.bkgModel = { findOne: async () => b };
  svc.assertPatientOrAssignedProvider = () => undefined;
  svc.events = { emit: jest.fn() };
  return { svc, b };
}

describe('lab reschedule', () => {
  it('moves a booking that is still to be done, and tells the other side', async () => {
    const { svc, b } = build('CONFIRMED');
    await svc.rescheduleBooking('l1', { id: 'prov-1', role: 'lab' }, { new_date: hours(48), reason: 'busy' });
    expect(b.save).toHaveBeenCalled();
    expect(svc.events.emit).toHaveBeenCalledWith('booking.rescheduled', expect.objectContaining({ entity_type: 'lab_booking', entity_id: 'l1', actor_role: 'lab', patient_account_id: 'p1' }));
  });
  it.each(['CANCELLED', 'REPORTED', 'SAMPLE_COLLECTED', 'PROCESSING'])('refuses a %s booking (it was moved before)', async (state) => {
    const { svc, b } = build(state);
    await expect(svc.rescheduleBooking('l1', { id: 'prov-1', role: 'lab' }, { new_date: hours(48) })).rejects.toBeInstanceOf(BadRequestException);
    expect(b.save).not.toHaveBeenCalled();
  });
  it('refuses a time in the past or one that is not a date', async () => {
    const { svc, b } = build('CONFIRMED');
    await expect(svc.rescheduleBooking('l1', { id: 'prov-1', role: 'lab' }, { new_date: hours(-2) })).rejects.toThrow('slot_expired');
    await expect(svc.rescheduleBooking('l1', { id: 'prov-1', role: 'lab' }, { new_date: 'soon' })).rejects.toThrow('slot_expired');
    expect(b.save).not.toHaveBeenCalled();
  });
});
