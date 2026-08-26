import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Inject } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyAllocationService } from './pharmacy-allocation.service';
import { PharmacyOrderRepository } from './repositories/pharmacyorder.repository';

/**
 * Order-level provider endpoints (Blueprint V1.2).
 * These address the parent order; real persistence happens on the pharmacy's
 * allocation (state machine) and on the pharmacy_orders document (basket /
 * insurance evaluation). No simulated responses — every action persists.
 */
@Injectable()
export class PharmacyOrdersProviderService {
  constructor(
    private redis: RedisService,
    private bus: EventBusService,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    private allocs: PharmacyAllocationService,
  ) {}

  async acceptOrder(user: any, orderId: string) {
    // Redis SETNX Lock to prevent race condition across multiple pharmacies
    const lockKey = `order:accept:lock:${orderId}`;
    const acquired = await this.redis.setnx(lockKey, user.id);

    if (!acquired) {
      throw new BadRequestException('Order already accepted by another pharmacy');
    }

    // Set an expiry on the lock in case of processing failure
    await this.redis.expire(lockKey, 300);

    // Real persistence: confirm this pharmacy's allocation (state machine +
    // patient notification + parent order refresh handled by the service).
    const alloc = await this.allocs.findByOrderForProvider(user, orderId);
    const confirmed = await this.allocs.confirm(user, alloc.id);

    this.bus.emit({
      type: 'system.event',
      payload: {
        orderId,
        allocationId: alloc.id,
        newState: confirmed.status,
        actorId: user.id,
        actorRole: 'pharmacy',
        timestamp: new Date(),
      },
    } as any).catch(() => null);

    return { success: true, status: confirmed.status, order_id: orderId, allocation_id: alloc.id };
  }

  async submitBasket(user: any, orderId: string, payload: any) {
    const order: any = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');

    const basket = Array.isArray(payload?.basket) ? payload.basket : (Array.isArray(payload?.items) ? payload.items : []);
    if (!basket.length) throw new BadRequestException('basket_empty');

    const subtotal = basket.reduce(
      (s: number, i: any) => s + (Number(i?.price ?? i?.unit_price) || 0) * (Number(i?.qty ?? i?.qty_offered ?? 1) || 1),
      0,
    );
    const deliveryFee = Number(order.totals?.delivery_fee) || 0;

    await this.orders.updateOne(
      { id: orderId },
      {
        $set: {
          pharmacy_basket: basket,
          'totals.subtotal': Math.round(subtotal * 100) / 100,
          'totals.total': Math.round((subtotal + deliveryFee) * 100) / 100,
          insurance_status: payload?.insuranceStatus || payload?.insurance_status || order.insurance_status || null,
          copay: Number(payload?.copay) || 0,
        },
        $push: {
          timeline: { ts: new Date(), event: 'basket_submitted', by: user.id, meta: { items: basket.length, subtotal } },
        },
      },
    );

    this.bus.emit({
      type: 'system.event',
      payload: { orderId, newState: 'basket_submitted', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() },
    } as any).catch(() => null);

    return { success: true, status: 'basket_submitted', order_id: orderId, subtotal: Math.round(subtotal * 100) / 100 };
  }

