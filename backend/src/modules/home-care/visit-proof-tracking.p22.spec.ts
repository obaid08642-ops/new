/**
 * P22.4 — home-care live position push + proof-of-visit + handover code.
 * Mocked repositories (no mongo-memory).
 */
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { HomeCareSvc } from './home-care.service';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';

const docOf = <T extends object>(obj: T) => ({
  ...obj,
  save: jest.fn().mockResolvedValue(true),
  markModified: jest.fn(),
  toObject() { const { save: _s, markModified: _m, toObject: _t, ...rest } = this as unknown as Record<string, unknown>; return rest; },
});

describe('HomeCareSvc P22.4 tracking + visit proof', () => {
  let svc: HomeCareSvc;
  let svcModel: { findOne: jest.Mock; find: jest.Mock; db: { collection: jest.Mock } };
  let bkgModel: { findOne: jest.Mock; create: jest.Mock; find: jest.Mock };
  let events: { emit: jest.Mock };

  const nurse = { id: 'nurse-1', role: 'nurse' };

  beforeEach(async () => {
    svcModel = {
      findOne: jest.fn(),
      find: jest.fn(),
      db: { collection: jest.fn(() => ({ findOne: jest.fn().mockResolvedValue({ account_id: 'nurse-1' }) })) },
    };
    bkgModel = { findOne: jest.fn(), create: jest.fn(), find: jest.fn() };
    events = { emit: jest.fn() };
    const mod: TestingModule = await Test.createTestingModule({
      providers: [
        HomeCareSvc,
        { provide: 'HomeCareServiceRepository', useValue: svcModel },
        { provide: 'HomeCareBookingRepository', useValue: bkgModel },
        { provide: 'NursingVisitReportRepository', useValue: {} },
        { provide: 'CarePlanRepository', useValue: {} },
        { provide: 'MedicalSupplyRequestRepository', useValue: {} },
        { provide: EventEmitter2, useValue: events },
        { provide: EventBusService, useValue: { emit: jest.fn().mockResolvedValue(undefined) } },
        { provide: WorkflowEngineService, useValue: { announceCreated: jest.fn(), apply: jest.fn() } },
      ],
    }).compile();
    svc = mod.get(HomeCareSvc);
    jest.clearAllMocks();
  });

  describe('pushPosition', () => {
    it('assigned nurse pushes live GPS; poll side can compute ETA', async () => {
      const b = docOf({ id: 'bk-1', patient_id: 'pat-1', provider_id: 'nurse-1', gps_tracking: {} as { current_lat?: number; current_lng?: number; last_updated?: Date } });
      bkgModel.findOne.mockResolvedValueOnce(b);
      const res = await svc.pushPosition(nurse, 'bk-1', { lat: 24.7136, lng: 46.6753 });
      expect(res).toEqual({ ok: true, position: { lat: 24.7136, lng: 46.6753 } });
      expect(b.gps_tracking.current_lat).toBe(24.7136);
      expect(events.emit).toHaveBeenCalledWith('homecare.position_updated', expect.objectContaining({ booking_id: 'bk-1' }));
    });

    it('rejects zero/missing coordinates (no fabricated positions)', async () => {
      const b = docOf({ id: 'bk-1', patient_id: 'pat-1', provider_id: 'nurse-1', gps_tracking: {} });
      bkgModel.findOne.mockResolvedValue(b);
      await expect(svc.pushPosition(nurse, 'bk-1', { lat: 0, lng: 0 })).rejects.toThrow(BadRequestException);
      await expect(svc.pushPosition(nurse, 'bk-1', {} as { lat: number; lng: number })).rejects.toThrow(BadRequestException);
      expect(b.save).not.toHaveBeenCalled();
    });

    it('rejects a nurse not assigned to the visit', async () => {
      bkgModel.findOne.mockResolvedValueOnce(docOf({ id: 'bk-1', patient_id: 'pat-1', provider_id: 'nurse-9', gps_tracking: {} }));
      await expect(svc.pushPosition(nurse, 'bk-1', { lat: 24.7, lng: 46.6 })).rejects.toThrow(ForbiddenException);
    });
  });

  describe('verifyVisitProof', () => {
    const booking = { visit_code: '482916' };

    it('accepts a signature, a photo URL, or the exact handover code', () => {
      expect(svc.verifyVisitProof(booking, { signature_base64: 'sig...' })).toBe('signature');
      expect(svc.verifyVisitProof(booking, { photo_proof_url: 'https://cdn.example/p.jpg' })).toBe('photo');
      expect(svc.verifyVisitProof(booking, { visit_code: '482916' })).toBe('visit_code');
    });

    it('rejects a wrong code and rejects missing proof', () => {
      expect(() => svc.verifyVisitProof(booking, { visit_code: '000000' })).toThrow(BadRequestException);
      expect(() => svc.verifyVisitProof(booking, {})).toThrow(BadRequestException);
      expect(() => svc.verifyVisitProof(booking, { photo_proof_url: 'not-a-url' })).toThrow(BadRequestException);
    });
  });

  describe('book() handover code', () => {
    it('issues a 6-digit visit_code the patient can hand to the nurse', async () => {
      const catalog = { id: 'svc-1', name_ar: 'تمريض', price: 200, duration: '60min' };
      svcModel.findOne.mockResolvedValueOnce(catalog);
      bkgModel.findOne.mockReturnValueOnce({ lean: jest.fn().mockResolvedValue(null) });
      bkgModel.create.mockImplementation(async (d: unknown) => docOf({ ...(d as object), id: 'bk-7' }));
      const when = new Date(Date.now() + 48 * 3600000).toISOString();
      const out = await svc.book(
        { id: 'pat-1', role: 'patient', full_name: 'P', phone: '5' },
        { service_id: 'svc-1', scheduled_at: when, provider_id: 'nurse-1', payment_method: 'card' },
      ) as unknown as { visit_code: string };
      expect(out.visit_code).toMatch(/^\d{6}$/);
    });
  });
});
