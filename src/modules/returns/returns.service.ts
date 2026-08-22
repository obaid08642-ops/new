import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { ReturnRequest } from '../../schemas/returns.schema';
import { WalletService } from '../wallet/wallet.service';
import { ReturnRequestRepository } from "./repositories/returnrequest.repository";
import { RefundExecutor } from '../finance-engine/finance-engine.module';

/**
 * E1 S5 — Returns engine with Saudi pharmacy rules.
 *
 * Eligibility (defaults overridable via finance_config { key: 'return_policy' }):
 *  - window: 7 days from delivery (config: window_days)
 *  - opened or used products are NOT returnable (health & safety)
 *  - cold-chain / refrigerated items are NOT returnable once dispatched
 *  - prescription-dispensed items marked non-returnable by the pharmacy are blocked
 *  - every request requires admin review; approval executes a REAL refund
 *    through the original payment method (gateway → card, else wallet).
 */
const NON_RETURNABLE_CATEGORIES = ['cold_chain', 'refrigerated', 'controlled', 'prescription_only_nonreturnable'];

@Injectable()
export class ReturnsService {
  constructor(
    @Inject('ReturnRequestRepository') private readonly returnModel: ReturnRequestRepository,
    private readonly walletService: WalletService,
    private readonly refundExec: RefundExecutor,
    @InjectConnection() private readonly conn: Connection,
  ) {}

  private async policy() {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'return_policy' } as any);
    return {
      window_days: Number(cfg?.window_days ?? 7),
      non_returnable_categories: Array.isArray(cfg?.non_returnable_categories) ? cfg.non_returnable_categories : NON_RETURNABLE_CATEGORIES,
    };
  }

  /**
   * Check whether an order's items are returnable right now — used by the
   * patient app before filing the request (and enforced again server-side
   * at creation, because clients can lie).
   */
  async eligibility(userId: string, orderId: string) {
    const order: any = await this.conn.collection('orders').findOne({ id: orderId } as any);
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_id !== userId) throw new ForbiddenException('not_your_order');
    const pol = await this.policy();

    const delivered = ['DELIVERED', 'COMPLETED', 'PARTIALLY_FULFILLED'].includes(String(order.state || '').toUpperCase());
    const deliveredAt = order.delivered_at || order.updatedAt || order.createdAt;
    const ageDays = (Date.now() - new Date(deliveredAt).getTime()) / (24 * 3600 * 1000);
    const withinWindow = delivered && ageDays <= pol.window_days;

    const items = (order.items || []).map((it: any) => ({
      medicine_id: it.medicine_id,
      name_ar: it.name_ar, name_en: it.name_en,
      qty: it.qty, price: it.price,
      returnable: !pol.non_returnable_categories.includes(it.category) && it.non_returnable !== true,
      reason: pol.non_returnable_categories.includes(it.category) ? 'category_non_returnable' : (it.non_returnable === true ? 'flagged_non_returnable' : null),
    }));

    return {
      order_id: orderId,
      delivered,
      within_window: withinWindow,
      window_days: pol.window_days,
      eligible: withinWindow && items.some((i: any) => i.returnable),
      items,
    };
  }

  async createRequest(userId: string, data: any) {
    if (!data.serviceType) throw new BadRequestException('serviceType is required');
    if (!data.reason) throw new BadRequestException('reason is required');
    if (!data.orderId) throw new BadRequestException('orderId is required');

    // Pharmacy orders: enforce the Saudi ruleset + compute the REAL amount
    let amount = 0;
    let reviewedItems: any[] = [];
    if (String(data.serviceType).toLowerCase().includes('pharm')) {
      const el = await this.eligibility(userId, data.orderId);
      if (!el.eligible) {
        throw new BadRequestException(el.within_window ? 'no_returnable_items' : `return_window_expired (${el.window_days} days)`);
      }
      if (data.is_opened === true || data.is_used === true) {
        throw new BadRequestException('opened_or_used_products_are_not_returnable');
      }
      const requestedIds: string[] = Array.isArray(data.items) && data.items.length
        ? data.items.map((i: any) => i.medicine_id || i).filter(Boolean)
        : el.items.filter((i: any) => i.returnable).map((i: any) => i.medicine_id);
      reviewedItems = el.items.filter((i: any) => requestedIds.includes(i.medicine_id));
      if (!reviewedItems.length) throw new BadRequestException('no_valid_items_selected');
      const nonReturnable = reviewedItems.filter((i: any) => !i.returnable);
      if (nonReturnable.length) throw new BadRequestException(`non_returnable_items: ${nonReturnable.map((i: any) => i.medicine_id).join(', ')}`);
      amount = Math.round(reviewedItems.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0) * 100) / 100;
      if (!(amount > 0)) throw new BadRequestException('computed_return_amount_is_zero');
    } else {
      // Non-pharmacy services: amount must resolve from the booking, never the client
      const order: any = await this.conn.collection('orders').findOne({ id: data.orderId } as any);
      amount = Number(order?.total ?? order?.totals?.total ?? 0);
      if (!(amount > 0)) throw new BadRequestException('could_not_resolve_amount_from_booking');
    }

    const returnRequest = await this.returnModel.create({
      patient_id: userId,
      order_id: data.orderId,
      service_type: data.serviceType,
      reason: data.reason,
      details: data.details,
      items: reviewedItems,
      is_opened: data.is_opened === true,
      is_used: data.is_used === true,
      refund_method: data.refundMethod || 'original',
      amount,
      attached_docs: data.attachedDocs || [],
      status: 'processing',
    } as any);

    return returnRequest.toObject();
  }

  async myReturns(userId: string) {
    return this.returnModel.find({ patient_id: userId }).sort({ createdAt: -1 }).lean();
  }

  /** Returns filed against this provider's orders (pharmacy RMA view). */
  async providerReturns(providerId: string): Promise<any[]> {
    const orders = await (this.returnModel.db as any).collection('orders')
      .find({ pharmacy_id: providerId }, { projection: { id: 1 } }).toArray();
    const ids = orders.map((o: any) => o.id);
    if (!ids.length) return [];
    return this.returnModel.find({ order_id: { $in: ids } } as any).sort({ createdAt: -1 }).lean() as any;
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

  /**
   * Admin decision. Approval executes a REAL refund via the original payment
   * method (E1 S4/S5): gateway refund to the card when a Moyasar payment
   * exists; otherwise a wallet credit. Ledger entries + patient notification
   * are written by the RefundExecutor.
   */
  async adminDecide(id: string, decision: 'approved' | 'rejected', note: string, adminUser: any) {
    const request = await this.returnModel.findOne({ id });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== 'processing') throw new BadRequestException('Request already processed');

    request.admin_note = note;
    request.resolved_by = adminUser.id;
    request.resolved_at = new Date();

    if (decision === 'rejected') {
      request.status = 'rejected';
      await request.save();
      return request.toObject();
    }

    request.status = 'approved';
    const exec = await this.refundExec.execute({
      refund_id: `return_${request.id}`,
      booking_kind: 'pharmacy',
      booking_id: request.order_id,
      patient_id: request.patient_id,
      amount: Number(request.amount),
      reason: `return approved: ${request.reason}`,
      actor_id: adminUser.id,
    });
    (request as any).execution = exec;
    request.status = 'completed';

    await request.save();
    return request.toObject();
  }
}
