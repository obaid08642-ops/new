/**
 * 15.9 — providers use Asia/Riyadh: the scheduling engine must resolve the
 * day-of-week and wall-clock minutes of a booking instant in Riyadh, never
 * via the process-local timezone (containers run UTC; laptops run anything).
 *
 * Reference: 2027-02-14 is a Sunday. 06:00Z == 09:00 Riyadh (inside a
 * 09:00–17:00 slot); 05:30Z == 08:30 Riyadh (outside); 21:30Z == Monday
 * 00:30 Riyadh (a different Riyadh day than the UTC date).
 *
 * NOTE on proving this: the dev machine runs Asia/Riyadh, where the old
 * getDay()/getHours() code accidentally agrees. The red proof below was
 * produced with TZ=UTC (container reality) — see P15_NOTES.md.
 */
import { SchedulingEngineService } from './scheduling-engine.service';

const SUNDAY_SLOT = {
  day_of_week: 0, start_time: '09:00', end_time: '17:00', capacity_per_slot: 1, active: true,
};

const svc = () => new SchedulingEngineService(
  // Faithful to the collection: the weekly slot exists for Sunday (dow 0) only.
  { findOne: jest.fn((q: any) => ({ lean: jest.fn(async () => (q?.day_of_week === 0 ? { ...SUNDAY_SLOT } : null)) })) } as any,
  { countDocuments: jest.fn(async () => 0) } as any,
  {} as any,
);

describe('15.9 scheduling engine resolves time in Asia/Riyadh (mocked repos)', () => {
  it('takes a booking at 06:00Z on a Sunday (09:00 Riyadh, slot open)', async () => {
    await expect(svc().checkAvailability('acc-1', new Date('2027-02-14T06:00:00Z'), 30)).resolves.toEqual(
      expect.objectContaining({ available: true }),
    );
  });

  it('refuses 05:30Z on a Sunday (08:30 Riyadh, before opening)', async () => {
    await expect(svc().checkAvailability('acc-1', new Date('2027-02-14T05:30:00Z'), 30)).resolves.toEqual(
      expect.objectContaining({ available: false, reason: 'outside_working_hours' }),
    );
  });

  it('treats 21:30Z Sunday as Monday in Riyadh (no Monday slot)', async () => {
    await expect(svc().checkAvailability('acc-1', new Date('2027-02-14T21:30:00Z'), 30)).resolves.toEqual(
      expect.objectContaining({ available: false, reason: 'no_weekly_slot_for_day', day_of_week: 1 }),
    );
  });

  it('isOnDuty follows Riyadh wall-clock, not UTC', async () => {
    const s = svc();
    await expect(s.isOnDuty('acc-1', new Date('2027-02-14T06:00:00Z'))).resolves.toBe(true);
    await expect(s.isOnDuty('acc-1', new Date('2027-02-14T05:30:00Z'))).resolves.toBe(false);
  });
});
