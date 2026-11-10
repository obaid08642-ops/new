// A lab's number of bookings per time slot: GET / PUT /labs/provider/slot-capacity (a whole number from 1 to 20; the slot picker and the booking use the same number).
export const SLOT_CAPACITY_URL = '/labs/provider/slot-capacity';
export const MAX_SLOT_CAPACITY = 20;

/** The number typed by the lab, or null when it is not a whole number from 1 to 20. */
export function parseCapacity(text: string): number | null {
  const v = (text ?? '').trim();
  if (!/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_SLOT_CAPACITY ? n : null;
}
