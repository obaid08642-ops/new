import { marketClock, marketDayStart, marketParts, marketTime, marketTimezone, marketWeekdayKey } from './market-time';

describe('the market time helpers (one configured time zone, default Asia/Riyadh)', () => {
  const OLD = process.env.MARKET_TIMEZONE;
  afterEach(() => { if (OLD === undefined) delete process.env.MARKET_TIMEZONE; else process.env.MARKET_TIMEZONE = OLD; });

  it('defaults to Asia/Riyadh; an invalid name falls back; the setting is read at call time', () => {
    delete process.env.MARKET_TIMEZONE;
    expect(marketTimezone()).toBe('Asia/Riyadh');
    process.env.MARKET_TIMEZONE = 'Not/AZone';
    expect(marketTimezone()).toBe('Asia/Riyadh');
    process.env.MARKET_TIMEZONE = 'Africa/Cairo';
    expect(marketTimezone()).toBe('Africa/Cairo');
  });

  it('Riyadh: parts of an instant (UTC+3, no daylight saving)', () => {
    delete process.env.MARKET_TIMEZONE;
    expect(marketParts('2030-01-06T21:30:00Z')).toEqual({ date: '2030-01-07', hour: 0, minute: 30, weekday: 1, minutesOfDay: 30 });   // past midnight in Riyadh: the next day
    expect(marketParts('2030-07-06T05:05:00Z')).toMatchObject({ date: '2030-07-06', hour: 8, minute: 5, weekday: 6 });
    expect(marketClock('2030-01-06T06:00:00Z')).toBe('09:00');
  });

  it('Riyadh: a market wall-clock time is the right instant; the day starts at 21:00Z the day before', () => {
    delete process.env.MARKET_TIMEZONE;
    expect(marketTime('2030-01-06', '09:00').toISOString()).toBe('2030-01-06T06:00:00.000Z');
    expect(marketTime('2030-01-06', '22:30').toISOString()).toBe('2030-01-06T19:30:00.000Z');   // an evening slot stays on its own day
    expect(marketDayStart('2030-01-06').toISOString()).toBe('2030-01-05T21:00:00.000Z');
    expect(Number.isNaN(marketTime('nope', '09:00').getTime())).toBe(true);
    expect(Number.isNaN(marketTime('2030-01-06', 'late').getTime())).toBe(true);
  });

  it('the weekday of a calendar date is its own, whatever the zone; of an instant it is the market weekday', () => {
    expect(marketWeekdayKey('2030-01-06')).toBe('sun');
    expect(marketWeekdayKey('2030-01-06', 'Pacific/Kiritimati')).toBe('sun');
    expect(marketWeekdayKey(new Date('2030-01-06T22:00:00Z'))).toBe('mon');   // 01:00 Monday in Riyadh
  });

  it('another zone is a configuration value, and daylight saving is handled (Europe/London)', () => {
    process.env.MARKET_TIMEZONE = 'Europe/London';
    expect(marketTime('2030-01-06', '09:00').toISOString()).toBe('2030-01-06T09:00:00.000Z');   // winter: UTC+0
    expect(marketTime('2030-07-06', '09:00').toISOString()).toBe('2030-07-06T08:00:00.000Z');   // summer: UTC+1
    expect(marketClock('2030-07-06T08:00:00Z')).toBe('09:00');
  });
});
