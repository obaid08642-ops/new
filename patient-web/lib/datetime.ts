import { serverNowMs } from "./api/net/server-time";

/**
 * P15.9 — display times in the user's time zone; providers use Asia/Riyadh.
 *
 * Two rules, enforced by putting every server instant through these helpers:
 *
 * 1. A server instant is formatted, never recomputed. `formatServerInstant`
 *    never reads the device clock, so ±1 day of device error cannot move it.
 * 2. "Is this slot in the past?" is answered against `serverNowMs()` (15.9
 *    anchor from response `Date` headers), not `Date.now()`.
 *
 * patient-web is patient-facing, so the default zone is the user's (device)
 * zone. `PROVIDER_TIME_ZONE` pins Asia/Riyadh for provider-attributed times;
 * the provider app owns its own enforcement (DEFERRED-OUT-OF-SCOPE there).
 */

export const PROVIDER_TIME_ZONE = "Asia/Riyadh" as const;

/** The user's zone as the device reports it; UTC when unreadable (SSR/ancient). */
export function resolveUserTimeZone(): string {
  try {
    if (typeof Intl === "undefined" || typeof Intl.DateTimeFormat !== "function") return "UTC";
    const zone = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    return typeof zone === "string" && zone ? zone : "UTC";
  } catch {
    return "UTC";
  }
}

export function isValidServerInstant(value: unknown): value is string {
  if (typeof value !== "string" || !value.trim()) return false;
  return Number.isFinite(Date.parse(value));
}

export type InstantFormatOptions = {
  timeZone?: string;
  dateStyle?: "full" | "long" | "medium" | "short";
  timeStyle?: "full" | "long" | "medium" | "short";
};

/**
 * Formats a server instant in the user's zone (or an explicit one). Returns
 * null for anything unparseable — display code shows nothing rather than
 * "Invalid Date".
 */
export function formatServerInstant(
  iso: unknown,
  locale: string,
  options: InstantFormatOptions = {},
): string | null {
  if (!isValidServerInstant(iso)) return null;
  const { timeZone, dateStyle = "medium", timeStyle = "short" } = options;
  try {
    return new Intl.DateTimeFormat(locale, {
      dateStyle,
      timeStyle,
      timeZone: timeZone ?? resolveUserTimeZone(),
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

/** A provider-attributed instant, always in Asia/Riyadh. */
export function formatInProviderZone(
  iso: unknown,
  locale: string,
  options: Omit<InstantFormatOptions, "timeZone"> = {},
): string | null {
  return formatServerInstant(iso, locale, { ...options, timeZone: PROVIDER_TIME_ZONE });
}

/**
 * Past-slot guard for booking forms. Defaults to the server-anchored clock so
 * a device set ±1 day cannot hide future slots or admit past ones.
 */
export function isPastSlot(slotMs: number, nowMs: number = serverNowMs()): boolean {
  if (!Number.isFinite(slotMs)) return true;
  return slotMs < nowMs;
}

/** True when Intl knows the zone; false (never throws) otherwise. */
function isKnownZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone });
    return true;
  } catch {
    return false;
  }
}

/**
 * The zone's UTC offset at one instant, without ever reading the device zone:
 * format the instant's wall clock IN the zone, re-read those parts as UTC,
 * and diff. Returns null when the zone is unknown.
 */
function zoneOffsetMs(timeZone: string, utcMs: number): number | null {
  try {
    const parts = new Intl.DateTimeFormat("en", {
      timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    }).formatToParts(new Date(utcMs));
    const get = (type: string): number => Number(parts.find((part) => part.type === type)?.value);
    // Midnight formats as hour "24" with hour12:false; fold it back to 0.
    const wallAsUTC = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour") % 24, get("minute"), get("second"));
    if (!Number.isFinite(wallAsUTC)) return null;
    return wallAsUTC - utcMs;
  } catch {
    return null;
  }
}

/**
 * F4 — builds a booking slot in EXPLICIT zone terms.
 *
 * The old forms did `new Date(`${day}T${time}:00`)`, which parses in whatever
 * zone the DEVICE reports and silently disagrees with the server-anchored
 * `isPastSlot` comparison whenever the device zone is wrong. This instead
 * resolves day wall-clock `HH:MM` in `timeZone` (callers pass
 * `resolveUserTimeZone()`) to an absolute instant, using only UTC math plus
 * explicit-zone Intl reads — the device zone never participates, so the result
 * is identical on every machine. Returns null for anything malformed (bad
 * date, bad time, unknown zone, impossible calendar day like Feb 30) and the
 * caller fails closed. A wall time inside a DST gap resolves to the nearest
 * valid instant rather than throwing; the forms only offer fixed half-hour
 * slots, so this path is documented, not exercised.
 */
export function zonedDayTimeToMs(dayISO: string, timeHM: string, timeZone: string): number | null {
  const day = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dayISO);
  const time = /^(\d{2}):(\d{2})$/.exec(timeHM);
  if (!day || !time) return null;
  const year = Number(day[1]);
  const month = Number(day[2]);
  const date = Number(day[3]);
  const hour = Number(time[1]);
  const minute = Number(time[2]);
  if (!isKnownZone(timeZone)) return null;
  if (month < 1 || month > 12 || date < 1 || date > 31 || hour > 23 || minute > 59) return null;
  const probe = new Date(Date.UTC(year, month - 1, date));
  if (probe.getUTCFullYear() !== year || probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== date) return null;
  const wallAsUTC = Date.UTC(year, month - 1, date, hour, minute);
  let guess = wallAsUTC;
  for (let round = 0; round < 3; round += 1) {
    const offset = zoneOffsetMs(timeZone, guess);
    if (offset === null) return null;
    const next = wallAsUTC - offset;
    if (next === guess) break;
    guess = next;
  }
  return guess;
}
