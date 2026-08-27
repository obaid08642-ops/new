import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PharmacyBroadcastService } from '../services/pharmacy-broadcast.service';
import { RedisService } from '../../redis/redis.service';
import { SystemConfig } from '../../../schemas/system-config.schema';
import { DrugRejectionLog } from '../../../schemas/drug-rejection-log.schema';
import { Medicine } from '../../../schemas/medicine.schema';
import { GeoEngineService } from '../../provider/services/geo-engine.service';
import { SmartSplitService } from '../services/smart-split.service';
import { PharmacyNotificationService } from '../services/pharmacy-notification.service';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyShortageService } from '../services/pharmacy-shortage.service';
import { PharmacyChatService } from '../services/pharmacy-chat.service';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';

describe('PharmacyBroadcastService', () => {
  let service: PharmacyBroadcastService;

  const mockOrderModel = {
    findOne: jest.fn(),
    find: jest.fn(),
  };

  const mockAllocModel = {
    create: jest.fn(),
  };

  const mockBroadcastModel = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockInvModel = {
    findOne: jest.fn(),
    findOneAndUpdate: jest.fn(),
  };

  const mockProfileModel = {
    find: jest.fn(),
    db: {
      collection: jest.fn().mockReturnThis(),
      find: jest.fn().mockReturnThis(),
      project: jest.fn().mockReturnThis(),
      toArray: jest.fn().mockResolvedValue([]),
    },
  };

  const mockAvailsModel = {
    find: jest.fn(),
  };

  const mockSystemConfigModel = {
    findOne: jest.fn(),
  };

  const mockDrugRejectionLogModel = {};
  const mockMedicineModel = {
    findOne: jest.fn(),
  };

  const mockGeoService = {
    distanceKm: jest.fn().mockReturnValue(1.5),
  };

  const mockSplitService = {
    runForOrder: jest.fn(),
  };

  const mockNotifService = {
    notifyPharmacyBroadcast: jest.fn().mockResolvedValue(null),
    notifyPharmacyBroadcastCancelled: jest.fn().mockResolvedValue(null),
    notifyPatientSplitCompleted: jest.fn().mockResolvedValue(null),
  };

  const mockEventBus = {
    emit: jest.fn().mockResolvedValue(null),
  };

  const mockShortageService = {
    logAcceptance: jest.fn().mockResolvedValue(null),
    logRejection: jest.fn().mockResolvedValue(null),
  };

  const mockChatService = {
    openOrGetThread: jest.fn().mockResolvedValue({ id: 'thread-123' }),
    postMessage: jest.fn().mockResolvedValue(null),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        { provide: RedisService, useValue: { setJson: jest.fn().mockResolvedValue(undefined), getJson: jest.fn().mockResolvedValue(null), del: jest.fn().mockResolvedValue(undefined), ttl: jest.fn().mockResolvedValue(60), incr: jest.fn().mockResolvedValue(1), expire: jest.fn().mockResolvedValue(undefined), client: { set: jest.fn(), get: jest.fn(), del: jest.fn(), ttl: jest.fn(), incr: jest.fn(), expire: jest.fn() } } },
        { provide: 'PharmacyAllocationRepository', useValue: {} },
        PharmacyBroadcastService,
        { provide: 'PharmacyOrderRepository', useValue: mockOrderModel },
        { provide: 'PharmacyAllocationRepository', useValue: mockAllocModel },
        { provide: 'PharmacyBroadcastRepository', useValue: mockBroadcastModel },
        { provide: 'PharmacyInventoryItemRepository', useValue: mockInvModel },
        { provide: 'ProviderAccountProfileRepository', useValue: mockProfileModel },
        { provide: 'ProviderAvailabilityRepository', useValue: mockAvailsModel },
        { provide: 'SystemConfigRepository', useValue: mockSystemConfigModel },
        { provide: 'DrugRejectionLogRepository', useValue: mockDrugRejectionLogModel },
        { provide: 'MedicineRepository', useValue: mockMedicineModel },
        { provide: GeoEngineService, useValue: mockGeoService },
        { provide: SmartSplitService, useValue: mockSplitService },
        { provide: PharmacyNotificationService, useValue: mockNotifService },
        { provide: EventBusService, useValue: mockEventBus },
        { provide: PharmacyShortageService, useValue: mockShortageService },
        { provide: PharmacyChatService, useValue: mockChatService },
      ],
    }).compile();

    service = module.get<PharmacyBroadcastService>(PharmacyBroadcastService);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getBroadcastStages', () => {
    it('should return system config value if exists and is array', async () => {
      const mockStages = [
        { stage: 1, radius_km: 4, timeout_seconds: 60 },
      ];
      mockSystemConfigModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue({ value: mockStages }),
      });

      const result = await service.getBroadcastStages();
      expect(result).toEqual(mockStages);
      expect(mockSystemConfigModel.findOne).toHaveBeenCalledWith({ key: 'pharmacy_broadcast_stages' });
    });

    it('should return default fallback if no config exists', async () => {
      mockSystemConfigModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      const result = await service.getBroadcastStages();
      expect(result).toHaveLength(3);
      expect(result[0].radius_km).toBe(3);
    });
  });

  describe('respondReject', () => {
    it('should throw ForbiddenException if user is not provider', async () => {
      await expect(service.respondReject({ role: 'patient' }, 'order-123')).rejects.toThrow(ForbiddenException);
    });

    it('should throw NotFoundException if broadcast does not exist', async () => {
      mockBroadcastModel.findOne.mockResolvedValueOnce(null);
      await expect(service.respondReject({ role: 'provider', id: 'pharm-123' }, 'order-123')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if broadcast is already locked', async () => {
      mockBroadcastModel.findOne.mockResolvedValueOnce({
        lock_state: 'locked',
        notified_pharmacies: ['pharm-123'],
      });
      await expect(service.respondReject({ role: 'provider', id: 'pharm-123' }, 'order-123')).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if pharmacy is not notified', async () => {
      mockBroadcastModel.findOne.mockResolvedValueOnce({
        lock_state: 'open',
        notified_pharmacies: ['other-pharm'],
      });
      await expect(service.respondReject({ role: 'provider', id: 'pharm-123' }, 'order-123')).rejects.toThrow(ForbiddenException);
    });

    it('should decline successfully and log rejection to shortage engine', async () => {
      const mockSave = jest.fn().mockResolvedValue(true);
      const mockBroadcast = {
        lock_state: 'open',
        notified_pharmacies: ['pharm-123'],
        responses: [],
        timeline: [],
        markModified: jest.fn(),
        save: mockSave,
      };
      mockBroadcastModel.findOne.mockResolvedValueOnce(mockBroadcast);

      const mockOrder = {
        id: 'order-123',
        items: [
          { id: 'item-1', matched_sku: 'sku-1', raw_name: 'Med 1' },
        ],
      };
      mockOrderModel.findOne.mockResolvedValueOnce(mockOrder);

      mockMedicineModel.findOne.mockReturnValueOnce({
        id: 'med-123',
      });

      const result = await service.respondReject({ role: 'provider', id: 'pharm-123' }, 'order-123', { reason: 'No stock' });
      expect(result).toEqual({ ok: true });
      expect(mockBroadcast.responses).toHaveLength(1);
      expect(mockBroadcast.responses[0].response).toBe('declined');
      expect(mockShortageService.logRejection).toHaveBeenCalledWith('med-123', 'order-123', 'pharm-123');
      expect(mockSave).toHaveBeenCalled();
    });
  });

  describe('runBestPartialMatch', () => {
    it('should fallback to smart split if no partial responses exist', async () => {
      const mockBroadcast = {
        id: 'bc-123',
        responses: [],
        timeline: [],
        save: jest.fn(),
      };
      const mockOrder = {
        id: 'order-123',
        status: '',
        timeline: [],
        save: jest.fn().mockResolvedValue(true),
        toObject: function() { return this; },
      };
      mockOrderModel.findOne.mockResolvedValueOnce(mockOrder);
      mockSplitService.runForOrder.mockResolvedValueOnce({
        status: 'allocating',
        toObject: () => ({ status: 'allocating' }),
      });

      const result = await service.runBestPartialMatch(mockBroadcast as any, mockOrder as any);
      expect(mockSplitService.runForOrder).toHaveBeenCalledWith('order-123');
      expect(result.status).toBe('allocating');
    });

    it('should allocate to the best partial pharmacy based on items count, distance, and alternatives', async () => {
      const mockSaveBroadcast = jest.fn().mockResolvedValue(true);
      const mockBroadcast = {
        id: 'bc-123',
        current_radius_km: 5,
        current_round: 2,
        responses: [
          {
            pharmacy_account_id: 'pharm-worse',
            response: 'partial',
            distance_km: 4,
            items: [
              { order_item_id: 'item-1', have: 'yes', qty_available: 1, unit_price: 10 },
              { order_item_id: 'item-2', have: 'no' },
            ],
          },
          {
            pharmacy_account_id: 'pharm-best',
            response: 'partial',
            distance_km: 2,
            items: [
              { order_item_id: 'item-1', have: 'yes', qty_available: 1, unit_price: 10 },
              { order_item_id: 'item-2', have: 'alternative', alternative: { sku: 'alt-sku', name: 'Alt Med' }, qty_available: 1, unit_price: 12 },
            ],
          },
        ],
        timeline: [],
        notified_pharmacies: ['pharm-best', 'pharm-worse'],
        save: mockSaveBroadcast,
        toObject: function() { return this; },
      };

      const mockSaveOrder = jest.fn().mockResolvedValue(true);
      const mockOrder = {
        id: 'order-123',
        patient_account_id: 'pat-123',
        items: [
          { id: 'item-1', qty: 1, matched_sku: 'sku-1', name_ar: 'Med 1' },
          { id: 'item-2', qty: 1, matched_sku: 'sku-2', name_ar: 'Med 2' },
        ],
        allocations: [],
        splits_count: 0,
        split_strategy: '',
        status: '',
        timeline: [],
        save: mockSaveOrder,
      };

      const mockAlloc = {
        id: 'alloc-123',
        toObject: function() { return this; },
      };
      mockAllocModel.create.mockResolvedValueOnce(mockAlloc);

      const result = await service.runBestPartialMatch(mockBroadcast as any, mockOrder as any);

      expect((mockBroadcast as any).lock_state).toBe('locked');
      expect((mockBroadcast as any).locked_to_pharmacy_account_id).toBe('pharm-best');
      expect(mockAllocModel.create).toHaveBeenCalled();
      expect(mockOrder.status).toBe('negotiating_substitutes');
      expect(mockChatService.openOrGetThread).toHaveBeenCalled();
      expect(mockNotifService.notifyPatientSplitCompleted).toHaveBeenCalled();
      expect(mockNotifService.notifyPharmacyBroadcastCancelled).toHaveBeenCalledWith('pharm-worse', 'order-123', 'won_by_other_pharmacy');
    });
  });
});
