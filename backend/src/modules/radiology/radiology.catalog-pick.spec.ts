import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { RadiologyOpsService } from './radiology.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { InsuranceFlowService } from '../insurance-engine/insurance-engine.module';
import { RedisService } from '../redis/redis.service';
import { pick } from '../../common/sanitize';

/**
 * P3.3 (F15) mass-assignment: catalog writes must pick() allowed fields —
 * sending {id, _id, ...} must not overwrite identity/governance fields.
 */
describe('P3.3 catalog mass-assignment guard (Radiology)', () => {
  it('pick() keeps only allowed keys', () => {
    expect(pick({ id: 'x', _id: 'y', price: 1, name_ar: 'n' } as any, ['price', 'name_ar'] as const))
      .toEqual({ price: 1, name_ar: 'n' });
    expect(pick(null as any, ['a'] as const)).toEqual({});
  });

  describe('RadiologyOpsService.updateCatalog', () => {
    let service: RadiologyOpsService;
    let mockSvc: { findOneAndUpdate: jest.Mock; create: jest.Mock };

    beforeEach(async () => {
      mockSvc = { findOneAndUpdate: jest.fn(), create: jest.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          RadiologyOpsService,
          { provide: getModelToken('RadiologyService'), useValue: mockSvc },
          { provide: getModelToken('RadiologyBooking'), useValue: {} },
          { provide: getModelToken('RadiologyCenterBooking'), useValue: {} },
          { provide: getModelToken('User'), useValue: {} },
          { provide: getModelToken('LabResult'), useValue: {} },
          { provide: getModelToken('StorageObject'), useValue: {} },
          { provide: getModelToken('ProviderProfile'), useValue: {} },
          { provide: WorkflowEngineService, useValue: {} },
          { provide: InsuranceFlowService, useValue: {} },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: RedisService, useValue: { getWithSWR: undefined } },
        ],
      }).compile();
      service = module.get<RadiologyOpsService>(RadiologyOpsService);
    });

    it('strips id/_id and caller-supplied governance fields from $set, keeps price', async () => {
      mockSvc.findOneAndUpdate.mockResolvedValueOnce({ id: 'rad-1' });
      await service.updateCatalog({ role: 'admin', id: 'adm-1' }, 'rad-1', {
        id: 'x', _id: 'y', price: 99, public_eligibility: true, provenance: 'forged', last_reviewed: 'x', medical_review_status: 'bogus',
      } as any);
      expect(mockSvc.findOneAndUpdate).toHaveBeenCalledWith({ id: 'rad-1' }, { $set: { price: 99 } }, { new: true });
    });

    it('publication is derived from a valid medical review status and records the reviewer', async () => {
      mockSvc.findOneAndUpdate.mockResolvedValueOnce({ id: 'rad-1' });
      await service.updateCatalog({ role: 'admin', id: 'adm-1' }, 'rad-1', { medical_review_status: 'approved', public_eligibility: false } as any);
      const set = mockSvc.findOneAndUpdate.mock.calls[0][1].$set;
      expect(set).toEqual(expect.objectContaining({ medical_review_status: 'approved', public_eligibility: true, provenance: 'admin_catalog:adm-1' }));
      mockSvc.findOneAndUpdate.mockResolvedValueOnce({ id: 'rad-1' });
      await service.updateCatalog({ role: 'admin', id: 'adm-1' }, 'rad-1', { medical_review_status: 'suspended' } as any);
      expect(mockSvc.findOneAndUpdate.mock.calls[1][1].$set.public_eligibility).toBe(false);
    });

    it('createCatalog never takes caller id', async () => {
      mockSvc.create.mockResolvedValueOnce({ id: 'generated' });
      await service.createCatalog({ role: 'admin', id: 'adm-1' }, { id: 'x', name_ar: 'أ', name_en: 'R1', modality: 'xray', price: 100 } as any);
      const arg = mockSvc.create.mock.calls[0][0];
      expect(arg.id).not.toBe('x');
      expect(arg.name_en).toBe('R1');
      expect(arg.public_eligibility).toBeUndefined();
    });
  });
});