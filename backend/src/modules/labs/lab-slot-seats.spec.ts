import { MAX_SLOT_CAPACITY, SEAT_GRACE_MS, confirmSeat, releaseSeat, reserveSeat, slotCapacityOf, slotStartOf, type SeatBookingStatus, type SeatCollection } from './lab-slot-seats';

// A collection with a unique index on provider + slot + seat, like the real one: the second insert of the same key fails with code 11000.
function fakeSeats(): SeatCollection & { rows: any[] } {
  const rows: any[] = [];
  const keyOf = (d: any) => `${d.provider_account_id}|${new Date(d.slot_start).getTime()}|${d.seat}`;
  const match = (d: any, f: any) => Object.entries(f).every(([k, v]) => (k === 'slot_start' ? new Date(d[k]).getTime() === new Date(v as any).getTime() : d[k] === v));
  return {
    rows,
    async insertOne(doc) { await Promise.resolve(); if (rows.some((r) => keyOf(r) === keyOf(doc))) throw Object.assign(new Error('E11000 duplicate key'), { code: 11000 }); rows.push({ ...doc }); },
    async findOne(f) { await Promise.resolve(); return rows.find((r) => match(r, f)) ?? null; },
    async updateOne(f, u) { await Promise.resolve(); const r = rows.find((x) => match(x, f)); if (!r) return { modifiedCount: 0 }; Object.assign(r, u.$set); return { modifiedCount: 1 }; },
    async deleteMany(f) { for (let i = rows.length - 1; i >= 0; i--) if (match(rows[i], f)) rows.splice(i, 1); },
  };
}

const slot = slotStartOf('2026-11-12T10:00:00Z');
const T0 = Date.parse('2026-11-10T08:00:00Z');
/** The status of each booking id; anything not listed is missing (not stored). */
const statuses = (m: Record<string, SeatBookingStatus>) => async (id: string): Promise<SeatBookingStatus> => m[id] ?? 'missing';
const seatOf = (col: SeatCollection, id: string, now = T0, capacity = 1, st: Record<string, SeatBookingStatus> = {}) =>
  reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity, booking_id: id }, statuses(st), now);

describe('lab slot capacity', () => {
  it('reads the capacity: a whole number from 1 to 20, anything else is 1', () => {
    expect(slotCapacityOf({ slot_capacity: 3 })).toBe(3);
    for (const v of [undefined, null, 0, -1, 2.5, 21, '3x', {}]) expect(slotCapacityOf({ slot_capacity: v })).toBe(1);
    expect(slotCapacityOf({ slot_capacity: MAX_SLOT_CAPACITY })).toBe(MAX_SLOT_CAPACITY);
    expect(slotCapacityOf(null)).toBe(1);
  });

  it('a slot is the exact minute of the booking time', () => {
    expect(slotStartOf('2026-11-12T10:00:30Z').toISOString()).toBe('2026-11-12T10:00:00.000Z');
  });

  it('two parallel bookings for the last seat: one wins (neither booking is stored yet)', async () => {
    const col = fakeSeats();
    const results = await Promise.all(['b1', 'b2'].map((id) => seatOf(col, id)));
    expect(results.filter((r) => r === 1)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(col.rows).toHaveLength(1);
  });

  it('a seat just inserted whose booking is not stored yet is NOT taken over: the second booking gets null (slot_taken)', async () => {
    const col = fakeSeats();
    expect(await seatOf(col, 'first')).toBe(1);
    // the first booking has not reached the database yet (status missing), the second request arrives a moment later
    expect(await seatOf(col, 'second', T0 + 50)).toBeNull();
    expect(col.rows[0].booking_id).toBe('first');
  });

  it('capacity 2 and eight parallel bookings: exactly two win', async () => {
    const col = fakeSeats();
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => seatOf(col, `b${i}`, T0, 2)));
    expect(results.filter((r) => r !== null).sort()).toEqual([1, 2]);
    expect(col.rows).toHaveLength(2);
  });

  it('another slot or another lab is not affected', async () => {
    const col = fakeSeats();
    await seatOf(col, 'a');
    expect(await reserveSeat(col, { provider_account_id: 'lab1', slot_start: new Date(slot.getTime() + 1_800_000), capacity: 1, booking_id: 'b' }, statuses({}), T0)).toBe(1);
    expect(await reserveSeat(col, { provider_account_id: 'lab2', slot_start: slot, capacity: 1, booking_id: 'c' }, statuses({}), T0)).toBe(1);
  });

  it('a seat whose booking is stored as cancelled or reported is taken at once, by only one of several parallel bookings', async () => {
    const col = fakeSeats();
    await seatOf(col, 'old');
    const results = await Promise.all(['n1', 'n2', 'n3'].map((id) => seatOf(col, id, T0 + 10, 1, { old: 'free', n1: 'live', n2: 'live', n3: 'live' })));
    expect(results.filter((r) => r === 1)).toHaveLength(1);
    expect(col.rows).toHaveLength(1);
    expect(['n1', 'n2', 'n3']).toContain(col.rows[0].booking_id);
  });

  it('a seat held by a live booking is never taken over', async () => {
    const col = fakeSeats();
    await seatOf(col, 'a');
    expect(await seatOf(col, 'b', T0 + 10 * SEAT_GRACE_MS, 1, { a: 'live' })).toBeNull();
  });

  it('a confirmed seat whose booking was removed is taken at once; an unconfirmed one only after the grace period', async () => {
    const col = fakeSeats();
    await seatOf(col, 'a');
    await confirmSeat(col, 'a');
    expect(await seatOf(col, 'b', T0 + 10)).toBe(1);
    const col2 = fakeSeats();
    await seatOf(col2, 'a');
    expect(await seatOf(col2, 'b', T0 + SEAT_GRACE_MS - 1)).toBeNull();
    expect(await seatOf(col2, 'b', T0 + SEAT_GRACE_MS)).toBe(1);
  });

  it('a released seat is free again', async () => {
    const col = fakeSeats();
    await seatOf(col, 'a');
    await releaseSeat(col, 'a');
    expect(await seatOf(col, 'b', T0 + 10)).toBe(1);
  });

  it('an error other than a duplicate key is not swallowed', async () => {
    const col = fakeSeats();
    col.insertOne = async () => { throw new Error('connection lost'); };
    await expect(seatOf(col, 'a')).rejects.toThrow('connection lost');
  });
});
