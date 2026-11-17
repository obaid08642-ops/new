import { riyadhClockLabel, riyadhDayStart, RIYADH_OFFSET_MS } from './riyadh-slots';

describe('slot times are Riyadh clock time (UTC+3, no daylight saving)', () => {
  it('a Riyadh day starts at 21:00Z of the day before', () => {
    expect(riyadhDayStart('2030-01-06').toISOString()).toBe('2030-01-05T21:00:00.000Z');
    expect(RIYADH_OFFSET_MS).toBe(3 * 3600_000);
  });

  it('an invalid day stays invalid', () => {
    expect(Number.isNaN(riyadhDayStart('not-a-day').getTime())).toBe(true);
  });

  it('the evening slot 22:00 opens on the RIGHT Riyadh day (it was 22:00Z = 01:00 the next day in Riyadh)', () => {
    const start = new Date(riyadhDayStart('2030-01-06').getTime() + 22 * 3600_000);
    expect(start.toISOString()).toBe('2030-01-06T19:00:00.000Z');
    expect(riyadhClockLabel(start)).toBe('22:00');
    expect(new Date(start.getTime() + RIYADH_OFFSET_MS).toISOString().slice(0, 10)).toBe('2030-01-06');
  });

  it('the label is the Riyadh wall clock of the instant, for strings and dates alike', () => {
    expect(riyadhClockLabel('2030-01-06T06:30:00.000Z')).toBe('09:30');
    expect(riyadhClockLabel(new Date('2030-01-06T21:00:00.000Z'))).toBe('00:00');
  });

  it('a window that crosses midnight (22:00-02:00) ends on the next Riyadh day', () => {
    const base = riyadhDayStart('2030-01-06').getTime();
    const close = base + 2 * 3600_000 + 24 * 3600_000;
    expect(riyadhClockLabel(close)).toBe('02:00');
    expect(new Date(close + RIYADH_OFFSET_MS).toISOString().slice(0, 10)).toBe('2030-01-07');
  });
});
