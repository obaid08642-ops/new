/** A radiology centre takes `slot_capacity` scans at the same time slot (default 1); the booking, the reschedule and the slot picker use the same number. */
import { BadRequestException } from '@nestjs/common';
import { RadiologyOpsService } from './radiology.service';

jest.mock('../../common/service-offers', () => ({ ...jest.requireActual('../../common/service-offers'), ownPrices: jest.fn(async () => new Map()) }));

const PATIENT = { id: 'pat-1', role: 'patient', full_name: 'P', phone: '0' };
const SLOT = new Date(Date.UTC(2030, 0, 6, 9, 0, 0)).toISOString();
const body = (over: any = {}) => ({ service_id: 'scan-1', scheduled_at: SLOT, location_type: 'facility', payment_method: 'card', provider_account_id: 'acc-1', refund_policy_accepted: true, ...over });

const build = (capacity?: number, opts: { createFails?: boolean } = {}) => {
  const stored: any[] = [];
  const seatRows = new Map<string, any>();
  const key = (f: any) => `${f.provider_account_id}|${new Date(f.slot_start).toISOString()}|${f.seat}`;
  const seats = {
    insertOne: async (d: any) => { if (seatRows.has(key(d))) throw Object.assign(new Error('dup'), { code: 11000 }); seatRows.set(key(d), { ...d }); },
    findOne: async (f: any) => seatRows.get(key(f)) ?? null,
    updateOne: async (f: any, u: any) => {
      if (f.booking_id && !f.seat) { let n = 0; for (const r of seatRows.values()) if (r.booking_id === f.booking_id) { Object.assign(r, u.$set); n++; } return { modifiedCount: n }; }
      const r = seatRows.get(key(f)); if (!r || (f.booking_id && r.booking_id !== f.booking_id)) return { modifiedCount: 0 }; Object.assign(r, u.$set); return { modifiedCount: 1 };
    },
    deleteMany: async (f: any) => { for (const [k, r] of [...seatRows]) if (r.booking_id === f.booking_id && (!f.slot_start || new Date(r.slot_start).getTime() !== new Date(f.slot_start.$ne).getTime())) seatRows.delete(k); },
    createIndex: async () => undefined,
  };
  const svc: any = Object.create(RadiologyOpsService.prototype);
  svc.getById = jest.fn(async () => ({ id: 'scan-1', price: 300, name_ar: 'x', name_en: 'x', modality: 'xr', body_part: 'chest', short_code: 'XR' }));
  svc.compatibleProviders = jest.fn(async () => [{ id: 'acc-1' }]);
  svc.profileModel = { db: { collection: () => seats }, findOne: () => ({ lean: async () => (capacity ? { slot_capacity: capacity } : {}) }), updateOne: jest.fn(async () => ({ matchedCount: 1 })) };
  svc.svcModel = { db: { collection: () => ({ findOne: async () => null }) } };
  svc.bkgModel = {
    countDocuments: async (q: any) => stored.filter((b) => b.id === q.id.$eq && (!q.state || !q.state.$nin.includes(b.state))).length,
    findOne: (q: any) => ({ lean: async () => (q?.id && !q?.patient_id ? stored.find((b) => b.id === q.id) ?? null : null) }),
    create: jest.fn(async (doc: any) => { if (opts.createFails) throw new Error('db down'); stored.push(doc); return doc; }),
  };
  svc.events = { emit: jest.fn() };
  svc.engine = { announceCreated: jest.fn(async () => undefined) };
  return { svc, stored, seatRows };
};

// each patient books once (a second booking of the same scan inside 3 minutes is an idempotent replay)
const patient = (n: number) => ({ ...PATIENT, id: `pat-${n}` });

describe('radiology slot capacity', () => {
  it('a centre without a number takes one scan per slot: the second booking of the slot is refused', async () => {
    const { svc, stored } = build();
    await svc.book(patient(1), body());
    await expect(svc.book(patient(2), body())).rejects.toThrow('slot_taken');
    expect(stored).toHaveLength(1);
  });

  it('capacity 2 takes two scans at the slot and refuses the third; another slot is free', async () => {
    const { svc, stored } = build(2);
    await svc.book(patient(1), body());
    await svc.book(patient(2), body());
    await expect(svc.book(patient(3), body())).rejects.toBeInstanceOf(BadRequestException);
    await svc.book(patient(3), body({ scheduled_at: new Date(Date.UTC(2030, 0, 6, 9, 30, 0)).toISOString() }));
    expect(stored).toHaveLength(3);
  });

  it('a booking that fails to be stored gives its seat back', async () => {
    const { svc, seatRows } = build(1, { createFails: true });
    await expect(svc.book(patient(1), body())).rejects.toThrow('db down');
    expect(seatRows.size).toBe(0);
  });

  it('the slot picker marks a slot full when its bookings reach the capacity and shows what is left', async () => {
    const { svc } = build(2);
    const open = new Date(Date.UTC(2030, 0, 6, 0, 0, 0));
    svc.profileModel.findOne = () => ({ lean: async () => ({ account_id: 'acc-1', slot_capacity: 2, schedule_clinic: [{ day: 'all', open: '09:00', close: '10:00' }] }) });
    svc.conn = null;
    const slotId = new Date(open.getTime() + 9 * 3600_000).toISOString();
    svc.bkgModel.find = () => ({ select: () => ({ lean: async () => [{ scheduled_at: slotId }, { scheduled_at: slotId }] }) });
    const out = await svc.slotsForProvider('acc-1', '2030-01-06', 30);
    expect(out.capacity).toBe(2);
    const full = out.slots.find((x: any) => x.start === slotId);
    expect(full).toMatchObject({ available: false, remaining: 0 });
    const free = out.slots.find((x: any) => x.start !== slotId);
    expect(free).toMatchObject({ available: true, remaining: 2 });
  });

  it('the centre sets its own number, 1 to 20 only', async () => {
    const { svc } = build();
    await expect(svc.setSlotCapacity({ id: 'acc-1' }, 0)).rejects.toThrow('slot_capacity_must_be_1_to_20');
    await expect(svc.setSlotCapacity({ id: 'acc-1' }, 21)).rejects.toThrow('slot_capacity_must_be_1_to_20');
    await expect(svc.setSlotCapacity({ id: 'acc-1' }, 2.5)).rejects.toThrow('slot_capacity_must_be_1_to_20');
    expect(await svc.setSlotCapacity({ id: 'acc-1' }, 3)).toEqual({ ok: true, slot_capacity: 3 });
    expect(await svc.getSlotCapacity({ id: 'acc-1' })).toEqual({ slot_capacity: 1, max: 20 });
  });
});
