import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { ProcurementService } from '../services/procurement.service';
import { ProcurementStatus } from '../enums/procurement-status.enum';

const toObj = (obj: any) => ({ ...obj, save: jest.fn().mockResolvedValue(obj) });
const PHARMACY_ID = '65f1a2b3c4d5e6f7a8b9c0d1';
const USER_ID = '65f1a2b3c4d5e6f7a8b9c0d2';
const REQ_ID = '65f1a2b3c4d5e6f7a8b9c0d3';

const makeReq = (overrides: any = {}) =>
  toObj({
    _id: REQ_ID,
    pharmacyId: PHARMACY_ID,
    createdBy: USER_ID,
    items: [{ medicineId: 'med-1', quantity: 5 }],
    status: ProcurementStatus.PENDING_ADMIN_REVIEW,
    ...overrides,
  });

const makeDoc = (data: any) => ({
  ...data,
  save: jest.fn().mockResolvedValue(data),
});

describe('ProcurementService', () => {
  let service: ProcurementService;

  const mockProcurementModel = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findById: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  const mockQuotationModel = {
    create: jest.fn(),
    findOne: jest.fn(),
    updateOne: jest.fn(),
    deleteMany: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProcurementService,
        { provide: 'ProcurementRequestRepository', useValue: mockProcurementModel },
        { provide: 'QuotationRepository', useValue: mockQuotationModel },
      ],
    }).compile();

    service = module.get<ProcurementService>(ProcurementService);
  });

  // ─── createRequest ────────────────────────────────────────────────────────
  describe('createRequest', () => {
    it('should create a request with PENDING_ADMIN_REVIEW status', async () => {
      const dto = { items: [{ medicineId: 'med-1', quantity: 2 }] };
      const created = makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW });
      mockProcurementModel.create.mockResolvedValue(created);

      const result = await service.createRequest(PHARMACY_ID, USER_ID, dto as any);
      expect(result.status).toBe(ProcurementStatus.PENDING_ADMIN_REVIEW);
      expect(mockProcurementModel.create).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }),
      );
    });
  });

  // ─── getPharmacyRequests ──────────────────────────────────────────────────
  describe('getPharmacyRequests', () => {
    it('should return requests for a pharmacy', async () => {
      const req = makeReq();
      mockProcurementModel.find.mockReturnValue({ sort: jest.fn().mockReturnValue({ lean: jest.fn().mockResolvedValue([req]) }) });
      const result = await service.getPharmacyRequests(PHARMACY_ID);
      expect(result.length).toBe(1);
    });
  });

  // ─── adminStartReview ─────────────────────────────────────────────────────
  describe('adminStartReview', () => {
    it('should transition to PENDING_ADMIN_REVIEW', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }));
      mockProcurementModel.findById.mockResolvedValue(req);

      const result = await service.adminStartReview(REQ_ID);
      expect(req.status).toBe(ProcurementStatus.PENDING_ADMIN_REVIEW);
      expect(result).toBe(req);
    });

    it('should throw if request not found', async () => {
      mockProcurementModel.findById.mockResolvedValue(null);
      await expect(service.adminStartReview('bad-id')).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequest if status is not PENDING_ADMIN_REVIEW', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.QUOTATION_ISSUED }));
      mockProcurementModel.findById.mockResolvedValue(req);
      await expect(service.adminStartReview(REQ_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── adminCreateQuotation ─────────────────────────────────────────────────
  describe('adminCreateQuotation', () => {
    it('should create a quotation and update request status to QUOTATION_ISSUED', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }));
      mockProcurementModel.findById.mockResolvedValue(req);
      mockQuotationModel.deleteMany.mockResolvedValue({});
      const quotation = { _id: 'q-1', status: ProcurementStatus.QUOTATION_ISSUED };
      mockQuotationModel.create.mockResolvedValue(quotation);

      const dto = { items: [{ medicineId: 'med-1', quantity: 2, price: 10 }], totalPrice: 20 };
      const result = await service.adminCreateQuotation('admin-1', REQ_ID, dto as any);

      expect(result.status).toBe(ProcurementStatus.QUOTATION_ISSUED);
      expect(req.status).toBe(ProcurementStatus.QUOTATION_ISSUED);
      expect(req.save).toHaveBeenCalled();
    });

    it('should throw if request not found', async () => {
      mockProcurementModel.findById.mockResolvedValue(null);
      await expect(service.adminCreateQuotation('admin-1', 'bad-id', {} as any)).rejects.toThrow(NotFoundException);
    });
  });

  // ─── submitPharmacyFeedback ───────────────────────────────────────────────
  describe('submitPharmacyFeedback', () => {
    it('should set APPROVED_BY_PHARMACY and save feedback', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.QUOTATION_ISSUED }));
      mockProcurementModel.findOne.mockResolvedValue(req);
      mockQuotationModel.updateOne.mockResolvedValue({});

      const dto = { status: ProcurementStatus.APPROVED_BY_PHARMACY, pharmacyFeedback: 'Looks good' };
      await service.submitPharmacyFeedback(PHARMACY_ID, REQ_ID, dto as any);

      expect(req.status).toBe(ProcurementStatus.APPROVED_BY_PHARMACY);
      expect(req.save).toHaveBeenCalled();
    });

    it('should throw BadRequest if status is not QUOTATION_ISSUED', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }));
      mockProcurementModel.findOne.mockResolvedValue(req);
      const dto = { status: ProcurementStatus.APPROVED_BY_PHARMACY };
      await expect(service.submitPharmacyFeedback(PHARMACY_ID, REQ_ID, dto as any)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── adminCancelRequest ───────────────────────────────────────────────────
  describe('adminCancelRequest', () => {
    it('should cancel a request', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }));
      mockProcurementModel.findById.mockResolvedValue(req);
      await service.adminCancelRequest(REQ_ID);
      expect(req.status).toBe(ProcurementStatus.CANCELLED);
    });

    it('should throw if already COMPLETED', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.COMPLETED }));
      mockProcurementModel.findById.mockResolvedValue(req);
      await expect(service.adminCancelRequest(REQ_ID)).rejects.toThrow(BadRequestException);
    });
  });

  // ─── adminCompleteRequest ─────────────────────────────────────────────────
  describe('adminCompleteRequest', () => {
    it('should complete a APPROVED_BY_PHARMACY request', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.APPROVED_BY_PHARMACY }));
      mockProcurementModel.findById.mockResolvedValue(req);
      await service.adminCompleteRequest(REQ_ID);
      expect(req.status).toBe(ProcurementStatus.COMPLETED);
    });

    it('should throw if not APPROVED_BY_PHARMACY', async () => {
      const req = makeDoc(makeReq({ status: ProcurementStatus.PENDING_ADMIN_REVIEW }));
      mockProcurementModel.findById.mockResolvedValue(req);
      await expect(service.adminCompleteRequest(REQ_ID)).rejects.toThrow(BadRequestException);
    });
  });
});
