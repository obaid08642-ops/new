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

  async evaluateInsurance(user: any, orderId: string, payload: any) {
    const order: any = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');

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

  private async selectedAllocationForProvider(user: any, orderId: string) {
    const order: any = await this.orders.findOne({ id: orderId });
    if (!order) throw new NotFoundException('order_not_found');
    if (!order.selected_offer_id || !order.selected_allocation_id) {
      throw new BadRequestException('patient_offer_selection_required');
    }
    const allocation: any = await this.allocs.findByOrderForProvider(user, orderId);
    if (!allocation || allocation.id !== order.selected_allocation_id) {
      throw new ForbiddenException('selected_allocation_not_owned_by_provider');
    }
    return allocation;
  }

  async orderPreparing(user: any, orderId: string) {
    const alloc = await this.selectedAllocationForProvider(user, orderId);
    const a = await this.allocs.preparing(user, alloc.id);
    return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
  }

  async orderReady(user: any, orderId: string) {
    const alloc = await this.selectedAllocationForProvider(user, orderId);
    const a = await this.allocs.ready(user, alloc.id);
    return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
  }

  async orderDispatch(user: any, orderId: string, payload: any): Promise<never> {
    const alloc = await this.selectedAllocationForProvider(user, orderId);
    return this.allocs.outForDelivery(user, alloc.id, payload);
  }
}
