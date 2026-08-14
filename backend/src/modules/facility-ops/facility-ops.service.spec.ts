import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BedsService, ShiftsService, SurgeriesService } from './facility-ops.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('FacilityOps Services', () => {
  let bedsSvc: BedsService;
  let shiftsSvc: ShiftsService;
  let surgeriesSvc: SurgeriesService;

  const mockModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    countDocuments: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    lean: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BedsService,
        ShiftsService,
        SurgeriesService,
        { provide: getModelToken('Ward'), useValue: mockModel },
        { provide: getModelToken('Bed'), useValue: mockModel },
        { provide: getModelToken('Admission'), useValue: mockModel },
        { provide: getModelToken('Shift'), useValue: mockModel },
        { provide: getModelToken('Attendance'), useValue: mockModel },
        { provide: getModelToken('SurgeryBooking'), useValue: mockModel },
      ],
    }).compile();

    bedsSvc = module.get<BedsService>(BedsService);
    shiftsSvc = module.get<ShiftsService>(ShiftsService);
    surgeriesSvc = module.get<SurgeriesService>(SurgeriesService);
  });

  it('should be defined', () => {
    expect(bedsSvc).toBeDefined();
    expect(shiftsSvc).toBeDefined();
    expect(surgeriesSvc).toBeDefined();
  });

  describe('BedsService', () => {
    it('admitPatient should throw if bed occupied', async () => {
      mockModel.findOne.mockResolvedValueOnce({ id: 'bed1', status: 'occupied' });
      await expect(bedsSvc.admitPatient('fac1', 'p1', 'bed1')).rejects.toThrow(BadRequestException);
    });

    it('dischargePatient should throw if admission discharged', async () => {
      mockModel.findOne.mockResolvedValueOnce({ id: 'adm1', status: 'discharged' });
      await expect(bedsSvc.dischargePatient('fac1', 'adm1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('ShiftsService', () => {
    it('requestSubstitute should mark shift substitute', async () => {
      mockModel.findOne.mockResolvedValueOnce({ id: 'shift1', facility_id: 'fac1' });
      const res = await shiftsSvc.requestSubstitute('fac1', 'shift1');
      expect(res.ok).toBe(true);
    });
  });

  describe('SurgeriesService', () => {
    it('bookSurgery should book if no conflict', async () => {
      mockModel.findOne.mockResolvedValueOnce(null);
      mockModel.create.mockResolvedValueOnce({ id: 'surg1' });
      const res = await surgeriesSvc.bookSurgery('fac1', {
        patient_id: 'p1', primary_surgeon_id: 'd1', ot_room_number: 'OT-1',
        scheduled_at: new Date(), duration_mins: 60
      });
      expect(res).toBeDefined();
    });
  });
});
