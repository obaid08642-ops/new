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
  });
});
