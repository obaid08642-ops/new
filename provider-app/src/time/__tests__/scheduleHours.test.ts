/**
 * P15.9 — Ramadan / special-hours display resolves against the
 * server-anchored Riyadh day, not the device clock.
 *
 * Each clock test pins "device now" explicitly (like `serverTime.test.ts`):
 * the anchor stores `offset = serverMs - deviceMs`, so when the anchor
 * recording and the later read use the same skewed device clock the error
 * cancels out and today's special entry is identical at ±1 day. A revert to
 * device-local date getters moves the Riyadh-midnight-straddling case to the
 * wrong day and goes red.
 */
import {
  findTodaySpecialHours,
  hasRamadanHours,
  isSpecialDate,
  riyadhYmd,
} from '../scheduleHours';
import { noteServerDate, resetServerTimeForTests, serverNowMs } from '../serverTime';

const DAY = 86_400_000;
// 2026-10-05T21:30:00Z is 2026-10-06 00:30 in Riyadh (UTC+3, no DST): the
// UTC date is still Oct 5, so device-local getters answer the wrong day.
const SERVER_MS = Date.parse('2026-10-05T21:30:00.000Z');
const SERVER_HEADER = 'Mon, 05 Oct 2026 21:30:00 GMT';
const RIYADH_TODAY = '2026-10-06';

const SPECIAL = [
  { date: '2026-10-06', closed: true, reason: 'holiday' },
  { date: '2026-10-07', open: '12:00', close: '16:00', reason: 'catch-up clinic' },
];

beforeEach(() => {
  resetServerTimeForTests();
});

describe('riyadhYmd', () => {
  it('resolves the Riyadh day, not the UTC/device day', () => {
    expect(riyadhYmd(SERVER_MS)).toBe(RIYADH_TODAY);
  });

  it('returns null for a non-finite instant', () => {
    expect(riyadhYmd(Number.NaN)).toBeNull();
  });
});

describe('findTodaySpecialHours with device clock ±1 day', () => {
  it.each([[-DAY, 'a day behind'], [0, 'exact'], [DAY, 'a day ahead']])(
    'resolves the same entry when the device clock is %s',
    (skew) => {
      const deviceNow = SERVER_MS + skew;
      expect(noteServerDate(SERVER_HEADER, deviceNow)).toBe(true);
      // The anchored read `serverNowMs(deviceNow)` corrects the skewed device
      // clock (same pattern as `serverTime.test.ts` / `providerZone.test.ts`).
      expect(findTodaySpecialHours(SPECIAL, serverNowMs(deviceNow))).toEqual({
        date: '2026-10-06',
        closed: true,
        reason: 'holiday',
      });
      // …while the raw device clock would decide wrong in the skewed cases
      // (−1 day: no entry; +1 day: tomorrow's entry leaks in as today's).
      expect(findTodaySpecialHours(SPECIAL, deviceNow)?.date ?? null).toBe(
        skew === 0 ? '2026-10-06' : skew < 0 ? null : '2026-10-07',
      );
      expect(serverNowMs(deviceNow)).toBe(SERVER_MS);
    },
  );

  it('returns null when nothing matches today', () => {
    expect(findTodaySpecialHours([{ date: '2026-12-25', closed: true }], SERVER_MS)).toBeNull();
  });

  it('ignores malformed lists and entries instead of rendering garbage', () => {
    expect(findTodaySpecialHours(null, SERVER_MS)).toBeNull();
    expect(findTodaySpecialHours('2026-10-06', SERVER_MS)).toBeNull();
    expect(findTodaySpecialHours([{ reason: 'no date' }], SERVER_MS)).toBeNull();
    expect(findTodaySpecialHours([null, 42, 'x'], SERVER_MS)).toBeNull();
  });
});

describe('shape guards', () => {
  it('isSpecialDate accepts only exact YYYY-MM-DD days', () => {
    expect(isSpecialDate('2026-10-06')).toBe(true);
    expect(isSpecialDate('06/10/2026')).toBe(false);
    expect(isSpecialDate('tomorrow')).toBe(false);
    expect(isSpecialDate(null)).toBe(false);
  });

  it('hasRamadanHours is true only for a non-empty configured list', () => {
    expect(hasRamadanHours([{ day: 'all', open: '10:30', close: '14:30' }])).toBe(true);
    expect(hasRamadanHours([])).toBe(false);
    expect(hasRamadanHours(null)).toBe(false);
    expect(hasRamadanHours('ramadan')).toBe(false);
  });
});
