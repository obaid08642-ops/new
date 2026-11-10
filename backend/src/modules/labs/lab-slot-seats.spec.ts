import { MAX_SLOT_CAPACITY, releaseSeat, reserveSeat, slotCapacityOf, slotStartOf, type SeatCollection } from './lab-slot-seats';

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
const live = (ids: string[]) => async (id: string) => ids.includes(id);

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

  it('two parallel bookings for the last seat: one wins', async () => {
    const col = fakeSeats();
    const ids = ['b1', 'b2'];
    const results = await Promise.all(ids.map((id) => reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: id }, live(ids))));
    expect(results.filter((r) => r === 1)).toHaveLength(1);
    expect(results.filter((r) => r === null)).toHaveLength(1);
    expect(col.rows).toHaveLength(1);
  });

  it('capacity 2 and eight parallel bookings: exactly two win', async () => {
    const col = fakeSeats();
    const ids = Array.from({ length: 8 }, (_, i) => `b${i}`);
    const results = await Promise.all(ids.map((id) => reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 2, booking_id: id }, live(ids))));
    expect(results.filter((r) => r !== null).sort()).toEqual([1, 2]);
    expect(col.rows).toHaveLength(2);
  });

  it('another slot or another lab is not affected', async () => {
    const col = fakeSeats();
    await reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'a' }, live(['a']));
    expect(await reserveSeat(col, { provider_account_id: 'lab1', slot_start: new Date(slot.getTime() + 1_800_000), capacity: 1, booking_id: 'b' }, live(['a', 'b']))).toBe(1);
    expect(await reserveSeat(col, { provider_account_id: 'lab2', slot_start: slot, capacity: 1, booking_id: 'c' }, live(['a', 'b', 'c']))).toBe(1);
  });

  it('a seat whose booking was cancelled is taken over once, even when several bookings try at the same time', async () => {
    const col = fakeSeats();
    await reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'old' }, live(['old']));
    const ids = ['n1', 'n2', 'n3'];
    // "old" is no longer live (cancelled)
    const results = await Promise.all(ids.map((id) => reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: id }, live(ids))));
    expect(results.filter((r) => r === 1)).toHaveLength(1);
    expect(col.rows).toHaveLength(1);
    expect(ids).toContain(col.rows[0].booking_id);
  });

  it('a seat held by a live booking is not taken over; a released seat is free again', async () => {
    const col = fakeSeats();
    await reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'a' }, live(['a']));
    expect(await reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'b' }, live(['a', 'b']))).toBeNull();
    await releaseSeat(col, 'a');
    expect(await reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'b' }, live(['b']))).toBe(1);
  });

  it('an error other than a duplicate key is not swallowed', async () => {
    const col = fakeSeats();
    col.insertOne = async () => { throw new Error('connection lost'); };
    await expect(reserveSeat(col, { provider_account_id: 'lab1', slot_start: slot, capacity: 1, booking_id: 'a' }, live([]))).rejects.toThrow('connection lost');
  });
});
