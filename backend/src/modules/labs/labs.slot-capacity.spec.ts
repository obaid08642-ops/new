import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LabsService } from './labs.service';
import { LabPdfService } from './lab-pdf.service';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { SEAT_COLLECTION } from './lab-slot-seats';

// The lab's own number of bookings per slot (`slot_capacity`, default 1): the slot picker and the booking use it, and the last seat goes to one booking only.
describe('lab slot capacity: picker and booking', () => {
  const SLOT = new Date(Date.now() + 3 * 86_400_000); SLOT.setUTCHours(10, 0, 0, 0);
  const DAY = SLOT.toISOString().slice(0, 10);
  const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][SLOT.getUTCDay()];

  const seatRows: any[] = [];
  const seatCol = {
    async insertOne(doc: any) { await Promise.resolve(); if (seatRows.some((r) => r.provider_account_id === doc.provider_account_id && +r.slot_start === +doc.slot_start && r.seat === doc.seat)) throw Object.assign(new Error('dup'), { code: 11000 }); seatRows.push({ ...doc }); },
    async findOne(f: any) { await Promise.resolve(); return seatRows.find((r) => Object.entries(f).every(([k, v]) => (k === 'slot_start' ? +r[k] === +(v as any) : r[k] === v))) ?? null; },
    async updateOne(f: any, u: any) { const r = seatRows.find((x) => x.provider_account_id === f.provider_account_id && +x.slot_start === +f.slot_start && x.seat === f.seat && x.booking_id === f.booking_id); if (!r) return { modifiedCount: 0 }; Object.assign(r, u.$set); return { modifiedCount: 1 }; },
    async deleteMany(f: any) { for (let i = seatRows.length - 1; i >= 0; i--) if (seatRows[i].booking_id === f.booking_id) seatRows.splice(i, 1); },
    async createIndex() { return 'ok'; },
  };
  const otherCol = { findOne: async () => null, find: () => ({ toArray: async () => [], sort: () => ({ limit: () => ({ toArray: async () => [] }) }) }), updateOne: async () => ({}), insertOne: async () => ({}), countDocuments: async () => 0 };

  let stored: any[]; let profile: any; let service: LabsService; let bkgModel: any;

  beforeEach(async () => {
    seatRows.length = 0; stored = [];
    profile = { account_id: 'lab1', type: 'lab', status: 'active', public_eligibility: true, medical_review_status: 'approved', working_hours: [{ day: DOW, open: '09:00', close: '12:00', closed: false }], slot_capacity: 1 };
    bkgModel = {
      db: { collection: () => otherCol },
      countDocuments: async (q: any) => stored.filter((b) => b.id === q.id.$eq && (!q.state || !['CANCELLED', 'REPORTED'].includes(b.state))).length,
      find: (q: any) => {
        const rows = stored.filter((b) => (!q.provider_account_id || b.provider_account_id === q.provider_account_id) && !['CANCELLED', 'REPORTED'].includes(b.state));
        return { lean: async () => [], select: () => ({ lean: async () => rows }) };
      },
      create: async (doc: any) => { await Promise.resolve(); const b = { ...doc, tracking_id: 'T-' + doc.id, state_history: [], save: async () => undefined, toObject() { return { ...this }; } }; stored.push(b); return b; },
    };
    const providerProfiles: any = {
      db: { collection: (n: string) => { expect(n).toBe(SEAT_COLLECTION); return seatCol; } },
      findOne: () => ({ lean: async () => profile }),
      updateOne: jest.fn(async () => ({ matchedCount: 1 })),
    };
    const mod = await Test.createTestingModule({
      providers: [
        LabsService,
        { provide: LabPdfService, useValue: {} },
        { provide: 'LabServiceRepository', useValue: { db: { collection: () => otherCol }, find: async () => [{ id: 's1', price: 50, name_ar: 'ا', name_en: 'a', home_visit_supported: true }] } },
        { provide: 'LabBookingRepository', useValue: bkgModel },
        { provide: 'LabSampleRepository', useValue: {} },
        { provide: getModelToken('ProviderProfile'), useValue: providerProfiles },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
        { provide: EventBusService, useValue: { emit: jest.fn().mockResolvedValue(undefined) } },
        { provide: WorkflowEngineService, useValue: { announceCreated: jest.fn().mockResolvedValue(undefined) } },
      ],
    }).compile();
    service = mod.get(LabsService);
  });

  const patient = (n: number) => ({ id: `p${n}`, role: 'patient', full_name: `P${n}` });
  const order = () => ({ provider_account_id: 'lab1', items: [{ service_id: 's1' }], scheduled_at: SLOT.toISOString(), location_type: 'facility', payment_method: 'cash', refund_policy_accepted: true });

  it('the picker uses the hours given at registration when no schedule_lab was saved, and offers the slot', async () => {
    const day: any = await service.slotsForProvider('lab1', DAY);
    expect(day.capacity).toBe(1);
    const s = day.slots.find((x: any) => x.start === SLOT.toISOString());
    expect(s).toMatchObject({ available: true, remaining: 1 });
  });

  it('two parallel bookings for the last seat: one wins, the other gets slot_taken, and the picker then shows the slot taken', async () => {
    const results = await Promise.allSettled([service.book(patient(1), order()), service.book(patient(2), order())]);
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(1);
    const lost = results.find((r) => r.status === 'rejected') as PromiseRejectedResult;
    expect(lost.reason).toBeInstanceOf(BadRequestException);
    expect(lost.reason.message).toBe('slot_taken');
    expect(stored).toHaveLength(1);
    const day: any = await service.slotsForProvider('lab1', DAY);
    expect(day.slots.find((x: any) => x.start === SLOT.toISOString())).toMatchObject({ available: false, remaining: 0 });
  });

  it('capacity 3 and five parallel bookings: three win; the picker shows no seat left', async () => {
    profile.slot_capacity = 3;
    const results = await Promise.allSettled([1, 2, 3, 4, 5].map((n) => service.book(patient(n), order())));
    expect(results.filter((r) => r.status === 'fulfilled')).toHaveLength(3);
    expect(stored).toHaveLength(3);
    const day: any = await service.slotsForProvider('lab1', DAY);
    expect(day.capacity).toBe(3);
    expect(day.slots.find((x: any) => x.start === SLOT.toISOString())).toMatchObject({ available: false, remaining: 0 });
  });

  it('the booking that is still being stored does not lose its seat to a parallel request (create is slow)', async () => {
    const realCreate = bkgModel.create;
    bkgModel.create = async (doc: any) => { await new Promise((r) => setTimeout(r, 40)); return realCreate(doc); };
    const [a, b] = await Promise.allSettled([service.book(patient(1), order()), (async () => { await new Promise((r) => setTimeout(r, 10)); return service.book(patient(2), order()); })()]);
    expect([a.status, b.status].sort()).toEqual(['fulfilled', 'rejected']);
    expect(stored).toHaveLength(1);
  });

  it('a cancelled booking gives its seat back to the next patient', async () => {
    await service.book(patient(1), order());
    stored[0].state = 'CANCELLED';
    await expect(service.book(patient(2), order())).resolves.toBeDefined();
    expect(stored.filter((b) => b.state !== 'CANCELLED')).toHaveLength(1);
  });

  it('a booking that fails after its seat was taken gives the seat back', async () => {
    bkgModel.create = async () => { throw new Error('write failed'); };
    await expect(service.book(patient(1), order())).rejects.toThrow('write failed');
    expect(seatRows).toHaveLength(0);
  });

  it('the lab sets its capacity itself, 1 to 20 only', async () => {
    await expect(service.setSlotCapacity({ id: 'lab1' }, 4)).resolves.toEqual({ ok: true, slot_capacity: 4 });
    for (const bad of [0, 21, 2.5, NaN]) await expect(service.setSlotCapacity({ id: 'lab1' }, bad as any)).rejects.toThrow(BadRequestException);
    profile.slot_capacity = 6;
    await expect(service.getSlotCapacity({ id: 'lab1' })).resolves.toEqual({ slot_capacity: 6, max: 20 });
  });
});
