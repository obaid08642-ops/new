import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApprovalWorkflowService } from './approval-workflow.module';
import { ApprovalStatus } from '../../schemas/approval-request.schema';
import { ForbiddenException, NotFoundException, BadRequestException } from '@nestjs/common';
import { CatalogPublicationService } from '../events/catalog-publication.service';

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;
  let reqModel: any;
  let medicineModel: any;
  let providerModel: any;
  let facilityModel: any;
  let labModel: any;
  let radiologyModel: any;
  let homeCareModel: any;
  let ownershipModel: any;
  let publication: any;

  beforeEach(async () => {
    reqModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    medicineModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    providerModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    facilityModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    labModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    radiologyModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    homeCareModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
      findOne: jest.fn(),
    };
    ownershipModel = { findOne: jest.fn() };
    publication = { refresh: jest.fn().mockResolvedValue({ published: true }) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalWorkflowService,
        { provide: getModelToken('ApprovalRequest'), useValue: reqModel },
        { provide: getModelToken('Medicine'), useValue: medicineModel },
        { provide: getModelToken('ProviderProfile'), useValue: providerModel },
        { provide: getModelToken('Facility'), useValue: facilityModel },
        { provide: getModelToken('LabService'), useValue: labModel },
        { provide: getModelToken('RadiologyService'), useValue: radiologyModel },
        { provide: getModelToken('HomeCareService'), useValue: homeCareModel },
        { provide: getModelToken('ServiceOwnership'), useValue: ownershipModel },
        { provide: CatalogPublicationService, useValue: publication },
      ],
    }).compile();

    service = module.get<ApprovalWorkflowService>(ApprovalWorkflowService);
  });

  describe('createRequest', () => {
    it('should throw BadRequestException if missing type or change_data', async () => {
      await expect(service.createRequest('u1', 'provider', { entity_type: 'medicine', change_data: null }))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a request with version 1 if new entity creation', async () => {
      reqModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      reqModel.create.mockResolvedValue({ id: 'r1', entity_type: 'medicine', version: 1 });
      const res = await service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        change_data: { name_ar: 'البنادول' }
      });
      expect(res.version).toBe(1);
      expect(reqModel.create).toHaveBeenCalled();
    });

    it('R4-1: rejects governance keys (verified/status/id) at creation', async () => {
      await expect(service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        change_data: { name_ar: 'x', verified: true },
      })).rejects.toThrow(/uneditable_fields.*verified/);
      await expect(service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        change_data: { price: 5, status: 'approved' },
      })).rejects.toThrow(/uneditable_fields.*status/);
      await expect(service.createRequest('u1', 'provider', {
        entity_type: 'provider',
        change_data: { name_ar: 'x', status: 'active' },
      })).rejects.toThrow(/uneditable_fields/);
      await expect(service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        entity_id: 'med1',
        change_data: { id: 'med1', price: 5 },
      })).rejects.toThrow(/uneditable_fields.*id/);
      expect(reqModel.create).not.toHaveBeenCalled();
    });

    it('R4-1: rejects edit proposals against a foreign medicine record', async () => {
      medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'med9', created_by_user_id: 'someone-else' }) });
      await expect(service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        entity_id: 'med9',
        change_data: { price: 9 },
      })).rejects.toThrow(ForbiddenException);
      expect(reqModel.create).not.toHaveBeenCalled();
    });

    it('R4-1: allows edit proposals against an owned medicine record', async () => {
      medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'med1', created_by_user_id: 'u1' }) });
      reqModel.findOne.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
      reqModel.create.mockResolvedValue({ id: 'r2', version: 2 });
      const res = await service.createRequest('u1', 'provider', {
        entity_type: 'medicine',
        entity_id: 'med1',
        change_data: { price: 9 },
      });
      expect(res.id).toBe('r2');
    });

    it('R4-1: admin bypasses the ownership check', async () => {
      medicineModel.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue({ id: 'med9', created_by_user_id: 'someone-else' }) });
      reqModel.findOne.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue(null) }) });
      reqModel.create.mockResolvedValue({ id: 'r3' });
      const res = await service.createRequest('admin1', 'admin', {
        entity_type: 'medicine',
        entity_id: 'med9',
        change_data: { price: 9 },
      });
      expect(res.id).toBe('r3');
    });
  });

  describe('decide', () => {
    it('should set status to rejected on rejection', async () => {
      const mockReq: any = {
        id: 'r1',
        entity_type: 'medicine',
        status: ApprovalStatus.PENDING_REVIEW,
        change_data: { name_ar: 'البنادول' },
        save: jest.fn(),
        toObject: () => ({ id: 'r1', status: ApprovalStatus.REJECTED }),
      };
      reqModel.findOne.mockResolvedValue(mockReq);

      const res = await service.decide('admin1', 'r1', { decision: 'rejected', notes: 'Bad data' });
      expect(res.status).toBe(ApprovalStatus.REJECTED);
      expect(mockReq.rejected_reason).toBe('Bad data');
      expect(mockReq.save).toHaveBeenCalled();
    });

    it('should create actual medicine document on approval if entity_id is null', async () => {
      const mockReq = {
        id: 'r1',
        entity_type: 'medicine',
        entity_id: null,
        status: ApprovalStatus.PENDING_REVIEW,
        change_data: { name_ar: 'البنادول' },
        save: jest.fn(),
        toObject: () => ({ id: 'r1', status: ApprovalStatus.APPROVED, entity_id: 'med1' }),
      };
      reqModel.findOne.mockResolvedValue(mockReq);
      medicineModel.create.mockResolvedValue({ id: 'med1', name_ar: 'البنادول' });

      const res = await service.decide('admin1', 'r1', { decision: 'approved' });
      expect(res.status).toBe(ApprovalStatus.APPROVED);
      expect(medicineModel.create).toHaveBeenCalledWith(expect.objectContaining({
        ...mockReq.change_data,
        public_eligibility: true,
        indexing_eligibility: false,
        medical_review_status: 'approved',
        provenance: 'approval_workflow:r1',
      }));
      expect(mockReq.entity_id).toBe('med1');
      expect(mockReq.save).toHaveBeenCalled();
      expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'medicine', entityId: 'med1', actorId: 'admin1', idempotencyKey: 'approval-workflow:r1:approved',
      }));
    });

    it('publishes home-care services through the same governed projection', async () => {
      const mockReq: any = {
        id: 'r-home',
        entity_type: 'service',
        entity_id: null,
        status: ApprovalStatus.PENDING_REVIEW,
        change_data: { type: 'home_care', name_ar: 'تمريض منزلي', name_en: 'Home nursing', active: true },
        save: jest.fn(),
        toObject: () => ({ id: 'r-home', status: ApprovalStatus.APPROVED, entity_id: 'home-1' }),
      };
      reqModel.findOne.mockResolvedValue(mockReq);
      homeCareModel.create.mockResolvedValue({ id: 'home-1' });

      await service.decide('admin1', 'r-home', { decision: 'approved' });

      expect(homeCareModel.create).toHaveBeenCalledWith(expect.objectContaining({
        public_eligibility: true,
        indexing_eligibility: false,
        medical_review_status: 'approved',
      }));
      expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'home_care_service', entityId: 'home-1', actorId: 'admin1',
      }));
    });

    it('should patch actual medicine document on approval if entity_id exists', async () => {
      const mockReq = {
        id: 'r1',
        entity_type: 'medicine',
        entity_id: 'med1',
        status: ApprovalStatus.PENDING_REVIEW,
        change_data: { name_ar: 'البنادول المعدل' },
        save: jest.fn(),
        toObject: () => ({ id: 'r1', status: ApprovalStatus.APPROVED, entity_id: 'med1' }),
      };
      reqModel.findOne.mockResolvedValue(mockReq);
      medicineModel.updateOne.mockResolvedValue({ ok: 1 });

      const res = await service.decide('admin1', 'r1', { decision: 'approved' });
      expect(res.status).toBe(ApprovalStatus.APPROVED);
      expect(medicineModel.updateOne).toHaveBeenCalledWith(
        { id: { $eq: 'med1' } },
        { $set: expect.objectContaining({
          ...mockReq.change_data,
          public_eligibility: true,
          indexing_eligibility: false,
          medical_review_status: 'approved',
          provenance: 'approval_workflow:r1',
        }) },
      );
      expect(mockReq.save).toHaveBeenCalled();
      expect(publication.refresh).toHaveBeenCalledWith(expect.objectContaining({
        entityType: 'medicine', entityId: 'med1', actorId: 'admin1', idempotencyKey: 'approval-workflow:r1:approved',
      }));
    });
    it('R4-1: approval $set contains allowlisted keys only (change_data + edit_data filtered)', async () => {
      const mockReq: any = {
        id: 'r-evil',
        entity_type: 'medicine',
        entity_id: 'med1',
        status: ApprovalStatus.PENDING_REVIEW,
        change_data: { price: 5, verified: true, status: 'approved', name_ar: 'x' },
        save: jest.fn(),
        toObject: () => ({ id: 'r-evil', status: ApprovalStatus.APPROVED }),
      };
      reqModel.findOne.mockResolvedValue(mockReq);
      medicineModel.updateOne.mockResolvedValue({ ok: 1 });

      await service.decide('admin1', 'r-evil', { decision: 'approved', edit_data: { price: 7, status: 'closed' } as any });

      expect(medicineModel.updateOne).toHaveBeenCalledTimes(1);
      const setArg = medicineModel.updateOne.mock.calls[0][1].$set;
      expect(setArg.price).toBe(7);
      expect(setArg.name_ar).toBe('x');
      expect(setArg).not.toHaveProperty('verified');
      expect(setArg).not.toHaveProperty('status');
      expect(setArg.public_eligibility).toBe(true);
    });
  });
});
