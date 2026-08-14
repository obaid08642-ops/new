import { LabPdfService } from './lab-pdf.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LabsService } from './labs.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('LabsService', () => {
  let service: LabsService;

  const createMockModel = () => ({
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    lean: jest.fn(),
    sort: jest.fn().mockReturnThis(),
  });

  let mockLabService: ReturnType<typeof createMockModel>;
  let mockLabBooking: ReturnType<typeof createMockModel>;
  let mockLabSample: ReturnType<typeof createMockModel>;

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockEventBus = {
    emit: jest.fn(),
  };

  const mockWorkflowEngine = {
    announceCreated: jest.fn(),
    apply: jest.fn().mockImplementation(async (opts: any) => {
      if (opts.mutate) return await opts.mutate();
      return opts;
    }),
  };

  beforeEach(async () => {
    mockLabService = createMockModel();
    mockLabBooking = createMockModel();
    mockLabSample = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabsService,
        { provide: LabPdfService, useValue: {} },
        { provide: 'LabServiceRepository', useValue: mockLabService },
        { provide: 'LabBookingRepository', useValue: mockLabBooking },
        { provide: 'LabSampleRepository', useValue: mockLabSample },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngine },
      ],
    }).compile();

    service = module.get<LabsService>(LabsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('registerSample', () => {
    it('should throw if barcode already registered', async () => {
      mockLabBooking.findOne.mockResolvedValueOnce({
        id: 'order1',
        patient_id: 'p1',
      });
      mockLabSample.findOne.mockResolvedValueOnce({ id: 'existing-sample' });

      await expect(
        service.registerSample({ id: 'u1', role: 'lab' }, {
          lab_order_id: 'order1',
          barcode: 'BC123',
          tests: ['t1'],
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('should register sample and update booking state', async () => {
      mockLabBooking.findOne.mockResolvedValueOnce({
        id: 'order1',
        patient_id: 'p1',
        state: 'confirmed',
        state_history: [],
        save: jest.fn(),
      });
      mockLabSample.findOne.mockResolvedValueOnce(null); // No existing sample
      mockLabSample.create.mockResolvedValueOnce({ id: 'sample1', barcode: 'BC123' });

      const res = await service.registerSample({ id: 'u1', role: 'lab' }, {
        lab_order_id: 'order1',
        barcode: 'BC123',
        tests: ['t1'],
      });

      expect(res).toBeDefined();
      expect(res.id).toBe('sample1');
    });
  });

  describe('updateSampleStage', () => {
    it('should throw if sample not found', async () => {
      mockLabSample.findOne.mockResolvedValueOnce(null);
      await expect(
        service.updateSampleStage({ id: 'u1', role: 'lab' }, 'sample-not-found', 'analyzing')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
