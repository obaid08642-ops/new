import { LabPdfService } from './lab-pdf.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LabsService } from './labs.service';
import { LabBookingState } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';

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
  let mockProviderProfile: ReturnType<typeof createMockModel>;

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
    mockProviderProfile = createMockModel();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LabsService,
        { provide: LabPdfService, useValue: {} },
        { provide: 'LabServiceRepository', useValue: mockLabService },
        { provide: 'LabBookingRepository', useValue: mockLabBooking },
        { provide: 'LabSampleRepository', useValue: mockLabSample },
        { provide: getModelToken('ProviderProfile'), useValue: mockProviderProfile },
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

  describe('effective provider roles', () => {
    it('allows laboratory provider JWT to transition its booking', async () => {
      const booking = { id: 'order1', patient_id: 'p1', provider_account_id: 'provider-account', state: LabBookingState.NEW_REQUEST, state_history: [], save: jest.fn(), toObject: jest.fn().mockReturnThis() };
      mockLabBooking.findOne.mockResolvedValueOnce(booking);
      const result = await service.transition('order1', LabBookingState.CONFIRMED, {
        id: 'provider-account', role: 'provider', provider_type: 'laboratory',
      }, 'sandbox-confirm');
      expect(result.state).toBe(LabBookingState.CONFIRMED);
      expect(booking.save).toHaveBeenCalled();
    });
  });

  describe('booking ownership for tracking mutations', () => {
    it('rejects a different patient from rescheduling a booking', async () => {
      const booking = { id: 'order-a', patient_id: 'patient-a', provider_account_id: 'lab-a', state_history: [], save: jest.fn() };
      mockLabBooking.findOne.mockResolvedValueOnce(booking);
      await expect(service.rescheduleBooking('order-a', { id: 'patient-b', role: 'patient' }, { new_date: '2026-08-20T10:00:00.000Z' })).rejects.toThrow(ForbiddenException);
      expect(booking.save).not.toHaveBeenCalled();
    });

    it('allows the assigned laboratory provider to update GPS', async () => {
      const booking = { id: 'order-a', patient_id: 'patient-a', provider_account_id: 'lab-a', save: jest.fn() };
      mockLabBooking.findOne.mockResolvedValueOnce(booking);
      await expect(service.updateGps('order-a', { id: 'lab-a', role: 'provider', provider_type: 'laboratory' }, { lat: 24.7, lng: 46.6, eta: 8, distance: 2 })).resolves.toEqual({ ok: true, gps: { lat: 24.7, lng: 46.6, eta: 8, distance: 2 } });
      expect(booking.save).toHaveBeenCalled();
    });

    it('rejects a different provider from updating GPS', async () => {
      const booking = { id: 'order-a', patient_id: 'patient-a', provider_account_id: 'lab-a', save: jest.fn() };
      mockLabBooking.findOne.mockResolvedValueOnce(booking);
      await expect(service.updateGps('order-a', { id: 'lab-b', role: 'provider', provider_type: 'laboratory' }, { lat: 24.7, lng: 46.6 })).rejects.toThrow(ForbiddenException);
      expect(booking.save).not.toHaveBeenCalled();
    });
  });

  describe('registerSample', () => {
    it('should throw if barcode already registered', async () => {
      mockLabBooking.findOne.mockResolvedValueOnce({
        id: 'order1',
        patient_id: 'p1',
        provider_account_id: 'u1',
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
        provider_account_id: 'u1',
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

    it('rejects a different laboratory identity before changing another provider sample', async () => {
      mockLabSample.findOne.mockResolvedValueOnce({ id: 'sample-a', lab_order_id: 'order-a' });
      mockLabBooking.findOne.mockResolvedValueOnce({ id: 'order-a', provider_account_id: 'lab-a' });

      await expect(
        service.updateSampleStage({ id: 'lab-b', role: 'lab' }, 'sample-a', 'analyzing')
      ).rejects.toThrow(ForbiddenException);
      expect(mockLabSample.updateOne).not.toHaveBeenCalled();
    });
  });

  describe('listSamples ownership', () => {
    it('returns only the bookings owned by the requesting laboratory and never falls back to all samples', async () => {
      mockLabBooking.lean.mockResolvedValueOnce([{ id: 'order-a' }]);
      mockLabSample.lean.mockResolvedValueOnce([{ id: 'sample-a', lab_order_id: 'order-a' }]);

      await expect(service.listSamples({ id: 'lab-a', role: 'lab' })).resolves.toEqual([
        { id: 'sample-a', lab_order_id: 'order-a' },
      ]);
      expect(mockLabBooking.find).toHaveBeenCalledWith({ provider_account_id: 'lab-a' }, { id: 1 });
      expect(mockLabSample.find).toHaveBeenCalledWith({ lab_order_id: { $in: ['order-a'] } });
    });

    it('returns an empty list for a second laboratory with no owned bookings and does not query all samples', async () => {
      mockLabBooking.lean.mockResolvedValueOnce([]);

      await expect(service.listSamples({ id: 'lab-b', role: 'lab' })).resolves.toEqual([]);
      expect(mockLabBooking.find).toHaveBeenCalledWith({ provider_account_id: 'lab-b' }, { id: 1 });
      expect(mockLabSample.find).not.toHaveBeenCalled();
    });
  });
});
