import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { LabsService } from './labs.service';
import { LabPdfService } from './lab-pdf.service';
import { EventBusService } from '../events/event-bus.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { pick } from '../../common/sanitize';

/**
 * P3.3 (F15) mass-assignment: catalog writes must pick() allowed fields —
 * sending {id, _id, ...} must not overwrite identity/governance fields.
 */
describe('P3.3 catalog mass-assignment guard', () => {
  it('pick() keeps only allowed keys', () => {
    expect(pick({ id: 'x', _id: 'y', price: 1, name_ar: 'n' } as any, ['price', 'name_ar'] as const))
      .toEqual({ price: 1, name_ar: 'n' });
    expect(pick(null as any, ['a'] as const)).toEqual({});
  });

  describe('LabsService.updateCatalog', () => {
    let service: LabsService;
    let mockSvc: { findOneAndUpdate: jest.Mock; create: jest.Mock };

    beforeEach(async () => {
      mockSvc = { findOneAndUpdate: jest.fn(), create: jest.fn() };
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          LabsService,
          { provide: LabPdfService, useValue: {} },
          { provide: 'LabServiceRepository', useValue: mockSvc },
          { provide: 'LabBookingRepository', useValue: {} },
          { provide: 'LabSampleRepository', useValue: {} },
          { provide: getModelToken('ProviderProfile'), useValue: {} },
          { provide: EventEmitter2, useValue: { emit: jest.fn() } },
          { provide: EventBusService, useValue: { emit: jest.fn() } },
          { provide: WorkflowEngineService, useValue: {} },
        ],
      }).compile();
      service = module.get<LabsService>(LabsService);
    });

    it('strips id/_id/governance fields from $set, keeps price', async () => {
      mockSvc.findOneAndUpdate.mockResolvedValueOnce({ id: 'lab-1' });
      await service.updateCatalog({ role: 'admin' }, 'lab-1', {
        id: 'x', _id: 'y', price: 99, public_eligibility: true, medical_review_status: 'approved',
      } as any);
      expect(mockSvc.findOneAndUpdate).toHaveBeenCalledWith(
        { id: 'lab-1' },
        { $set: { price: 99 } },
        { new: true },
      );
    });

    it('createCatalog never takes caller id', async () => {
      mockSvc.create.mockResolvedValueOnce({ id: 'generated' });
      await service.createCatalog({ role: 'admin' }, { id: 'x', name_en: 'CBC', category: 'blood', price: 50 } as any);
      const arg = mockSvc.create.mock.calls[0][0];
      expect(arg.id).not.toBe('x');
      expect(arg.name_en).toBe('CBC');
    });
  });
});
