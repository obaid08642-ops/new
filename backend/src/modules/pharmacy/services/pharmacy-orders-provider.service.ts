import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventBusService } from '../../events/event-bus.service';

@Injectable()
export class PharmacyOrdersProviderService {
  constructor(
    private redis: RedisService,
    private bus: EventBusService,
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

    // In a real scenario, we'd update the Order status in the DB to ACCEPTED here.
    // For this blueprint, we log the audit via EventBus.
    this.bus.emit({
      type: 'system.event',
      payload: {
        orderId,
        previousState: 'BROADCAST',
        newState: 'ACCEPTED',
        actorId: user.id,
        actorRole: 'pharmacy',
        timestamp: new Date()
      }
    } as any).catch(() => null);

    return { success: true, status: 'ACCEPTED', order_id: orderId };
  }

  async submitBasket(user: any, orderId: string, payload: any) {
    this.bus.emit({
      type: 'system.event',
      payload: { orderId, previousState: 'ACCEPTED', newState: 'WAITING_PATIENT_APPROVAL', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() }
    } as any).catch(() => null);

    return { success: true, status: 'WAITING_PATIENT_APPROVAL', order_id: orderId, ...payload };
  }

  async evaluateInsurance(user: any, orderId: string, payload: any) {
    return { success: true, status: 'WAITING_PATIENT_APPROVAL', insurance_copay: payload.copay || 0 };
  }

  async orderPreparing(user: any, orderId: string) {
    this.bus.emit({
      type: 'system.event',
      payload: { orderId, previousState: 'PAYMENT_COMPLETED', newState: 'PREPARING', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() }
    } as any).catch(() => null);

    return { success: true, status: 'PREPARING', order_id: orderId };
  }

  async orderReady(user: any, orderId: string) {
    this.bus.emit({
      type: 'system.event',
      payload: { orderId, previousState: 'PREPARING', newState: 'READY', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() }
    } as any).catch(() => null);

    return { success: true, status: 'READY', order_id: orderId };
  }

  async orderDispatch(user: any, orderId: string, payload: any) {
    this.bus.emit({
      type: 'system.event',
      payload: { orderId, previousState: 'READY', newState: 'OUT_FOR_DELIVERY', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() }
    } as any).catch(() => null);

    return { success: true, status: 'OUT_FOR_DELIVERY', delivery_mode: payload.delivery_mode };
  }
}
