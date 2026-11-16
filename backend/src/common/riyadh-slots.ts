/**
 * Slot times of labs, radiology and home care are the provider's opening hours as the PROVIDER writes them: Riyadh clock time (UTC+3 all year, no daylight saving).
 * Until 2026-11-16 the three slot lists built them as UTC ("08:00" opened at 08:00Z = 11:00 in Riyadh), so an evening slot landed on the wrong hour and, past 21:00, on the next
 * Riyadh day. Decision of the lead, 2026-11-16 (no real users yet).
 *
 * How clients read a slot: `start` / `end` / `id` are real instants in ISO-8601 UTC (`...Z`, unchanged); `label` is the Riyadh wall-clock time "HH:mm" of `start`,
 * so a picker can show `label` as is or format `start` in the Asia/Riyadh time zone. The day of a request (`date=YYYY-MM-DD`) is the Riyadh calendar day.
 */
export const RIYADH_OFFSET_MS = 3 * 3600_000;

/** The instant the given Riyadh calendar day (YYYY-MM-DD) starts, as a Date; an invalid Date for an invalid day. */
export function riyadhDayStart(dateStr: string): Date {
  const utcMidnight = new Date(`${dateStr}T00:00:00Z`);
  return new Date(utcMidnight.getTime() - RIYADH_OFFSET_MS);
}

/** The Riyadh wall-clock "HH:mm" of an instant. */
export function riyadhClockLabel(instant: Date | string | number): string {
  return new Date(new Date(instant).getTime() + RIYADH_OFFSET_MS).toISOString().substring(11, 16);
}
