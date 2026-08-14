import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { ReturnRequest } from '../../schemas/returns.schema';
import { Order, OrderDocument } from '../../schemas/order.schema';
import { WalletService } from '../wallet/wallet.service';
import { ReturnRequestRepository } from "./repositories/returnrequest.repository";

@Injectable()
export class ReturnsService {
  constructor(
    @Inject('ReturnRequestRepository') private readonly returnModel: ReturnRequestRepository,
    @InjectModel(Order.name) private readonly orderModel: Model<OrderDocument>,
    private readonly walletService: WalletService,
  ) {}

  async createRequest(userId: string, data: any) {
    if (!data.serviceType) throw new BadRequestException('serviceType is required');
    if (!data.reason) throw new BadRequestException('reason is required');
    if (!data.orderId) throw new BadRequestException('orderId is required');

    const order = await this.orderModel.findOne({ id: data.orderId, patient_id: userId }).lean();
    if (!order) throw new NotFoundException('Order not found');

    const amount = Number(order.total);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Order has no refundable total');
    }

    const existing = await this.returnModel.findOne({
      patient_id: userId,
      order_id: order.id,
      status: { $in: ['processing', 'approved', 'completed'] },
    }).lean();
    if (existing) throw new BadRequestException('An active return already exists for this order');

    const returnRequest = await this.returnModel.create({
      patient_id: userId,
      order_id: order.id,
      service_type: data.serviceType,
      reason: data.reason,
      details: data.details,
      refund_method: data.refundMethod || 'wallet',
      amount,
      attached_docs: data.attachedDocs || [],
      status: 'processing',
    });

    return returnRequest.toObject();
  }

  async myReturns(userId: string) {
    return this.returnModel.find({ patient_id: userId }).sort({ createdAt: -1 }).lean();
  }

  async getById(id: string, userId: string, userRole: string) {
    const request = await this.returnModel.findOne({ id }).lean();
    if (!request) throw new NotFoundException('Return request not found');
    if (request.patient_id !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Access denied');
    }
    return request;
  }

  async adminList(status?: string) {
    const filter = status ? { status } : {};
    return this.returnModel.find(filter).sort({ createdAt: -1 }).lean();
  }

  async adminDecide(id: string, decision: 'approved' | 'rejected', note: string, adminUser: any) {
    const request = await this.returnModel.findOne({ id });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== 'processing') throw new BadRequestException('Request already processed');

    request.status = decision;
    request.admin_note = note;
    request.resolved_by = adminUser.id;
    request.resolved_at = new Date();

    if (decision === 'approved' && request.refund_method === 'wallet') {
      // Top up the patient's wallet
      await this.walletService.topup(
        request.patient_id,
        'patient',
        request.amount,
        `استرداد نقدي لطلب الإرجاع #${request.id}`,
      );
      request.status = 'completed'; // Mark as completed since wallet transfer is instant
    }

    await request.save();
    return request.toObject();
  }
}
