/** The chosen slot carried from the doctor profile into the booking page as link params (client side only, no endpoint). */

export type BookingType = "clinic" | "video" | "home";
export type CarriedSlot = { type: BookingType; start: string };

const TYPES: readonly string[] = ["clinic", "video", "home"];

/** `service_type=video&slot_start=2026-10-30T14:30:00.000Z`; the slot start is normalised to an ISO instant, dropped when unreadable. */
export function buildBookingQuery(type: BookingType, start?: string): string {
  const params = new URLSearchParams({ service_type: type });
  const time = start ? Date.parse(start) : Number.NaN;
  if (!Number.isNaN(time)) params.set("slot_start", new Date(time).toISOString());
  return params.toString();
}

/** The booking link for a doctor page choice. */
export function bookingHref(bookHref: string, type: BookingType, start?: string): string {
  return `${bookHref}?${buildBookingQuery(type, start)}`;
}

/** Reads the params back; a slot that does not parse or is not in the future is ignored (the page then works without it). */
export function parseBookingParams(raw: { service_type?: string | string[]; slot_start?: string | string[] }, now: number = Date.now()): { type?: BookingType; slotStart?: string } {
  const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const type = first(raw.service_type);
  const start = first(raw.slot_start);
  const time = start ? Date.parse(start) : Number.NaN;
  return {
    ...(type && TYPES.includes(type) ? { type: type as BookingType } : {}),
    ...(!Number.isNaN(time) && time > now ? { slotStart: new Date(time).toISOString() } : {}),
  };
}

/** Index in the booking day list (`YYYY-MM-DD`, local) of the carried slot's day; -1 when it is outside the list. */
export function carriedDayIndex(dayIsos: string[], slotStart: string): number {
  const d = new Date(slotStart);
  if (Number.isNaN(d.getTime())) return -1;
  const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  return dayIsos.indexOf(iso);
}

/** The slot to select once the day's slots are loaded: the carried one only when it is among them, else none. */
export function preselectedSlot(slots: Array<{ start: string }>, slotStart?: string): string | null {
  if (!slotStart) return null;
  const time = Date.parse(slotStart);
  return slots.find((s) => Date.parse(s.start) === time)?.start ?? null;
}
