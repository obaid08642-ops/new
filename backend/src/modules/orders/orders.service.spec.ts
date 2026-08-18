import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken, getConnectionToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DispatchService } from './dispatch.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
import { CouponService, LoyaltyRedeemService, RefundExecutor, CancellationPolicy } from '../finance-engine/finance-engine.module';
import { BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Order, PharmacyBid } from '../../schemas/order.schema';
import { Medicine } from '../../schemas/medicine.schema';
import { Delivery } from '../../schemas/delivery.schema';

describe('OrdersService', () => {
  let service: OrdersService;

  const mockModel = {
    find: jest.fn().mockReturnThis(),
    findOne: jest.fn(),
    create: jest.fn(),
    updateOne: jest.fn(),
    updateMany: jest.fn(),
    lean: jest.fn(),
    sort: jest.fn().mockReturnThis(),
    countDocuments: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  const mockDispatchService = {};
  const mockWorkflowEngine = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        { provide: 'OrderRepository', useValue: mockModel },
        { provide: 'MedicineRepository', useValue: mockModel },
        { provide: 'DeliveryRepository', useValue: mockModel },
        { provide: 'PharmacyBidRepository', useValue: mockModel },
        { provide: EventEmitter2, useValue: mockEventEmitter },
        { provide: DispatchService, useValue: mockDispatchService },
        { provide: WorkflowEngineService, useValue: mockWorkflowEngine },
        // EPIC1-era dependencies the spec never mocked (finance engine):
        { provide: getConnectionToken(), useValue: { db: { collection: jest.fn() } } },
        { provide: CouponService, useValue: { validate: jest.fn(), redeem: jest.fn() } },
        { provide: LoyaltyRedeemService, useValue: { quote: jest.fn(), redeem: jest.fn(), refund: jest.fn() } },
        { provide: RefundExecutor, useValue: { execute: jest.fn() } },
        { provide: CancellationPolicy, useValue: { evaluate: jest.fn() } },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('order ownership / BOLA', () => {
    const order = { id: 'order-1', patient_id: 'patient-1', pharmacy_id: 'pharmacy-1', state: 'CREATED', delivery_fee: 0, payment_status: 'pending' };

    it('rejects a foreign patient from reading an order', async () => {
      mockModel.findOne.mockResolvedValueOnce(order);
      await expect(service.getById('order-1', { id: 'patient-2', role: 'patient' })).rejects.toThrow(ForbiddenException);
    });

    it('allows the owning patient to read an order', async () => {
      mockModel.findOne.mockResolvedValueOnce(order);
      await expect(service.getById('order-1', { id: 'patient-1', role: 'patient' })).resolves.toEqual(order);
    });

    it('rejects a foreign patient before cancellation policy or financial side effects', async () => {
      mockModel.findOne.mockResolvedValueOnce(order);
      await expect(service.cancel('order-1', { id: 'patient-2', role: 'patient' }, 'foreign-test')).rejects.toThrow(ForbiddenException);
    });

    it('rejects a foreign patient from downloading the PDF report', async () => {
      mockModel.findOne.mockResolvedValueOnce(order);
      await expect(service.generatePdf('order-1', { id: 'patient-2', role: 'patient' })).rejects.toThrow(ForbiddenException);
    });

    it('generates a PDF Buffer for the owning patient', async () => {
      mockModel.findOne.mockResolvedValueOnce({ ...order, results: [] });
      const pdf = await service.generatePdf('order-1', { id: 'patient-1', role: 'patient' });
      expect(Buffer.isBuffer(pdf)).toBe(true);
      expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    });
  });

  describe('placeBid', () => {
    it('should throw if user is not pharmacy or admin', async () => {
      await expect(
        service.placeBid({ id: 'u1', role: 'patient' }, {
          prescription_request_id: 'req1',
          items: [],
          total_price: 150,
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should place a bid successfully', async () => {
      mockModel.create.mockResolvedValueOnce({
        id: 'bid1',
        prescription_request_id: 'req1',
        pharmacy_id: 'pharm1',
      });

      const res = await service.placeBid({ id: 'pharm1', role: 'pharmacy' }, {
        prescription_request_id: 'req1',
        items: [{ name: 'Panadol', price: 10, available: true }],
        total_price: 10,
      });

      expect(res).toBeDefined();
      expect(res.id).toBe('bid1');
    });
  });

  describe('acceptBid', () => {
    it('should throw if bid not found', async () => {
      mockModel.findOne.mockResolvedValueOnce(null);
      await expect(
        service.acceptBid({ id: 'u1', role: 'patient' }, 'bid-not-found')
      ).rejects.toThrow(NotFoundException);
    });
  });
});
