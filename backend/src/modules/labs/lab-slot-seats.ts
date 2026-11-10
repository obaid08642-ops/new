// A lab takes `slot_capacity` bookings at the same time slot (default 1, set by the lab; the patient picker and the booking use the same number).
// "Two parallel bookings for the last seat: one wins" needs an atomic step, not count-then-insert: every booking takes a numbered seat of its slot
// (unique index provider + slot + seat), so the database refuses a second claim of the same seat. A seat whose booking was cancelled, reported or
// never stored is taken over by the next booking (no hook on every cancel path).

export const SEAT_COLLECTION = 'lab_slot_seats';
export const MAX_SLOT_CAPACITY = 20;
/** The booking states that no longer hold a seat. */
export const SEAT_FREE_STATES = ['CANCELLED', 'REPORTED'];

export interface SeatCollection {
  insertOne(doc: any): Promise<any>;
  findOne(filter: any): Promise<any>;
  updateOne(filter: any, update: any): Promise<{ modifiedCount?: number }>;
  deleteMany(filter: any): Promise<any>;
  createIndex?(spec: any, options?: any): Promise<any>;
}

/** The lab's number of simultaneous bookings per slot: a whole number from 1 to 20, anything else means 1. */
export function slotCapacityOf(profile: { slot_capacity?: unknown } | null | undefined): number {
  const n = Number(profile?.slot_capacity);
  return Number.isInteger(n) && n >= 1 && n <= MAX_SLOT_CAPACITY ? n : 1;
}

/** The slot a booking time belongs to: the exact minute (the picker offers slot starts on whole minutes). */
export function slotStartOf(at: Date | string | number): Date {
  const t = new Date(at).getTime();
  return new Date(Math.floor(t / 60_000) * 60_000);
}

const isDuplicateKey = (e: any) => e?.code === 11000;

/**
 * Take a seat of the slot for `bookingId`. Returns the seat number, or null when every seat of the slot is held by a live booking.
 * `isLive(id)` says whether a seat's booking still holds it.
 */
export async function reserveSeat(
  col: SeatCollection,
  input: { provider_account_id: string; slot_start: Date; capacity: number; booking_id: string },
  isLive: (bookingId: string) => Promise<boolean>,
): Promise<number | null> {
  for (let seat = 1; seat <= input.capacity; seat++) {
    const key = { provider_account_id: input.provider_account_id, slot_start: input.slot_start, seat };
    try {
      await col.insertOne({ ...key, booking_id: input.booking_id, createdAt: new Date() });
      return seat;
    } catch (e: any) {
      if (!isDuplicateKey(e)) throw e;
    }
    const held = await col.findOne(key);
    if (held && !(await isLive(String(held.booking_id)))) {
      // the seat's booking is gone: take it over, but only if nobody else did in the meantime
      const res = await col.updateOne({ ...key, booking_id: held.booking_id }, { $set: { booking_id: input.booking_id, createdAt: new Date() } });
      if ((res?.modifiedCount ?? 0) === 1) return seat;
    }
  }
  return null;
}

/** Give the seat back (a booking that failed after taking it). */
export async function releaseSeat(col: SeatCollection, bookingId: string): Promise<void> {
  await col.deleteMany({ booking_id: bookingId });
}

const indexed = new WeakSet<object>();
/** The unique index the atomic claim relies on (asked once per collection handle; creating an index that exists is a no-op in MongoDB). */
export async function ensureSeatIndex(col: SeatCollection): Promise<void> {
  if (indexed.has(col) || !col.createIndex) return;
  await col.createIndex({ provider_account_id: 1, slot_start: 1, seat: 1 }, { unique: true, name: 'lab_slot_seat_unique' });
  indexed.add(col);
}
