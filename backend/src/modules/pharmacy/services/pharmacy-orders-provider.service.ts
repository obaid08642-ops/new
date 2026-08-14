import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject, NotImplementedException } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { EventBusService } from '../../events/event-bus.service';
import { OrdersService } from '../../orders/orders.service';

@Injectable()
export class PharmacyOrdersProviderService {
  constructor(
    private redis: RedisService,
    private bus: EventBusService,
    private orders: OrdersService,
  ) {}

  async incomingOrders(user: any) {
    const providerId = user?.provider_account_id || user?.provider_profile_id || user?.id;
    if (!providerId) throw new ForbiddenException('Provider identity is missing from the token');
    const orders: any[] = await this.orders.listForPharmacy(String(providerId));
    return orders.filter((order) => ['CREATED', 'BROADCAST', 'PHARMACY_RECEIVED'].includes(order.state));
  }

  async acceptOrder(user: any, orderId: string) {
    // Redis SETNX Lock to prevent race condition across multiple pharmacies
    const lockKey = `order:accept:lock:${orderId}`;
    const acquired = await this.redis.setnx(lockKey, user.id);
    
    if (!acquired) {
      throw new BadRequestException('Order already accepted by another pharmacy');
    }
    
    // Set an expiry on the lock in case of processing failure
    await this.redis.expire(lockKey, 300);

    const order = await this.orders.accept(orderId, user);
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

    return { success: true, status: 'ACCEPTED', order };
  }

  async rejectOrder(user: any, orderId: string, reason: string) {
    const order = await this.orders.reject(orderId, user, reason);
    return { success: true, status: 'REJECTED', order };
  }

  async submitBasket(user: any, orderId: string, payload: any) {
    void user;
    void orderId;
    void payload;
    throw new NotImplementedException('Basket submission requires a persisted basket-review contract and is unavailable until configured.');
  }

  async evaluateInsurance(user: any, orderId: string, payload: any) {
    void user;
    void orderId;
    void payload;
    throw new NotImplementedException('Provider insurance evaluation requires a persisted authorization contract and is unavailable until configured.');
  }

  async orderPreparing(user: any, orderId: string) {
    const order = await this.orders.markPreparing(orderId, user);
    return { success: true, status: 'PREPARING', order };
  }

  async orderReady(user: any, orderId: string) {
    const order = await this.orders.markReady(orderId, user);
    return { success: true, status: 'READY_FOR_DISPATCH', order };
  }

  async orderDispatch(user: any, orderId: string, payload: any) {
    void user;
    void orderId;
    void payload;
    throw new NotImplementedException('Provider dispatch requires an assigned delivery contract and is unavailable until configured.');
  }
}
