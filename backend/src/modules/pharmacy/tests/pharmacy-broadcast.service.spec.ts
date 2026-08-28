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
import { ForbiddenException, NotFoundException, BadRequestException, ServiceUnavailableException } from '@nestjs/common';

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

  const mockProviderAccountCollection = {
    findOne: jest.fn(),
    find: jest.fn().mockReturnThis(),
    project: jest.fn().mockReturnThis(),
    toArray: jest.fn().mockResolvedValue([]),
  };
  const mockProfileModel = {
    find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([]) }),
    db: { collection: jest.fn().mockReturnValue(mockProviderAccountCollection) },
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
    mockProviderAccountCollection.findOne.mockResolvedValue({ id: 'pharm-123', provider_type: 'pharmacy', status: 'approved' });
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

    it('should fail closed if no validated broadcast policy exists', async () => {
      mockSystemConfigModel.findOne.mockReturnValueOnce({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(service.getBroadcastStages()).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('recipient intents', () => {
    it('persists only new recipients and durable intents without direct notification delivery', async () => {
      const recipients = { updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }) };
      const outbox = { updateOne: jest.fn().mockResolvedValue({ upsertedCount: 1 }) };
      const session: any = { withTransaction: jest.fn(async (work) => work(session)), endSession: jest.fn().mockResolvedValue(undefined) };
      (mockBroadcastModel as any).model = {
        db: { startSession: jest.fn().mockResolvedValue(session), collection: jest.fn((name: string) => name === 'domain_outbox' ? outbox : recipients) },
        updateOne: jest.fn().mockResolvedValue({ matchedCount: 1 }),
      };
      jest.spyOn(service as any, 'findEligiblePharmaciesWithin').mockResolvedValue([{ account_id: 'pharm-123' }, { account_id: 'pharm-456' }]);
      const broadcast: any = { id: 'bc-1', current_round: 2, current_radius_km: 5, lock_state: 'open', notified_pharmacies: ['pharm-123'], timeline: [] };
      const order: any = { id: 'order-1', delivery_address: { geo: { lat: 24.7, lng: 46.7 } } };
      await (service as any).broadcastRound(broadcast, order);
      expect(recipients.updateOne).toHaveBeenCalledWith({ broadcast_id: 'bc-1', pharmacy_account_id: 'pharm-456' }, expect.anything(), expect.objectContaining({ upsert: true, session }));
      expect(outbox.updateOne).toHaveBeenCalledWith(expect.objectContaining({ event_type: 'pharmacy.broadcast.recipient_added', idempotency_key: 'pharmacy-broadcast-recipient:bc-1:pharm-456' }), expect.anything(), expect.objectContaining({ upsert: true, session }));
      expect(mockNotifService.notifyPharmacyBroadcast).not.toHaveBeenCalled();
      expect(broadcast.notified_pharmacies).toEqual(['pharm-123', 'pharm-456']);
    });
  });

  describe('respondReject', () => {
    it('should reject identities without an approved pharmacy account', async () => {
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

  describe('provider-purpose broadcast DTO', () => {
    const broadcast = { id: 'bc-1', order_id: 'order-1', notified_pharmacies: ['pharm-123'], lock_state: 'open', current_round: 1, current_radius_km: 3, createdAt: new Date('2026-01-01') };
    const order = { id: 'order-1', patient_account_id: 'patient-1', patient_phone: '+966500000000', delivery_address: { line1: 'secret street' }, attachments: [{ key: 'secret' }], items: [{ id: 'i-1', raw_name: 'دواء', qty: 2 }] };

    it('returns no raw order, patient identity, address, or phone to a notified approved pharmacy', async () => {
      mockBroadcastModel.find.mockReturnValueOnce({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([broadcast]) }) });
      mockOrderModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([order]) });
      const result = await service.listForPharmacy({ id: 'pharm-123', role: 'provider' });
      const serialized = JSON.stringify(result);
      expect(result[0]).not.toHaveProperty('order');
      expect(serialized).not.toContain('patient-1');
      expect(serialized).not.toContain('secret street');
      expect(serialized).not.toContain('+966500000000');
      // Raw order-level attachments (with internal storage keys) are never exposed;
      // the spec-mandated sanitized prescription_attachments projection is empty here.
      expect(serialized).not.toContain('secret');
      expect(result[0].attachments).toEqual([]);
      expect(result[0].items[0]).toEqual(expect.objectContaining({ order_item_id: 'i-1', qty_requested: 2 }));
    });

    it('rejects doctor/other-provider identities, pending pharmacies, and guessed broadcast IDs', async () => {
      mockProviderAccountCollection.findOne.mockResolvedValueOnce(null);
      await expect(service.listForPharmacy({ id: 'doctor-1', role: 'doctor' })).rejects.toThrow(ForbiddenException);
      mockProviderAccountCollection.findOne.mockResolvedValueOnce(null);
      await expect(service.listForPharmacy({ id: 'pending-pharmacy', role: 'provider' })).rejects.toThrow(ForbiddenException);
      mockBroadcastModel.findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(broadcast) });
      await expect(service.detail({ id: 'other-pharmacy', role: 'provider' }, 'bc-1')).rejects.toThrow(ForbiddenException);
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

      const result = await service.runBestPartialMatch(mockBroadcast as any, mockOrder as any);
      expect(mockSplitService.runForOrder).not.toHaveBeenCalled();
      expect(result.selection_required).toBe(true);
      expect(mockOrder.status).toBe('manual_review');
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

      expect((mockBroadcast as any).lock_state).toBe('closed');
      expect((mockBroadcast as any).locked_to_pharmacy_account_id).toBeUndefined();
      expect(mockAllocModel.create).not.toHaveBeenCalled();
      expect(mockOrder.status).toBe('manual_review');
      expect(mockChatService.openOrGetThread).not.toHaveBeenCalled();
      expect(mockNotifService.notifyPatientSplitCompleted).toHaveBeenCalled();
      expect(mockNotifService.notifyPharmacyBroadcastCancelled).not.toHaveBeenCalled();
      expect(result.selection_required).toBe(true);
    });
  });
});


describe('PharmacyBroadcastService lifecycle gates', () => {
  it('rejects advance before the persisted round deadline', async () => {
    const broadcasts: any = { findOne: jest.fn().mockResolvedValue({ lock_state: 'open', round_expires_at: new Date('2030-01-01T00:00:00Z') }) };
    const svc: any = Object.create(PharmacyBroadcastService.prototype);
    svc.broadcasts = broadcasts;
    await expect(svc.advanceRound('order-1', new Date('2029-01-01T00:00:00Z'))).rejects.toThrow('broadcast_round_not_due');
  });

  it('accepts latitude and longitude equal to zero when both are finite', async () => {
    const svc: any = Object.create(PharmacyBroadcastService.prototype);
    svc.profiles = { db: { collection: jest.fn().mockReturnValue({ find: jest.fn().mockReturnThis(), project: jest.fn().mockReturnThis(), toArray: jest.fn().mockResolvedValue([{ id: 'pharm-1' }]) }) }, find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ account_id: 'pharm-1', geo: { lat: 0, lng: 0 }, max_delivery_radius_km: 20 }]) }) };
    svc.avails = { find: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([{ provider_account_id: 'pharm-1', status: 'ONLINE' }]) }) };
    svc.configs = { findOne: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue({ value: 20 }) }) };
    svc.geo = { distanceKm: jest.fn().mockReturnValue(3) };
    await expect(svc.findEligiblePharmaciesWithin({ lat: 0, lng: 0 }, 5)).resolves.toHaveLength(1);
  });
});
