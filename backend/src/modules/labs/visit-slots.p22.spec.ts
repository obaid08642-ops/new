/**
 * P22.4 — bookable home-collection windows (delivery slots).
 * Mocked Mongoose models (mongodb-memory-server SIGABRTs in this env).
 */
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LabVisitSlot, LabSlotHold } from '../../schemas/lab.schema';
import { VisitSlotsService } from './visit-slots.service';

const futureIso = (days: number, h: number, m = 0) => {
  const d = new Date(Date.now() + days * 24 * 3600000);
  d.setUTCHours(h, m, 0, 0);
  return d.toISOString();
};

const lean = <T>(v: T) => ({ lean: jest.fn().mockResolvedValue(v) });

function mockSlotModel() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
  };
}

function mockHoldModel() {
  return {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn().mockResolvedValue({ modifiedCount: 1 }),
    findOneAndUpdate: jest.fn(),
  };
}

const slotRow = (over: Record<string, unknown> = {}) => ({
  id: 'slot-1',
  provider_account_id: 'lab-1',
  city: 'riyadh',
  window_start: new Date(futureIso(1, 9)),
  window_end: new Date(futureIso(1, 12)),
  capacity: 2,
  booked_count: 0,
  status: 'OPEN',
  ...over,
});

describe('VisitSlotsService (P22.4 delivery slots)', () => {
  let svc: VisitSlotsService;
  let slots: ReturnType<typeof mockSlotModel>;
  let holds: ReturnType<typeof mockHoldModel>;
  let events: { emit: jest.Mock };

  const staff = { id: 'lab-1', role: 'lab' };
  const patient = { id: 'pat-1', role: 'patient' };

  beforeEach(async () => {
    slots = mockSlotModel();
    holds = mockHoldModel();
    events = { emit: jest.fn() };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        VisitSlotsService,
        { provide: getModelToken(LabVisitSlot.name), useValue: slots },
        { provide: getModelToken(LabSlotHold.name), useValue: holds },
        { provide: EventEmitter2, useValue: events },
      ],
    }).compile();
    svc = mod.get(VisitSlotsService);
    jest.clearAllMocks();
  });

  describe('createSlot', () => {
    it('rejects non-staff creators', async () => {
      await expect(svc.createSlot(patient, {
        city: 'Riyadh', window_start: futureIso(1, 9), window_end: futureIso(1, 12), capacity: 2,
      })).rejects.toThrow(ForbiddenException);
    });

    it('rejects past windows and out-of-range capacity', async () => {
      await expect(svc.createSlot(staff, {
        city: 'Riyadh',
        window_start: new Date(Date.now() - 3600000).toISOString(),
        window_end: futureIso(1, 12),
        capacity: 2,
      })).rejects.toThrow(BadRequestException);
      await expect(svc.createSlot(staff, {
        city: 'Riyadh', window_start: futureIso(1, 9), window_end: futureIso(1, 12), capacity: 0,
      })).rejects.toThrow(BadRequestException);
      await expect(svc.createSlot(staff, {
        city: 'Riyadh', window_start: futureIso(1, 12), window_end: futureIso(1, 9), capacity: 2,
      })).rejects.toThrow(BadRequestException);
    });

    it('replays by idempotency key without creating', async () => {
      slots.findOne.mockReturnValueOnce(lean(slotRow()));
      const res = await svc.createSlot(staff, {
        city: 'Riyadh', window_start: futureIso(1, 9), window_end: futureIso(1, 12),
        capacity: 2, idempotency_key: 'k-1',
      });
      expect((res as { id: string }).id).toBe('slot-1');
      expect(slots.create).not.toHaveBeenCalled();
    });

    it('refuses an overlapping window for the same provider+city', async () => {
      slots.findOne.mockReturnValueOnce(lean(slotRow()));
      await expect(svc.createSlot(staff, {
        city: 'Riyadh', window_start: futureIso(1, 9), window_end: futureIso(1, 12), capacity: 2,
      })).rejects.toThrow(ConflictException);
      expect(slots.create).not.toHaveBeenCalled();
    });

    it('creates an OPEN window with booked_count 0', async () => {
      slots.findOne.mockReturnValueOnce(lean(null)).mockReturnValueOnce(lean(null));
      slots.create.mockImplementation(async (doc: unknown) => ({ toObject: () => doc }));
      const res = await svc.createSlot(staff, {
        city: ' Riyadh ', window_start: futureIso(1, 9), window_end: futureIso(1, 12), capacity: 2,
      }) as { city: string; status: string; booked_count: number };
      expect(res.city).toBe('riyadh');
      expect(res.status).toBe('OPEN');
      expect(res.booked_count).toBe(0);
    });
  });

  describe('listSlots', () => {
    it('attaches remaining seats and rejects bad dates', async () => {
      slots.find.mockReturnValueOnce({ sort: jest.fn().mockReturnThis(), limit: jest.fn().mockReturnThis(), lean: jest.fn().mockResolvedValue([slotRow({ booked_count: 1, capacity: 2 })]) });
      const rows = await svc.listSlots({ city: 'Riyadh' });
      expect(rows[0]['remaining']).toBe(1);
      await expect(svc.listSlots({ date: 'not-a-date' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('bookSlot', () => {
    it('requires an idempotency key', async () => {
      await expect(svc.bookSlot(patient, 'slot-1', '')).rejects.toThrow(BadRequestException);
    });

    it('books one seat atomically and records a HELD hold', async () => {
      holds.findOne.mockReturnValueOnce(lean(null));
      slots.findOne.mockReturnValueOnce(lean(slotRow()));
      slots.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      slots.findOne.mockReturnValueOnce(lean(slotRow({ booked_count: 1 })));
      holds.create.mockImplementation(async (doc: unknown) => ({ toObject: () => doc }));
      const hold = await svc.bookSlot(patient, 'slot-1', 'key-1') as { status: string; patient_id: string };
      expect(hold.status).toBe('HELD');
      expect(hold.patient_id).toBe('pat-1');
      expect(events.emit).toHaveBeenCalledWith('lab.slot_booked', expect.objectContaining({ slot_id: 'slot-1' }));
    });

    it('marks the window FULL on the last seat', async () => {
      holds.findOne.mockReturnValueOnce(lean(null));
      slots.findOne.mockReturnValueOnce(lean(slotRow({ booked_count: 1, capacity: 2 })));
      slots.updateOne.mockResolvedValueOnce({ modifiedCount: 1 }).mockResolvedValueOnce({ modifiedCount: 1 });
      slots.findOne.mockReturnValueOnce(lean(slotRow({ booked_count: 2, capacity: 2 })));
      holds.create.mockImplementation(async (doc: unknown) => ({ toObject: () => doc }));
      await svc.bookSlot(patient, 'slot-1', 'key-2');
      expect(slots.updateOne).toHaveBeenCalledWith({ id: { $eq: 'slot-1' } }, { $set: { status: 'FULL' } });
    });

    it('loser of the atomic race gets slot_full (exactly one winner)', async () => {
      holds.findOne.mockReturnValueOnce(lean(null));
      slots.findOne.mockReturnValueOnce(lean(slotRow({ booked_count: 2, capacity: 2 })));
      slots.updateOne.mockResolvedValueOnce({ modifiedCount: 0 }).mockResolvedValueOnce({ modifiedCount: 1 });
      await expect(svc.bookSlot({ id: 'pat-2', role: 'patient' }, 'slot-1', 'key-3')).rejects.toThrow(ConflictException);
      expect(holds.create).not.toHaveBeenCalled();
    });

    it('replays the same key without taking another seat', async () => {
      const existing = { id: 'hold-1', slot_id: 'slot-1', patient_id: 'pat-1', status: 'HELD', idempotency_key: 'key-1' };
      holds.findOne.mockReturnValueOnce(lean(existing));
      const res = await svc.bookSlot(patient, 'slot-1', 'key-1');
      expect((res as { id: string }).id).toBe('hold-1');
      expect(slots.updateOne).not.toHaveBeenCalled();
    });

    it('rejects a reused key for another slot/patient', async () => {
      holds.findOne.mockReturnValueOnce(lean({ id: 'hold-1', slot_id: 'slot-9', patient_id: 'pat-1', status: 'HELD' }));
      await expect(svc.bookSlot(patient, 'slot-1', 'key-1')).rejects.toThrow(ConflictException);
    });
  });

  describe('releaseSlot / consume / sweep', () => {
    it('owner releases and frees the seat; stranger is forbidden', async () => {
      const doc = { id: 'hold-1', slot_id: 'slot-1', patient_id: 'pat-1', status: 'HELD', save: jest.fn() };
      holds.findOne.mockResolvedValueOnce(doc);
      // releaseSlot uses findOne without .lean — resolve the doc directly
      const res = await svc.releaseSlot(patient, 'hold-1');
      expect(res).toEqual({ id: 'hold-1', status: 'RELEASED' });
      expect(slots.updateOne).toHaveBeenCalledWith(
        { id: { $eq: 'slot-1' }, booked_count: { $gt: 0 } },
        { $inc: { booked_count: -1 }, $set: { status: 'OPEN' } },
      );
      holds.findOne.mockResolvedValueOnce({ ...doc, save: jest.fn() });
      await expect(svc.releaseSlot({ id: 'stranger', role: 'patient' }, 'hold-1')).rejects.toThrow(ForbiddenException);
    });

    it('consumes a HELD hold exactly once for a booking', async () => {
      holds.findOneAndUpdate.mockReturnValueOnce(lean({ id: 'hold-1', status: 'CONSUMED' }));
      const out = await svc.consumeHoldForBooking('hold-1', 'pat-1', 'bk-1');
      expect(out['status']).toBe('CONSUMED');
      holds.findOneAndUpdate.mockReturnValueOnce(lean(null));
      await expect(svc.consumeHoldForBooking('hold-1', 'pat-1', 'bk-2')).rejects.toThrow(BadRequestException);
    });

    it('sweep expires stale holds and frees seats', async () => {
      holds.find.mockReturnValueOnce({ limit: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ id: 'hold-old', slot_id: 'slot-1' }]) }) });
      holds.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      slots.updateOne.mockResolvedValueOnce({ modifiedCount: 1 });
      const res = await svc.sweepExpired(new Date());
      expect(res.expired).toBe(1);
    });
  });
});
