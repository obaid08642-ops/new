import { dayKey, monthKey, nextDayReset, nextMonthReset, parseDurationSeconds, retryAfterSeconds } from './ai-windows';

const headers = (h: Record<string, string>) => ({ get: (n: string) => h[n.toLowerCase()] ?? null });

describe('AI free-tier windows', () => {
  it('counts the day in the provider zone: Pacific midnight is 07:00/08:00 UTC', () => {
    const at = new Date('2026-10-26T06:30:00Z'); // 23:30 on the 25th in Los Angeles (PDT, UTC-7)
    expect(dayKey('America/Los_Angeles', at)).toBe('2026-10-25');
    expect(dayKey('UTC', at)).toBe('2026-10-26');
    expect(nextDayReset('America/Los_Angeles', at).toISOString()).toBe('2026-10-26T07:00:00.000Z');
    expect(nextDayReset('UTC', at).toISOString()).toBe('2026-10-27T00:00:00.000Z');
  });

  it('knows the month and its reset', () => {
    const at = new Date('2026-10-31T23:30:00Z');
    expect(monthKey('UTC', at)).toBe('2026-10');
    expect(nextMonthReset('UTC', at).toISOString()).toBe('2026-11-01T00:00:00.000Z');
    expect(monthKey('Asia/Riyadh', at)).toBe('2026-11'); // already the 1st at 02:30 in Riyadh
  });

  it('falls back to UTC for an unknown zone', () => {
    expect(dayKey('Not/AZone', new Date('2026-10-26T12:00:00Z'))).toBe('2026-10-26');
  });

  it('reads the wait after a 429 from Retry-After (seconds or date), Groq durations and an epoch reset', () => {
    const now = Date.parse('2026-10-26T12:00:00Z');
    expect(retryAfterSeconds(headers({ 'retry-after': '30' }), now)).toBe(30);
    expect(retryAfterSeconds(headers({ 'retry-after': 'Mon, 26 Oct 2026 12:01:00 GMT' }), now)).toBe(60);
    expect(retryAfterSeconds(headers({ 'x-ratelimit-reset-requests': '2m59.56s' }), now)).toBe(180);
    expect(retryAfterSeconds(headers({ 'x-ratelimit-reset': String(now + 90_000) }), now)).toBe(90);
    expect(retryAfterSeconds(headers({}), now)).toBeUndefined();
    expect(retryAfterSeconds(headers({ 'retry-after': '999999' }), now)).toBe(86400); // clamped to a day
  });

  it('parses durations', () => {
    expect(parseDurationSeconds('7.66s')).toBeCloseTo(7.66);
    expect(parseDurationSeconds('1h2m')).toBe(3720);
    expect(parseDurationSeconds('250ms')).toBe(0.25);
    expect(parseDurationSeconds('soon')).toBeUndefined();
  });
});
