/**
 * P15.9 — provider schedule times always display in Asia/Riyadh.
 *
 * Two rules, mirroring `patient-web/lib/datetime.ts` (sibling `web` worktree,
 * read as reference):
 *
 * 1. A server instant is formatted, never recomputed. `formatServerInstant`
 *    never reads the device clock, so ±1 day of device error cannot move it.
 * 2. "Is this slot in the past?" is answered against `serverNowMs()` (the
 *    15.9 anchor from response `Date` headers), not `Date.now()`.
 *
 * provider-app is provider-facing, so the default zone here is Asia/Riyadh —
 * not the device zone. Callers pass the app locale (`ar-SA-u-ca-gregory` for
 * Arabic so the calendar stays Gregorian, `en-GB` otherwise).
 */
import { serverNowMs } from './serverTime';

/** The zone every provider-attributed instant is displayed in. */
export const PROVIDER_TIME_ZONE = 'Asia/Riyadh' as const;

export function isValidServerInstant(value: unknown): value is string {
  if (typeof value !== 'string' || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export type InstantFormatOptions = {
  timeZone?: string;
  dateStyle?: 'full' | 'long' | 'medium' | 'short';
  timeStyle?: 'full' | 'long' | 'medium' | 'short';
};

/**
 * Formats a server instant in the provider zone (or an explicit one). Returns
 * null for anything unparseable — display code shows nothing rather than
 * "Invalid Date".
 */
export function formatServerInstant(
  iso: unknown,
  locale: string,
  options: InstantFormatOptions = {},
): string | null {
  if (!isValidServerInstant(iso)) return null;
  const { timeZone, dateStyle = 'medium', timeStyle = 'short' } = options;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeStyle,
      timeZone: timeZone ?? PROVIDER_TIME_ZONE,
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/**
 * A provider-attributed instant, always in Asia/Riyadh. Time-only callers
 * (schedule chips) pass `{ dateStyle: undefined, timeStyle: 'short' }` —
 * omitted styles are left out of the output.
 */
export function formatInProviderZone(
  iso: unknown,
  locale: string,
  options: Omit<InstantFormatOptions, 'timeZone'> = {},
): string | null {
  if (!isValidServerInstant(iso)) return null;
  const { dateStyle, timeStyle } = options;
  try {
    const format: Intl.DateTimeFormatOptions = { timeZone: PROVIDER_TIME_ZONE };
    if (dateStyle !== undefined) format.dateStyle = dateStyle;
    else if (timeStyle === undefined) format.dateStyle = 'medium';
    if (timeStyle !== undefined) format.timeStyle = timeStyle;
    else if (dateStyle === undefined) format.timeStyle = 'short';
    return new Intl.DateTimeFormat(locale, format).format(new Date(iso));
  } catch {
    return null;
  }
}

/**
 * Past-slot guard for schedule screens. Defaults to the server-anchored clock
 * so a device set ±1 day cannot hide future slots or admit past ones.
 */
export function isPastSlot(slotMs: number, nowMs: number = serverNowMs()): boolean {
  if (!Number.isFinite(slotMs)) return true;
  return slotMs < nowMs;
}
