import { DEFAULT_TIMEZONE } from './market-defaults';
/**
 * The market's local time, in ONE place. Opening hours, doctor and service schedules, quiet hours and peak-hour surge are written by people as the clock of the market they serve, but the
 * containers run in UTC (TZ is not set; the nightly crons are pinned to UTC on purpose, see process-timezone.spec.ts). So every local-time read goes through these helpers, which take the
 * time zone from configuration: `MARKET_TIMEZONE` (an IANA name), default `Asia/Riyadh` (UTC+3, no daylight saving), the only market today. A second market is a second value here, not a
 * code change in each caller (lead 2026-11-17: no hidden Saudi assumption, multi-country plan). Built on Intl, so a time zone with daylight saving works too.
 *
 * `common/riyadh-slots.ts` (lab / radiology / home-care slot lists, #2725) predates this and keeps its fixed +3 h offset.
 */
export const WEEKDAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'] as const;

export function marketTimezone(): string {
  const tz = (process.env.MARKET_TIMEZONE || '').trim();
  if (tz) { try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return tz; } catch { /* an invalid name falls back */ } }
  return DEFAULT_TIMEZONE;
}

export interface MarketParts { date: string; hour: number; minute: number; weekday: number; minutesOfDay: number }

/** The market's calendar date, clock and weekday (0 = Sunday) at an instant. */
export function marketParts(at: Date | number | string, tz: string = marketTimezone()): MarketParts {
  const d = new Date(at);
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: tz, hourCycle: 'h23', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short' }).formatToParts(d);
  const get = (t: string) => p.find((x) => x.type === t)?.value ?? '';
  const hour = Number(get('hour')) % 24; const minute = Number(get('minute'));
  return { date: `${get('year')}-${get('month')}-${get('day')}`, hour, minute, weekday: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday')), minutesOfDay: hour * 60 + minute };
}

/** The market clock "HH:mm" at an instant. */
export function marketClock(at: Date | number | string, tz: string = marketTimezone()): string {
  const { hour, minute } = marketParts(at, tz);
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

const offsetMs = (at: number, tz: string): number => {
  const p = marketParts(at, tz);
  const [y, m, d] = p.date.split('-').map(Number);
  return Date.UTC(y, m - 1, d, p.hour, p.minute, 0, 0) - Math.floor(at / 60_000) * 60_000;
};

/** The instant a market wall-clock time ("YYYY-MM-DD" + "HH:mm") is; an invalid Date for an invalid input. */
export function marketTime(dateStr: string, hm: string = '00:00', tz: string = marketTimezone()): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateStr).slice(0, 10));
  const t = /^(\d{1,2}):(\d{2})/.exec(String(hm));
  if (!m || !t) return new Date(NaN);
  const wall = Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]), Number(t[1]), Number(t[2]), 0, 0);
  let guess = wall - offsetMs(wall, tz);
  guess = wall - offsetMs(guess, tz);     // once more: the offset at the real instant (daylight saving edges)
  return new Date(guess);
}

/** The instant the market calendar day `dateStr` begins. */
export function marketDayStart(dateStr: string, tz: string = marketTimezone()): Date {
  return marketTime(dateStr, '00:00', tz);
}

/** The key of the weekday ('sun'..'sat') of a market calendar date string, or of an instant. */
export function marketWeekdayKey(dateOrInstant: string | Date, tz: string = marketTimezone()): typeof WEEKDAY_KEYS[number] {
  const wd = typeof dateOrInstant === 'string' && /^\d{4}-\d{2}-\d{2}/.test(dateOrInstant)
    ? new Date(`${dateOrInstant.slice(0, 10)}T12:00:00Z`).getUTCDay()      // a calendar date has its own weekday, whatever the zone
    : marketParts(dateOrInstant, tz).weekday;
  return WEEKDAY_KEYS[wd];
}

/**
 * Is the market clock at `at` inside the quiet hours [start, end) (whole hours 0-23)? A window that crosses midnight (start > end, e.g. 22 to 7) is inside from `start` to midnight and from midnight to
 * `end`; the old inline test (`hour >= start && hour < end`) never matched such a window. start === end is an empty window.
 */
export function inMarketHours(at: Date | number | string, start: number, end: number, tz: string = marketTimezone()): boolean {
  if (!Number.isFinite(start) || !Number.isFinite(end) || start === end) return false;
  const { hour } = marketParts(at, tz);
  return start < end ? hour >= start && hour < end : hour >= start || hour < end;
}
