import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { HomeCareSvc } from './home-care.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('HomeCareSvc', () => {
  let service: HomeCareSvc;

  const createMockModel = () => ({
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    lean: jest.fn(),
    sort: jest.fn().mockReturnThis(),
  });

  let mockHomeCareService: ReturnType<typeof createMockModel>;
  let mockHomeCareBooking: ReturnType<typeof createMockModel>;
  let mockNursingVisitReport: ReturnType<typeof createMockModel>;
  let mockCarePlan: ReturnType<typeof createMockModel>;
  let mockMedicalSupplyRequest: ReturnType<typeof createMockModel>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockWorkflowEngine = {
    apply: jest.fn().mockImplementation(async (opts: any) => {
      if (opts.mutate) return await opts.mutate();
      return opts;
    }),
  };

  beforeEach(async () => {
    mockHomeCareService = createMockModel();
    mockHomeCareBooking = createMockModel();
    mockNursingVisitReport = createMockModel();
    mockCarePlan = createMockModel();
    mockMedicalSupplyRequest = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HomeCareSvc,
        { provide: 'HomeCareServiceRepository', useValue: mockHomeCareService },
        { provide: 'HomeCareBookingRepository', useValue: mockHomeCareBooking },
        { provide: 'NursingVisitReportRepository', useValue: mockNursingVisitReport },
        { provide: 'CarePlanRepository', useValue: mockCarePlan },
        { provide: 'MedicalSupplyRequestRepository', useValue: mockMedicalSupplyRequest },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngine },
      ],
    }).compile();

    service = module.get<HomeCareSvc>(HomeCareSvc);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('checkIn', () => {
    it('should check in nurse and change booking state', async () => {
      mockHomeCareBooking.findOne.mockResolvedValue({
        id: 'booking1',
        state: 'confirmed',
        state_history: [],
        patient_id: 'patient1',
        save: jest.fn(),
        toObject: jest.fn().mockReturnValue({ id: 'booking1', state: 'confirmed' }),
      });
      mockNursingVisitReport.create.mockResolvedValueOnce({
        id: 'visit1',
        home_care_order_id: 'booking1',
        check_in_time: new Date(),
      });

      const res = await service.checkIn({ id: 'nurse1', role: 'nurse' }, 'booking1', 24.7742, 46.7385);
      expect(res).toBeDefined();
      expect(res.id).toBe('visit1');
    });
  });
});
