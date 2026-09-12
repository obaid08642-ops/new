import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { SlotLocksService } from './slot-locks.module';
import { BadRequestException } from '@nestjs/common';

describe('SlotLocksService', () => {
  let service: SlotLocksService;
  let locksModel: any;

  beforeEach(async () => {
    locksModel = {
      deleteMany: jest.fn(),
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SlotLocksService,
        { provide: getModelToken('SlotLock'), useValue: locksModel },
      ],
    }).compile();

    service = module.get<SlotLocksService>(SlotLocksService);
  });

  describe('reserve', () => {
    it('should throw BadRequestException if missing fields', async () => {
      await expect(service.reserve({ id: 'u1' }, { provider_id: '', booking_kind: 'consultation', slot_start: '' }))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a lock if no collision exists', async () => {
      locksModel.deleteMany.mockResolvedValue({});
      locksModel.findOne.mockResolvedValue(null);
      
      const mockLock = {
        toObject: () => ({ id: 'lock1', provider_id: 'doc1', patient_id: 'u1' })
      };
      locksModel.create.mockResolvedValue(mockLock);

      const res = await service.reserve({ id: 'u1' }, {
        provider_id: 'doc1',
        booking_kind: 'consultation',
        slot_start: new Date().toISOString(),
      });

      expect(res.id).toBe('lock1');
      expect(locksModel.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException on collision with another user', async () => {
      locksModel.deleteMany.mockResolvedValue({});
      locksModel.findOne.mockResolvedValue({ id: 'lock1', patient_id: 'u2' });

      await expect(service.reserve({ id: 'u1' }, {
        provider_id: 'doc1',
        booking_kind: 'consultation',
        slot_start: new Date().toISOString(),
      })).rejects.toThrow('slot_taken');
    });

    it('should map a storage duplicate-key race to slot_taken instead of 500', async () => {
      locksModel.deleteMany.mockResolvedValue({});
      locksModel.findOne.mockResolvedValue(null);
      locksModel.create.mockRejectedValue({ code: 11000 });

      await expect(service.reserve({ id: 'u1' }, {
        provider_id: 'doc1',
        booking_kind: 'consultation',
        slot_start: new Date().toISOString(),
      })).rejects.toThrow('slot_taken');
    });
  });

  describe('validateForBooking', () => {
    const slot = new Date('2030-01-02T10:00:00.000Z');
    const held: any = {
      id: 'lock1', patient_id: 'u1', provider_id: 'doc1',
      slot_start: slot, status: 'held',
      expires_at: new Date(Date.now() + 60000), booking_kind: 'consultation',
    };

    it('should accept a matching held lock', async () => {
      locksModel.findOne.mockResolvedValue(held);
      await expect(service.validateForBooking({ id: 'u1' }, 'lock1', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).resolves.toBe(held);
    });

    it('should reject foreign, expired, mismatched, or non-held locks', async () => {
      locksModel.findOne.mockResolvedValue(null);
      await expect(service.validateForBooking({ id: 'u1' }, 'nope', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).rejects.toThrow('lock_not_found');

      // A foreign lock is invisible: the query itself filters by patient_id,
      // so the mock returns null exactly as the collection would.
      locksModel.findOne.mockResolvedValue(null);
      await expect(service.validateForBooking({ id: 'u1' }, 'lock1', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).rejects.toThrow('lock_not_found');

      locksModel.findOne.mockResolvedValue({ ...held, status: 'released' });
      await expect(service.validateForBooking({ id: 'u1' }, 'lock1', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).rejects.toThrow('lock_not_holdable');

      locksModel.findOne.mockResolvedValue({ ...held, expires_at: new Date(Date.now() - 1000) });
      await expect(service.validateForBooking({ id: 'u1' }, 'lock1', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).rejects.toThrow('lock_expired');

      locksModel.findOne.mockResolvedValue({ ...held, provider_id: 'doc2' });
      await expect(service.validateForBooking({ id: 'u1' }, 'lock1', {
        provider_id: 'doc1', slot_start: slot, booking_kind: 'consultation',
      })).rejects.toThrow('lock_provider_mismatch');
    });
  });

  describe('releaseQuietly', () => {
    it('should release held locks and never throw', async () => {
      const save = jest.fn();
      locksModel.findOne.mockResolvedValue({ id: 'lock1', status: 'held', save });
      await expect(service.releaseQuietly({ id: 'u1' }, 'lock1')).resolves.toEqual({ ok: true });
      expect(save).toHaveBeenCalled();
    });

    it('should no-op on missing or non-held locks and swallow errors', async () => {
      locksModel.findOne.mockResolvedValue(null);
      await expect(service.releaseQuietly({ id: 'u1' }, 'nope')).resolves.toEqual({ ok: true });
      locksModel.findOne.mockRejectedValueOnce(new Error('db down'));
      await expect(service.releaseQuietly({ id: 'u1' }, 'lock1')).resolves.toEqual({ ok: true });
    });
  });
});
