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
