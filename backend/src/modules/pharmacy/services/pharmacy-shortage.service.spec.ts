import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PharmacyShortageService } from './pharmacy-shortage.service';
import { DrugRejectionLog } from '../../../schemas/drug-rejection-log.schema';
import { Medicine } from '../../../schemas/medicine.schema';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('PharmacyShortageService', () => {
  let service: PharmacyShortageService;

  const mockDrugShortageFlagModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  const mockDrugRejectionLogModel = {
    create: jest.fn(),
    find: jest.fn().mockReturnThis(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn(),
    countDocuments: jest.fn(),
    aggregate: jest.fn(),
  };

  const mockMedicineModel = {
    findOne: jest.fn().mockReturnThis(),
    updateOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
    lean: jest.fn(),
  };

  const mockPharmacyOrderModel = {
    find: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PharmacyShortageService,
        { provide: 'DrugShortageFlagRepository', useValue: mockDrugShortageFlagModel },
        { provide: 'DrugRejectionLogRepository', useValue: mockDrugRejectionLogModel },
        { provide: 'MedicineRepository', useValue: mockMedicineModel },
        { provide: 'PharmacyOrderRepository', useValue: mockPharmacyOrderModel },
      ],
    }).compile();

    service = module.get<PharmacyShortageService>(PharmacyShortageService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('logRejection', () => {
    it('should trigger limited status on 5 consecutive rejections', async () => {
      // Mock last 5 rejection logs
      mockDrugRejectionLogModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([
              { type: 'reject' },
              { type: 'reject' },
              { type: 'reject' },
              { type: 'reject' },
              { type: 'reject' },
            ]),
          }),
        }),
      });

      await service.logRejection('med1', 'order1', 'pharm1');

      expect(mockDrugRejectionLogModel.create).toHaveBeenCalled();
      expect(mockMedicineModel.updateOne).toHaveBeenCalledWith(
        { id: 'med1' },
        { availability_status: 'availability_may_be_limited' }
      );
    });

    it('should trigger limited status on 10 rejections in last 7 days', async () => {
      // Mock consecutive check to fail (e.g. only 3 rejections consecutive)
      mockDrugRejectionLogModel.find.mockReturnValueOnce({
        sort: jest.fn().mockReturnValueOnce({
          limit: jest.fn().mockReturnValueOnce({
            lean: jest.fn().mockResolvedValue([
              { type: 'reject' },
              { type: 'accept' },
              { type: 'reject' },
            ]),
          }),
        }),
      });

      // Mock 7-day count to return 11 rejections
      mockDrugRejectionLogModel.countDocuments.mockResolvedValueOnce(11);

      await service.logRejection('med1', 'order1', 'pharm1');

      expect(mockMedicineModel.updateOne).toHaveBeenCalledWith(
        { id: 'med1' },
        { availability_status: 'availability_may_be_limited' }
      );
    });
  });

  describe('logAcceptance', () => {
    it('should reset availability status to none if currently limited', async () => {
      const mockMed = {
        id: 'med1',
        availability_status: 'availability_may_be_limited',
        save: jest.fn(),
      };
      mockMedicineModel.findOne.mockResolvedValueOnce(mockMed);

      await service.logAcceptance('med1', 'order1', 'pharm1');

      expect(mockDrugRejectionLogModel.create).toHaveBeenCalled();
      expect(mockMedicineModel.updateOne).toHaveBeenCalledWith(
        { id: 'med1' },
        { availability_status: 'none' }
      );
    });

    it('should NOT reset availability status if currently admin_flagged_shortage', async () => {
      const mockMed = {
        id: 'med1',
        availability_status: 'admin_flagged_shortage',
        save: jest.fn(),
      };
      mockMedicineModel.findOne.mockResolvedValueOnce(mockMed);

      await service.logAcceptance('med1', 'order1', 'pharm1');

      expect(mockMedicineModel.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('adminMarkShortage', () => {
    it('should throw ForbiddenException if user is not admin', async () => {
      await expect(
        service.adminMarkShortage({ role: 'patient' }, 'med1', { status: 'availability_may_be_limited' })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should update availability status successfully if user is admin', async () => {
      const mockMed = { id: 'med1', availability_status: 'availability_may_be_limited' };
      mockMedicineModel.findOneAndUpdate.mockResolvedValueOnce(mockMed);

      const res = await service.adminMarkShortage(
        { role: 'admin' },
        'med1',
        { status: 'availability_may_be_limited', notes: 'Shortage noted' }
      );

      expect(res).toBeDefined();
      expect(mockMedicineModel.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'med1' },
        { availability_status: 'availability_may_be_limited', shortage_notes: 'Shortage noted' },
        { new: true }
      );
    });
  });
});
