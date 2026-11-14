// A lab's number of bookings per time slot: GET / PUT /labs/provider/slot-capacity (a whole number from 1 to 20; the slot picker and the booking use the same number).
export const SLOT_CAPACITY_URL = '/labs/provider/slot-capacity';
export const RADIOLOGY_SLOT_CAPACITY_URL = '/radiology/provider/slot-capacity';

/** Which route serves the number: the lab's or the radiology centre's (same shape, same 1 to 20 limit). */
export function slotCapacityUrl(kind: 'lab' | 'radiology'): string {
  return kind === 'radiology' ? RADIOLOGY_SLOT_CAPACITY_URL : SLOT_CAPACITY_URL;
}
export const MAX_SLOT_CAPACITY = 20;

/** The number typed by the lab, or null when it is not a whole number from 1 to 20. */
export function parseCapacity(text: string): number | null {
  const v = (text ?? '').trim();
  if (!/^\d{1,2}$/.test(v)) return null;
  const n = Number(v);
  return n >= 1 && n <= MAX_SLOT_CAPACITY ? n : null;
}
