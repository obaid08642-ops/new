import { LabPdfService } from './lab-pdf.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { LabsService } from './labs.service';
import { LabBookingState } from '../../schemas/lab.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';

describe('LabsService', () => {
  let service: LabsService;

  const createMockModel = () => ({
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    create: jest.fn(),
    countDocuments: jest.fn(),
    deleteOne: jest.fn(),
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
    emit: jest.fn().mockResolvedValue(undefined),
  };
  const mockInsuranceFlow = { createRequest: jest.fn() };

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
        { provide: InsuranceFlowService, useValue: mockInsuranceFlow },
      ],
    }).compile();

    service = module.get<LabsService>(LabsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('governed insurance booking creation', () => {
    const patient = { id: 'patient-a', role: 'patient', full_name: 'Patient A', phone: '0500000000' };
    const payload = { items: [{ service_id: 'lab-service-1' }], scheduled_at: '2027-08-20T10:00:00.000Z', location_type: 'facility', provider_account_id: 'provider-a', payment_method: 'insurance', insurance_provider: 'insurer-a' };
    const labService = { id: 'lab-service-1', name_ar: 'تحليل', name_en: 'Test', price: 100, sample_type: 'blood', fasting_required: false, home_visit_supported: true };

    beforeEach(() => {
      mockLabService.find.mockResolvedValue([labService]);
      mockLabBooking.countDocuments.mockResolvedValue(0);
      mockLabBooking.find.mockReturnValue(mockLabBooking);
      mockLabBooking.lean.mockResolvedValue([]);
      mockLabBooking.deleteOne.mockResolvedValue({ deletedCount: 1 });
      mockWorkflowEngine.announceCreated.mockClear();
      mockEventBus.emit.mockClear();
      mockInsuranceFlow.createRequest.mockReset();
    });

    it('creates the owned insurance request from the new server-priced booking and persists only its identifiers', async () => {
      const booking: any = { id: 'lab-booking-1', state: LabBookingState.NEW_REQUEST, tracking_id: 'LAB-1', location_type: 'facility', save: jest.fn(), toObject: jest.fn(function (this: any) { return { id: this.id, insurance_request_id: this.insurance_request_id, insurance_review_state: this.insurance_review_state }; }) };
      mockLabBooking.create.mockResolvedValue(booking);
      mockInsuranceFlow.createRequest.mockResolvedValue({ id: 'insurance-request-1', state: 'PENDING_PROVIDER_REVIEW', price: 100, provider_id: 'provider-a' });

      const result = await service.book(patient, payload);

      expect(mockInsuranceFlow.createRequest).toHaveBeenCalledWith(patient, { booking_id: 'lab-booking-1', booking_kind: 'lab' });
      expect(booking.save).toHaveBeenCalledTimes(1);
      expect(result).toEqual({ id: 'lab-booking-1', insurance_request_id: 'insurance-request-1', insurance_review_state: 'PENDING_PROVIDER_REVIEW' });
      expect(mockWorkflowEngine.announceCreated).toHaveBeenCalledTimes(1);
    });

    it('removes the unconfirmed booking and emits no creation workflow when request creation fails', async () => {
      const booking: any = { id: 'lab-booking-2', state: LabBookingState.NEW_REQUEST, tracking_id: 'LAB-2', location_type: 'facility', save: jest.fn(), toObject: jest.fn() };
      mockLabBooking.create.mockResolvedValue(booking);
      mockInsuranceFlow.createRequest.mockRejectedValue(new BadRequestException('NO_INSURANCE_POLICY'));

      await expect(service.book(patient, payload)).rejects.toThrow('NO_INSURANCE_POLICY');

      expect(mockLabBooking.deleteOne).toHaveBeenCalledWith({ id: 'lab-booking-2', patient_id: 'patient-a', state: { $in: [LabBookingState.NEW_REQUEST, LabBookingState.PENDING_INSURANCE] } });
      expect(mockWorkflowEngine.announceCreated).not.toHaveBeenCalled();
      expect(mockEventBus.emit).not.toHaveBeenCalled();
    });
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
        state: LabBookingState.CONFIRMED,
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
      expect(mockWorkflowEngine.apply).toHaveBeenCalledWith(expect.objectContaining({ to_domain: LabBookingState.SAMPLE_COLLECTED }));
    });

    it('rejects sample registration before the booking is confirmed', async () => {
      mockLabBooking.findOne.mockResolvedValueOnce({ id: 'order1', patient_id: 'p1', provider_account_id: 'u1', state: LabBookingState.NEW_REQUEST, state_history: [] });
      mockLabSample.findOne.mockResolvedValueOnce(null);
      await expect(service.registerSample({ id: 'u1', role: 'lab' }, { lab_order_id: 'order1', barcode: 'BC124', tests: ['t1'] }))
        .rejects.toThrow('invalid_transition_NEW_REQUEST_to_SAMPLE_COLLECTED');
      expect(mockLabSample.create).not.toHaveBeenCalled();
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

    it('uses the workflow engine for a legal received-to-analyzing transition', async () => {
      mockLabSample.findOne.mockResolvedValueOnce({ id: 'sample-a', lab_order_id: 'order-a', stage: 'received' });
      const booking = { id: 'order-a', patient_id: 'patient-a', provider_account_id: 'lab-a', state: LabBookingState.SAMPLE_COLLECTED, state_history: [], save: jest.fn() };
      mockLabBooking.findOne.mockResolvedValueOnce(booking);
      await expect(service.updateSampleStage({ id: 'lab-a', role: 'lab' }, 'sample-a', 'analyzing')).resolves.toEqual({ ok: true, stage: 'analyzing' });
      expect(mockWorkflowEngine.apply).toHaveBeenCalledWith(expect.objectContaining({ to_domain: LabBookingState.PROCESSING }));
      expect(mockLabSample.updateOne).toHaveBeenCalled();
    });

    it('rejects an illegal received-to-result-ready sample jump without changing state', async () => {
      mockLabSample.findOne.mockResolvedValueOnce({ id: 'sample-a', lab_order_id: 'order-a', stage: 'received' });
      mockLabBooking.findOne.mockResolvedValueOnce({ id: 'order-a', provider_account_id: 'lab-a', state: LabBookingState.SAMPLE_COLLECTED });
      await expect(service.updateSampleStage({ id: 'lab-a', role: 'lab' }, 'sample-a', 'result_ready')).rejects.toThrow('invalid_sample_transition_received_to_result_ready');
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
