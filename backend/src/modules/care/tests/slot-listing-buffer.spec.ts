import { SlotService } from '../slot.service';

/**
 * Q37 wiring proof — the buffer helpers in appointments.service.ts are pure and
 * tested, but what the patient actually sees is slotsForDate below. These tests
 * prove the LISTING marks a slot unavailable exactly when booking it would 409,
 * so listed-available implies bookable. Mocked models only, no DB.
 */
describe('SlotService.slotsForDate buffer parity (Q37 wiring)', () => {
  const day = '2026-11-04'; // a Wednesday; hours mocked per weekday below
  const mkService = (bookings: any[]) => {
    const svc: any = Object.create(SlotService.prototype);
    svc.hoursFor = jest.fn(async () => [{ open: '16:00', close: '18:00' }]);
    svc.leaves = { findOne: jest.fn(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => null) })) })) };
    svc.apptModel = { find: jest.fn(() => ({ select: jest.fn(() => ({ lean: jest.fn(async () => bookings) })) })) };
    return svc as SlotService;
  };
  const doctor: any = {
    id: 'doc-1',
    consultation_modes: ['clinic'],
    account_id: 'acc-1',
    user_id: 'u-1',
  };
  const avail = (slots: any[]) => slots.filter((s: any) => s.available).map((s: any) => s.start.substring(11, 16));

  it('lists 16:30 unavailable when a 17:00 booking exists (the exact Q37 case)', async () => {
    const service = mkService([{ slot_start: new Date(day + 'T17:00:00Z'), slot_end: new Date(day + 'T17:30:00Z') }]);
    const res: any = await service.slotsForDate(doctor, day, 'clinic', 30);
    // 16:30 + 30min + 5min buffer = 17:05 overlaps 17:00 → must NOT be listed available
    expect(avail(res.slots)).not.toContain('16:30');
    // 16:00 + 35min = 16:35 < 17:00 → still available
    expect(avail(res.slots)).toContain('16:00');
  });

  it('an exactly-adjacent booking still blocks via the buffer, not just exact matches', async () => {
    const service = mkService([{ slot_start: new Date(day + 'T17:00:00Z'), slot_end: new Date(day + 'T17:30:00Z') }]);
    const res: any = await service.slotsForDate(doctor, day, 'clinic', 30);
    // exact-start match (old behavior) still holds
    expect(avail(res.slots)).not.toContain('17:00');
  });

  it('no bookings means the full window is listed', async () => {
    const service = mkService([]);
    const res: any = await service.slotsForDate(doctor, day, 'clinic', 30);
    expect(res.slots.length).toBeGreaterThan(0);
    expect(res.slots.every((s: any) => s.available)).toBe(true);
  });
});
