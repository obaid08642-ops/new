/**
 * P22.4 — ETA by location on catalog reads + cold-chain surfacing +
 * lab booking inside a booked slot window. Mocked models (no mongo-memory).
 */
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LabsService, homeCollectionEtaForCity, withDeliveryPromise, LAB_COLLECTION_ETA_DEFAULT_MINUTES } from './labs.service';
import { LabPdfService } from './lab-pdf.service';
import { VisitSlotsService } from './visit-slots.service';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';

const futureIso = (days: number, h: number) => {
  const d = new Date(Date.now() + days * 24 * 3600000);
  d.setUTCHours(h, 0, 0, 0);
  return d.toISOString();
};

const chain = <T>(v: T) => ({
  sort: jest.fn().mockReturnValue({ limit: jest.fn().mockResolvedValue(v) }),
});

describe('P22.4 lab delivery promise', () => {
  describe('homeCollectionEtaForCity', () => {
    it('returns the city zone ETA, default for unknown cities, null without a city', () => {
      expect(homeCollectionEtaForCity('Riyadh')).toBe(90);
      expect(homeCollectionEtaForCity('  RIYADH ')).toBe(90);
      expect(homeCollectionEtaForCity('Atlantis')).toBe(LAB_COLLECTION_ETA_DEFAULT_MINUTES);
      expect(homeCollectionEtaForCity('')).toBeNull();
      expect(homeCollectionEtaForCity(undefined)).toBeNull();
    });

    it('nulls the ETA for facility-only items', () => {
      expect(withDeliveryPromise({ home_visit_supported: true }, 'Riyadh').home_collection_eta_minutes).toBe(90);
      expect(withDeliveryPromise({ home_visit_supported: false }, 'Riyadh').home_collection_eta_minutes).toBeNull();
      expect(withDeliveryPromise({ home_visit_supported: true }, '').home_collection_eta_minutes).toBeNull();
    });
  });

  describe('LabsService catalog + slot booking', () => {
    let svc: LabsService;
    let svcModel: { find: jest.Mock; findOne: jest.Mock };
    let bkgModel: { find: jest.Mock; create: jest.Mock; countDocuments: jest.Mock };
    let visitSlots: { assertHoldForBooking: jest.Mock; consumeHoldForBooking: jest.Mock };

    const catalogRow = (over: Record<string, unknown> = {}) => ({
      id: 'svc-1', name_ar: 'CBC', home_visit_supported: true, cold_chain_required: true, price: 100,
      toObject() { const { toObject: _t, ...rest } = this as unknown as Record<string, unknown>; return rest; },
      ...over,
    });

    beforeEach(async () => {
      svcModel = { find: jest.fn(), findOne: jest.fn() };
      bkgModel = { find: jest.fn(), create: jest.fn(), countDocuments: jest.fn() };
      visitSlots = { assertHoldForBooking: jest.fn(), consumeHoldForBooking: jest.fn() };
      const mod: TestingModule = await Test.createTestingModule({
        providers: [
          LabsService,
          { provide: LabPdfService, useValue: {} },
          { provide: 'LabServiceRepository', useValue: svcModel },
          { provide: 'LabBookingRepository', useValue: bkgModel },
          { provide: 'LabSampleRepository', useValue: {} },
          { provide: getModelToken('ProviderProfile'), useValue: {} },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: EventBusService, useValue: { emit: jest.fn().mockResolvedValue(undefined) } },
          { provide: WorkflowEngineService, useValue: { announceCreated: jest.fn(), apply: jest.fn(async (o: { mutate: () => unknown }) => o.mutate?.()) } },
          { provide: VisitSlotsService, useValue: visitSlots },
        ],
      }).compile();
      svc = mod.get(LabsService);
      jest.clearAllMocks();
    });

    it('list() attaches ETA only when a city is given (no shape change otherwise)', async () => {
      svcModel.find.mockReturnValueOnce(chain([catalogRow()]));
      const withCity = await svc.list({ city: 'Riyadh' });
      expect((withCity as Array<{ home_collection_eta_minutes: number }>)[0].home_collection_eta_minutes).toBe(90);
      svcModel.find.mockReturnValueOnce(chain([catalogRow()]));
      const withoutCity = await svc.list({});
      expect(withoutCity).toHaveLength(1);
      expect('home_collection_eta_minutes' in ((withoutCity as unknown[])[0] as object)).toBe(false);
    });

    it('book() snapshots cold_chain_required from the catalog', async () => {
      svcModel.find.mockResolvedValueOnce([catalogRow()]);
      bkgModel.countDocuments.mockResolvedValueOnce(0);
      bkgModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
      bkgModel.create.mockImplementation(async (doc: unknown) => ({ ...(doc as object), id: 'bk-1', toObject() { return { ...(doc as object), id: 'bk-1' }; } }));
      const out = await svc.book(
        { id: 'pat-1', role: 'patient', full_name: 'P', phone: '5' },
        { items: [{ service_id: 'svc-1' }], scheduled_at: futureIso(2, 10), location_type: 'home', provider_account_id: 'lab-1', payment_method: 'card' },
      ) as { items: Array<{ cold_chain_required: boolean }> };
      expect(out.items[0].cold_chain_required).toBe(true);
    });

    it('book() inside a slot window records the slot and consumes the hold', async () => {
      const windowStart = futureIso(2, 9);
      const windowEnd = futureIso(2, 12);
      const scheduled = futureIso(2, 10);
      svcModel.find.mockResolvedValueOnce([catalogRow({ cold_chain_required: false })]);
      bkgModel.countDocuments.mockResolvedValueOnce(0);
      bkgModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
      visitSlots.assertHoldForBooking.mockResolvedValueOnce({
        slot: { id: 'slot-1', window_start: windowStart, window_end: windowEnd },
        hold: { id: 'hold-1' },
      });
      bkgModel.create.mockImplementation(async (doc: unknown) => ({ ...(doc as object), id: 'bk-9', toObject() { return { ...(doc as object), id: 'bk-9' }; } }));
      const out = await svc.book(
        { id: 'pat-1', role: 'patient' },
        { items: [{ service_id: 'svc-1' }], scheduled_at: scheduled, location_type: 'home', provider_account_id: 'lab-1', payment_method: 'card', visit_slot_id: 'slot-1' },
      ) as { visit_slot_id: string };
      expect(out.visit_slot_id).toBe('slot-1');
      expect(visitSlots.consumeHoldForBooking).toHaveBeenCalledWith('hold-1', 'pat-1', 'bk-9');
    });

    it('book() rejects scheduled_at outside the held window', async () => {
      svcModel.find.mockResolvedValueOnce([catalogRow()]);
      bkgModel.countDocuments.mockResolvedValueOnce(0);
      bkgModel.find.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue([]) });
      visitSlots.assertHoldForBooking.mockResolvedValueOnce({
        slot: { id: 'slot-1', window_start: futureIso(3, 9), window_end: futureIso(3, 12) },
        hold: { id: 'hold-1' },
      });
      await expect(svc.book(
        { id: 'pat-1', role: 'patient' },
        { items: [{ service_id: 'svc-1' }], scheduled_at: futureIso(2, 10), location_type: 'home', provider_account_id: 'lab-1', payment_method: 'card', visit_slot_id: 'slot-1' },
      )).rejects.toThrow(BadRequestException);
      expect(bkgModel.create).not.toHaveBeenCalled();
    });
  });
});
