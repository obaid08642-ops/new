/**
 * Slot times of labs, radiology and home care are Riyadh clock time (UTC+3 all year, no daylight saving), backend common/riyadh-slots.ts:
 * `start` / `end` / `id` are real instants (ISO UTC), `label` is the Riyadh "HH:mm" of `start`, and the `date=YYYY-MM-DD` of a request is the Riyadh calendar day.
 * So a picker must show the instant in Riyadh and ask for the Riyadh day, whatever the time zone of the browser or the server render is.
 *
 * Riyadh is a fixed UTC+3, so a Riyadh wall clock is the instant moved by three hours and read as UTC: format the result with `timeZone: "UTC"`.
 */
export const RIYADH_OFFSET_MS = 3 * 3600_000;

/** The instant moved so that its UTC fields read as the Riyadh wall clock. Format it with `timeZone: "UTC"`. */
export function riyadhWall(instant: Date | string | number): Date {
  return new Date(new Date(instant).getTime() + RIYADH_OFFSET_MS);
}

/** The Riyadh calendar day (YYYY-MM-DD) of an instant. */
export function riyadhDayKey(instant: Date | string | number): string {
  return riyadhWall(instant).toISOString().slice(0, 10);
}

/** The next `n` Riyadh calendar days (today first) as YYYY-MM-DD. */
export function riyadhDays(now: Date, n: number): string[] {
  const t = riyadhWall(now);
  return Array.from({ length: n }, (_, i) => new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate() + i)).toISOString().slice(0, 10));
}

/** An instant inside the given Riyadh day (12:00 there), for a day label: format with `riyadhWall` and `timeZone: "UTC"`. */
export function riyadhNoon(day: string): Date {
  return new Date(`${day}T09:00:00Z`);
}
