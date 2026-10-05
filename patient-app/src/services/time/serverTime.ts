/**
 * 15.9 — server-anchored "now" for patient-app.
 *
 * A wrong device clock must change nothing server-derived. Every HTTP response
 * carries a `Date` header stamped by infrastructure the backend team owns, so
 * the client records `offset = serverMs - deviceMs` and derives "now" from it:
 * when the device clock is off by ±1 day, both sides of the subtraction move
 * together and the error cancels out.
 *
 * Adapted from the patient-web sibling (`patient-web/lib/api/net/server-time.ts`
 * + `lib/datetime.ts`): same anchor math, RN-appropriate surface (no `window`,
 * locale tags come from the app's `dateLocaleFor`, and the day-strip helper
 * below is what the booking screens anchor to).
 *
 * Until the first response arrives there is nothing to anchor to, and
 * `serverNowMs()` falls back to the device clock — documented here so no
 * caller mistakes it for server truth before anchoring.
 */

// ── anchor ────────────────────────────────────────────────────────────────

let offsetMs = 0;
let anchored = false;

export function isServerTimeAnchored(): boolean {
  return anchored;
}

/** The last measured device-to-server skew; null before the first response. */
export function getServerTimeOffsetMs(): number | null {
  return anchored ? offsetMs : null;
}

/**
 * Records the skew from one response `Date` header. Returns false (and keeps
 * the previous offset) when the header is missing or unparseable — a broken
 * clock header must never poison the anchor.
 */
export function noteServerDate(dateHeader: string | null | undefined, nowMs: number = Date.now()): boolean {
  if (!dateHeader) return false;
  const serverMs = Date.parse(dateHeader);
  if (!Number.isFinite(serverMs)) return false;
  offsetMs = serverMs - nowMs;
  anchored = true;
  return true;
}

/** "Now" with the device-clock error cancelled out. */
export function serverNowMs(nowMs: number = Date.now()): number {
  return anchored ? nowMs + offsetMs : nowMs;
}

/** Test-only: forgets the anchor so suites start unanchored. */
export function resetServerTimeForTests(): void {
  offsetMs = 0;
  anchored = false;
}

// ── timezone display helpers ──────────────────────────────────────────────

/** Provider-attributed times are always shown in Asia/Riyadh. */
export const PROVIDER_TIME_ZONE = 'Asia/Riyadh' as const;

/** The user's zone as the device reports it; UTC when unreadable. */
export function resolveUserTimeZone(): string {
  try {
    if (typeof Intl === 'undefined' || typeof Intl.DateTimeFormat !== 'function') return 'UTC';
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === 'string' && zone ? zone : 'UTC';
  } catch {
    return 'UTC';
  }
}

export function isValidServerInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export interface ServerInstantFormatOptions {
  timeZone?: string;
  hour?: Intl.DateTimeFormatOptions['hour'];
  minute?: Intl.DateTimeFormatOptions['minute'];
  weekday?: Intl.DateTimeFormatOptions['weekday'];
  day?: Intl.DateTimeFormatOptions['day'];
  month?: Intl.DateTimeFormatOptions['month'];
  year?: Intl.DateTimeFormatOptions['year'];
}

/**
 * Formats a server instant in the user's zone (or an explicit one). Never
 * reads the device clock: formatting an absolute ISO instant cannot move when
 * the device date is wrong. Returns null for anything unparseable — display
 * code shows nothing rather than "Invalid Date".
 */
export function formatServerInstant(
  iso: unknown,
  localeTag: string,
  options: ServerInstantFormatOptions = {},
): string | null {
  if (!isValidServerInstant(iso)) return null;
  const { timeZone, ...rest } = options;
  try {
    return new Intl.DateTimeFormat(localeTag, {
      hour: '2-digit',
      minute: '2-digit',
      ...rest,
      timeZone: timeZone ?? resolveUserTimeZone(),
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** A provider-attributed instant, always in Asia/Riyadh. */
export function formatInProviderZone(
  iso: unknown,
  localeTag: string,
  options: Omit<ServerInstantFormatOptions, 'timeZone'> = {},
): string | null {
  return formatServerInstant(iso, localeTag, { ...options, timeZone: PROVIDER_TIME_ZONE });
}

/** Slot-chip time (`"10:30 ص"`), user zone unless pinned. Null-safe. */
export function formatSlotTime(
  slotStart: unknown,
  localeTag: string,
  timeZone?: string,
): string | null {
  return formatServerInstant(slotStart, localeTag, { timeZone });
}

/**
 * Past-slot guard for booking forms. Defaults to the server-anchored clock so
 * a device set ±1 day cannot hide future slots or admit past ones.
 */
export function isPastSlot(slotStart: string | number, nowMs: number = serverNowMs()): boolean {
  const slotMs = typeof slotStart === 'number' ? slotStart : Date.parse(slotStart);
  if (!Number.isFinite(slotMs)) return true;
  return slotMs < nowMs;
}

/**
 * The "today" a day-strip starts from. Booking screens must build their
 * day list from THIS, not from `new Date()`: with a device clock a day off,
 * the strip (and the `?date=` it queries) shifts by a day and the user books
 * against the wrong schedule.
 */
export function dayStripBaseMs(nowMs: number = serverNowMs()): number {
  return nowMs;
}

/** One day, for building `?date=` ranges off the anchored clock. */
export const DAY_MS = 86_400_000;

/**
 * The `YYYY-MM-DD` keys a reschedule/availability strip queries, for the next
 * `dayCount` days starting TOMORROW (day 1 — today cannot be rebooked into).
 * Defaults to the server-anchored clock so a device set ±1 day cannot shift
 * the strip and book against the wrong schedule. Same `toISOString` day
 * framing the reschedule screen already used — only the clock base changes.
 */
export function dayKeysForRange(dayCount: number, nowMs: number = serverNowMs()): string[] {
  const baseMs = dayStripBaseMs(nowMs);
  const keys: string[] = [];
  for (let i = 1; i <= dayCount; i++) {
    keys.push(new Date(baseMs + i * DAY_MS).toISOString().slice(0, 10));
  }
  return keys;
}
