import { RIYADH_OFFSET_MS, riyadhDayKey, riyadhDays, riyadhNoon, riyadhWall } from '../../utils/riyadh';

// Labs, radiology and home care cut their slots by Riyadh clock time (UTC+3, no daylight saving; backend common/riyadh-slots.ts):
// `start` is a real instant and `date=` is the Riyadh calendar day. These helpers read an instant in Riyadh whatever the phone's zone is.
describe('Riyadh time of the slot pickers', () => {
  it('the day of an instant is the next day from 21:00 UTC on', () => {
    expect(riyadhDayKey('2026-11-16T20:59:59Z')).toBe('2026-11-16');
    expect(riyadhDayKey('2026-11-16T21:00:00Z')).toBe('2026-11-17');
  });

  it('riyadhWall moves the instant by three hours and its UTC fields read as the Riyadh clock', () => {
    expect(RIYADH_OFFSET_MS).toBe(3 * 3600_000);
    const wall = riyadhWall('2026-11-17T05:00:00Z');
    expect(wall.getUTCHours()).toBe(8);
    expect(wall.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: 'UTC' })).toBe('08:00');
  });

  it('the days asked for start from the Riyadh today and roll over month and year', () => {
    expect(riyadhDays(new Date('2026-11-16T22:30:00Z'), 3)).toEqual(['2026-11-17', '2026-11-18', '2026-11-19']);
    expect(riyadhDays(new Date('2026-12-30T21:30:00Z'), 3)).toEqual(['2026-12-31', '2027-01-01', '2027-01-02']);
  });

  it('riyadhNoon is 12:00 of the day in Riyadh, so a day label can never fall on the neighbouring day', () => {
    expect(riyadhNoon('2026-11-17').toISOString()).toBe('2026-11-17T09:00:00.000Z');
    expect(riyadhDayKey(riyadhNoon('2026-11-17'))).toBe('2026-11-17');
  });
});
