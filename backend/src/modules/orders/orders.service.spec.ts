import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { OrdersService } from './orders.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { DispatchService } from './dispatch.service';
import { WorkflowEngineService } from '../workflow-engine/workflow-engine.module';
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
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
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
