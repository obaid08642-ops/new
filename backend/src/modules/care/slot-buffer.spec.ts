import { SlotService } from './slot.service';

// Q37: the slot list applies the same 5-minute buffer the booking does, so the slot right before a booked one is not offered.
describe('slot list buffer', () => {
  it('marks the booked slot and the one just before it unavailable, the one after stays free', async () => {
    const day = new Date(Date.now() + 3 * 24 * 3600_000).toISOString().slice(0, 10);
    const svc: any = Object.create(SlotService.prototype);
    svc.hoursFor = async () => [{ open: '09:00', close: '12:00' }];
    svc.apptModel = { find: () => ({ select: () => ({ lean: async () => [] }) }) };
    svc.leaves = { find: () => ({ select: () => ({ lean: async () => [] }) }) };
    const booked = new Date(`${day}T10:00:00.000Z`);
    const r = await svc.slotsForDate({ id: 'd1', account_id: 'a1', consultation_modes: ['clinic'] }, day, 'clinic', 30, { approved: [], leaves: [], booked: [booked] });
    const by = (hhmm: string) => r.slots.find((s: any) => s.label === hhmm)?.available;
    expect(by('09:30')).toBe(false);  // ends at 10:00, the buffer reaches into the booking
    expect(by('10:00')).toBe(false);
    expect(by('10:30')).toBe(true);
    expect(by('09:00')).toBe(true);
  });
});
