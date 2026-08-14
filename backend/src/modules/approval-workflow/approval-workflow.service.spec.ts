import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { ApprovalWorkflowService } from './approval-workflow.module';
import { ApprovalStatus } from '../../schemas/approval-request.schema';
import { NotFoundException, BadRequestException } from '@nestjs/common';

describe('ApprovalWorkflowService', () => {
  let service: ApprovalWorkflowService;
  let reqModel: any;
  let medicineModel: any;
  let providerModel: any;
  let facilityModel: any;
  let labModel: any;
  let radiologyModel: any;

  beforeEach(async () => {
    reqModel = {
      create: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
    };
    medicineModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    providerModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    facilityModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    labModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };
    radiologyModel = {
      create: jest.fn(),
      updateOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApprovalWorkflowService,
        { provide: getModelToken('ApprovalRequest'), useValue: reqModel },
        { provide: getModelToken('Medicine'), useValue: medicineModel },
        { provide: getModelToken('ProviderProfile'), useValue: providerModel },
        { provide: getModelToken('Facility'), useValue: facilityModel },
        { provide: getModelToken('LabService'), useValue: labModel },
        { provide: getModelToken('RadiologyService'), useValue: radiologyModel },
      ],
    }).compile();

    service = module.get<ApprovalWorkflowService>(ApprovalWorkflowService);
  });

  describe('createRequest', () => {
    it('should throw BadRequestException if missing type or change_data', async () => {
      await expect(service.createRequest('u1', { entity_type: 'medicine', change_data: null }))
        .rejects.toThrow(BadRequestException);
    });

    it('should create a request with version 1 if new entity creation', async () => {
      reqModel.findOne.mockReturnValue({
        sort: jest.fn().mockReturnValue({
          lean: jest.fn().mockResolvedValue(null),
        }),
      });
      reqModel.create.mockResolvedValue({ id: 'r1', entity_type: 'medicine', version: 1 });
      const res = await service.createRequest('u1', {
        entity_type: 'medicine',
        change_data: { name_ar: 'البنادول' }
      });
      expect(res.version).toBe(1);
      expect(reqModel.create).toHaveBeenCalled();
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
      expect(medicineModel.create).toHaveBeenCalledWith(mockReq.change_data);
      expect(mockReq.entity_id).toBe('med1');
      expect(mockReq.save).toHaveBeenCalled();
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
        { id: 'med1' },
        { $set: mockReq.change_data }
      );
      expect(mockReq.save).toHaveBeenCalled();
    });
  });
});