  /**
   * PH-PHARMACY insurance decision (P4): per-item approved/rejected/alternative
   * decisions + copay_percent — the governed POST /orders/:id/insurance-decision
   * contract applied to v2 orders. Legacy {status, copay} payloads still accepted.
   */
  async evaluateInsurance(user: any, orderId: string, payload: any) {
    const order: any = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');

    // Ownership: only the pharmacy holding an allocation on this order decides.
    if (user.role !== 'admin') {
      const alloc = await this.allocs.findByOrderForProvider(user, orderId).catch(() => null);
      if (!alloc) throw new ForbiddenException('order_not_yours');
    }

    let itemDecisions: Array<{ item_id: string; decision: string; reject_reason?: string }> = [];
    let copayPercent = Number(payload?.copay_percent ?? NaN);

    if (Array.isArray(payload?.items) && payload.items.length > 0) {
      const total = Number(order.totals?.total ?? 0);
      for (const dec of payload.items) {
        const d = String(dec.decision);
        if (!['approved', 'rejected', 'alternative'].includes(d)) {
          throw new BadRequestException(`invalid_decision:${d}`);
        }
        if (d === 'rejected' && !String(dec.reject_reason || '').trim() && d === 'rejected') {
          throw new BadRequestException('reject_reason_required');
        }
        itemDecisions.push({ item_id: String(dec.item_id), decision: d, reject_reason: dec.reject_reason ? String(dec.reject_reason).slice(0, 200) : undefined });
      }
      const rejectedCount = itemDecisions.filter((x) => x.decision === 'rejected').length;
      const status = rejectedCount === 0 ? 'APPROVED' : rejectedCount === itemDecisions.length ? 'REJECTED' : 'PARTIAL';
      if (!Number.isFinite(copayPercent)) {
        copayPercent = status === 'APPROVED' ? 0 : Math.min(100, Math.max(0, Number(payload?.copay_percent ?? 0)));
      }
      const insurerShare = payload.insurer_share != null
        ? Math.max(0, Number(payload.insurer_share))
        : Math.round(total * (1 - copayPercent / 100) * 100) / 100;

      await this.orders.updateOne(
        { id: orderId },
        {
          $set: {
            insurance_status: status === 'PARTIAL' ? 'PARTIAL_APPROVAL' : status,
            copay: Math.round((total - insurerShare) * 100) / 100,
            insurance_evaluation: {
              nphies_code: payload?.nphies_approval_code || payload?.nphiesCode || null,
              policy_number: payload?.policy_number || null,
              member_id: payload?.member_id || null,
              status,
              copay_percent: copayPercent,
              insurer_share: insurerShare,
              patient_share: Math.round((total - insurerShare) * 100) / 100,
              items: itemDecisions,
              decided_by: user.id,
              decided_at: new Date(),
            },
          },
          $push: {
            timeline: { ts: new Date(), event: 'insurance_decided', by: user.id, meta: { status, copay_percent: copayPercent, items: itemDecisions.length } },
          },
        },
      );
      this.bus.emit({ type: 'pharmacy.insurance.updated', entity_type: 'order', entity_id: orderId, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, patient_account_id: order.patient_account_id, meta: { status, per_item: true } }).catch(() => null);
      return {
        success: true,
        status,
        insurance_status: status,
        copay_amount: Math.round((total - insurerShare) * 100) / 100,
        insurer_share: insurerShare,
        items: itemDecisions,
        waiting_state: 'WAITING_COPAY',
      };
    }

    // Legacy whole-order shape (kept for compatibility with older clients).
    const copay = Number(payload?.copay) || 0;
    await this.orders.updateOne(
      { id: orderId },
      {
        $set: {
          insurance_status: payload?.status || payload?.insuranceStatus || 'evaluated',
          copay,
          insurance_evaluation: {
            nphies_code: payload?.nphies_code || payload?.nphiesCode || null,
            status: payload?.status || payload?.insuranceStatus || 'evaluated',
            copay,
            notes: payload?.notes || null,
            evaluated_by: user.id,
            evaluated_at: new Date(),
          },
        },
        $push: {
          timeline: { ts: new Date(), event: 'insurance_evaluated', by: user.id, meta: { copay } },
        },
      },
    );

    return { success: true, status: 'insurance_evaluated', insurance_copay: copay };
  }

  async orderPreparing(user: any, orderId: string) {
    const alloc = await this.allocs.findByOrderForProvider(user, orderId);
    const a = await this.allocs.preparing(user, alloc.id);
    return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
  }

  async orderReady(user: any, orderId: string) {
    const alloc = await this.allocs.findByOrderForProvider(user, orderId);
    const a = await this.allocs.ready(user, alloc.id);
    return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
  }

  async orderDispatch(user: any, orderId: string, payload: any) {
    const alloc = await this.allocs.findByOrderForProvider(user, orderId);
    const a = await this.allocs.outForDelivery(user, alloc.id, {
      courier_name: payload?.driver || payload?.courier_name,
      courier_phone: payload?.phone || payload?.courier_phone,
    } as any);
    return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id, delivery_mode: payload?.delivery_mode };
  }
}
