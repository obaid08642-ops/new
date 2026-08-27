import { Test, TestingModule } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { PatientUxService } from './patient-ux.module';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EventBusService } from '../events/event-bus.service';

describe('PatientUxService', () => {
  let service: PatientUxService;
  let reviewModel: any;
  let refundModel: any;
  let orderModel: any;
  let appointmentModel: any;
  let eventEmitter: any;
  let eventBus: any;

  beforeEach(async () => {
    reviewModel = {
      findOneAndUpdate: jest.fn(),
    };
    refundModel = {
      findOne: jest.fn(),
      create: jest.fn(),
      find: jest.fn(),
    };
    orderModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    appointmentModel = {
      findOne: jest.fn(),
      updateOne: jest.fn(),
    };
    eventEmitter = {
      emit: jest.fn(),
    };
    eventBus = {
      emit: jest.fn().mockResolvedValue(true),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PatientUxService,
        { provide: getModelToken('Review'), useValue: reviewModel },
        { provide: getModelToken('PatientUxRefund'), useValue: refundModel },
        { provide: getModelToken('Order'), useValue: orderModel },
        { provide: getModelToken('LabBooking'), useValue: {} },
        { provide: getModelToken('RadiologyBooking'), useValue: {} },
        { provide: getModelToken('HomeCareBooking'), useValue: {} },
        { provide: getModelToken('Appointment'), useValue: appointmentModel },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: EventBusService, useValue: eventBus },
      ],
    }).compile();

    service = module.get<PatientUxService>(PatientUxService);
  });

  describe('rate', () => {
    it('should throw BadRequestException if rating is invalid', async () => {
      await expect(
        service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 0 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if booking does not exist', async () => {
      appointmentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 5 })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if user is not the owner of the booking', async () => {
      appointmentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'b1', patient_id: 'other_user' }),
      });

      await expect(
        service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 5 })
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw ForbiddenException if appointment is not completed', async () => {
      appointmentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'b1', patient_id: 'u1', status: 'scheduled' }),
      });

      await expect(
        service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 5 })
      ).rejects.toThrow(ForbiddenException);
    });

    it('should auto-approve rating >= 3 stars', async () => {
      appointmentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'b1', patient_id: 'u1', status: 'completed', doctor_id: 'doc1' }),
      });
      reviewModel.findOneAndUpdate.mockResolvedValue({ id: 'r1', status: 'approved' });

      const res = await service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 4 });
      expect(res.status).toBe('approved');
      expect(reviewModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'approved' }),
        }),
        expect.any(Object)
      );
    });

    it('should set status to pending_review for rating < 3 stars', async () => {
      appointmentModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'b1', patient_id: 'u1', status: 'completed', doctor_id: 'doc1' }),
      });
      reviewModel.findOneAndUpdate.mockResolvedValue({ id: 'r1', status: 'pending_review' });

      const res = await service.rate({ id: 'u1' }, { booking_kind: 'doctor', booking_id: 'b1', rating: 2 });
      expect(res.status).toBe('pending_review');
      expect(reviewModel.findOneAndUpdate).toHaveBeenCalledWith(
        expect.any(Object),
        expect.objectContaining({
          $set: expect.objectContaining({ status: 'pending_review' }),
        }),
        expect.any(Object)
      );
    });

    it('should enforce DELIVERED status for pharmacy orders', async () => {
      orderModel.findOne.mockReturnValue({
        lean: jest.fn().mockResolvedValue({ id: 'o1', patient_id: 'u1', state: 'PREPARING', pharmacy_id: 'ph1' }),
      });

      await expect(
        service.rate({ id: 'u1' }, { booking_kind: 'pharmacy', booking_id: 'o1', rating: 5 })
      ).rejects.toThrow(ForbiddenException);
    });
  });
});
