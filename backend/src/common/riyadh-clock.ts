/**
 * 15.9 — Clocks and time zones (server side).
 *
 * Single home for "what time is it for a provider/patient" decisions:
 * everything resolves against the SERVER clock expressed in Asia/Riyadh,
 * never against a client-supplied timestamp and never against the process
 * local timezone (containers ship UTC; developer laptops ship anything).
 *
 * - `riyadhParts(date)` — Riyadh wall-clock dow/hours/minutes/ymd for an
 *   instant, via Intl (no locale-string round-trip, no Date-local getters).
 * - `isRamadan(date)` — true during Ramadan (month 9) per the Umm al-Qura
 *   calendar (`islamic-umalqura`). Pure Intl; false when the runtime lacks the
 *   calendar so schedules degrade to normal hours instead of throwing.
 */
export const RIYADH_TZ = 'Asia/Riyadh';

export interface RiyadhWallParts {
  /** 0 = Sunday … 6 = Saturday (matches Date#getDay numbering). */
  dow: number;
  hours: number;
  minutes: number;
  /** Riyadh calendar day, YYYY-MM-DD. */
  ymd: string;
}

const PARTS_FMT = new Intl.DateTimeFormat('en-US', {
  timeZone: RIYADH_TZ,
  weekday: 'short',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const DOW_BY_SHORT = new Map([
  ['sun', 0], ['mon', 1], ['tue', 2], ['wed', 3], ['thu', 4], ['fri', 5], ['sat', 6],
]);

export function riyadhParts(date: Date): RiyadhWallParts {
  const bag: Record<string, string> = {};
  for (const p of PARTS_FMT.formatToParts(date)) {
    if (p.type !== 'literal') bag[p.type] = p.value;
  }
  const dow = DOW_BY_SHORT.get(String(bag.weekday || '').slice(0, 3).toLowerCase()) ?? 0;
  return {
    dow,
    hours: Number(bag.hour ?? 0),
    minutes: Number(bag.minute ?? 0),
    ymd: `${bag.year}-${bag.month}-${bag.day}`,
  };
}

let ramadanFmt: Intl.DateTimeFormat | null | undefined;
function ramadanMonth(date: Date): number | null {
  try {
    if (ramadanFmt === undefined) {
      ramadanFmt = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', {
        timeZone: RIYADH_TZ,
        month: 'numeric',
      });
    }
    if (!ramadanFmt) return null;
    for (const p of ramadanFmt.formatToParts(date)) {
      if (p.type === 'month') return Number(p.value);
    }
    return null;
  } catch {
    ramadanFmt = null;
    return null;
  }
}

/** True when `date` falls in Ramadan (Umm al-Qura month 9), evaluated in Asia/Riyadh. */
export function isRamadan(date: Date): boolean {
  return ramadanMonth(date) === 9;
}
/** Saudi Arabia keeps UTC+3 all year (no daylight saving), so a Riyadh calendar day is a fixed 24 h window. */
const RIYADH_OFFSET = '+03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * The instants that bound one Riyadh calendar day: `ymd` (YYYY-MM-DD, the day the patient sees on the app or the web), or
 * the current Riyadh day when it is absent. Null for a malformed day. Server-local day getters (getFullYear/getDate) are
 * UTC in production, so a log written between 00:00 and 03:00 Riyadh time fell on the previous day.
 */
export function riyadhDayRange(ymd?: string, now: Date = new Date()): { start: Date; end: Date } | null {
  const day = ymd ?? riyadhParts(now).ymd;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return null;
  const start = new Date(`${day}T00:00:00${RIYADH_OFFSET}`);
  if (Number.isNaN(start.getTime()) || riyadhParts(start).ymd !== day) return null;
  return { start, end: new Date(start.getTime() + DAY_MS - 1) };
}

/** The first instant of the current Riyadh calendar month. */
export function riyadhMonthStart(now: Date = new Date()): Date {
  return new Date(`${riyadhParts(now).ymd.slice(0, 7)}-01T00:00:00${RIYADH_OFFSET}`);
}
