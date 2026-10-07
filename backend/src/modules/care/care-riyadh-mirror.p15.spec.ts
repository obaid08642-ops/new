/**
 * F4 — UTC-anchored list mirror (mocked repositories, no mongod here).
 *
 * CareService.loadAvailabilityBatch derived its scan window from the UTC
 * calendar day while SlotService.nextAvailable anchors on Riyadh: near Riyadh
 * midnight (e.g. 21:30Z = 00:30 Riyadh next day) the batched doctor list
 * scanned the wrong days. The fix anchors the mirror on riyadhParts, and
 * firstAvailableOnDay honours duration_minutes instead of a hardcoded 30-min
 * step (mirroring SlotService.slotsForDate, which steps by duration_minutes).
 *
 * Reverting the anchor to getUTC* makes the midnight test red (dayStrs[0]
 * comes back '2026-06-01'); ignoring durationMinutes makes the 60-min test
 * red (09:00 fits a 30-min step but not a 60-min appointment in a 45-min
 * window).
 */
import { CareService, firstAvailableOnDay } from './care.service';
import type { AvailabilityBatch } from './care.service';

function svcWith(captured: Array<{ name: string; q: any }>) {
  const providerModel: any = {
    db: {
      collection: (name: string) => ({
        find: (q: any) => {
          captured.push({ name, q });
          return { toArray: async () => [] };
        },
      }),
    },
  };
  return new CareService(providerModel, {} as any, {} as any, {} as any);
}

function batchFor(dateStr: string, bookedIso: string[] = []): AvailabilityBatch {
  const bookedByDoctorDay = new Map<string, Set<string>>();
  if (bookedIso.length) bookedByDoctorDay.set(`doc-1|${dateStr}`, new Set(bookedIso));
  return {
    now: Date.UTC(2030, 4, 1),
    windowStart: new Date(`${dateStr}T00:00:00.000Z`),
    windowEnd: new Date(`${dateStr}T00:00:00.000Z`),
    dayStrs: [dateStr],
    bookedByDoctorDay,
    leaves: [],
    schedByAccount: new Map(),
  };
}

const doctor = {
  id: 'doc-1',
  consultation_modes: ['clinic'],
  working_hours: [{ day: 'all', open: '09:00', close: '09:45' }],
};

describe('F4 Riyadh-anchored availability mirror (mocked)', () => {
  it('scans the Riyadh calendar day near Riyadh midnight, not the UTC day', async () => {
    const captured: Array<{ name: string; q: any }> = [];
    const svc = svcWith(captured);
    const realNow = Date.now;
    // 2026-06-01T21:30Z = 2026-06-02T00:30 in Riyadh (UTC+3, no DST).
    Date.now = () => Date.UTC(2026, 5, 1, 21, 30, 0);
    try {
      const batch = await (svc as any).loadAvailabilityBatch(
        [{ id: 'doc-1', account_id: 'a1', user_id: 'u1' }],
        14,
      );
      expect(batch.dayStrs[0]).toBe('2026-06-02');
      expect(batch.dayStrs).toHaveLength(14);
      const apptQ = captured.find((c) => c.name === 'appointments')!.q;
      expect(new Date(apptQ.slot_start.$gte).toISOString()).toBe('2026-06-02T00:00:00.000Z');
    } finally {
      Date.now = realNow;
    }
  });

  it('firstAvailableOnDay steps by duration_minutes, not a hardcoded 30', () => {
    const dateStr = '2030-06-02';
    expect(firstAvailableOnDay(doctor, batchFor(dateStr), dateStr, 30)).toBe(
      '2030-06-02T09:00:00.000Z',
    );
    // A 60-min appointment does not fit a 09:00–09:45 window at all.
    expect(firstAvailableOnDay(doctor, batchFor(dateStr), dateStr, 60)).toBeNull();
  });

  it('duration-aware stepping skips booked starts', () => {
    const dateStr = '2030-06-02';
    const wide = { ...doctor, working_hours: [{ day: 'all', open: '09:00', close: '10:30' }] };
    const batch = batchFor(dateStr, ['2030-06-02T09:00:00.000Z']);
    expect(firstAvailableOnDay(wide, batch, dateStr, 30)).toBe('2030-06-02T09:30:00.000Z');
  });
});
