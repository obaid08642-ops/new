/** Phase 2A — Granular pharmacy lifecycle notifications */
import { Injectable, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPriority, NotificationType } from '../../../common/enums';
import { PharmacyAllocation, PharmacyOrder } from '../schemas/pharmacy.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { RealtimeService } from '../../realtime/realtime.service';

@Injectable()
export class PharmacyNotificationService {
  constructor(
    private notif: NotificationsService,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    private readonly realtime: RealtimeService,
  ) {}

  async notifyPatientSplitCompleted(order: PharmacyOrder) {
    await this.notif.create({
      user_id: order.patient_account_id,
      title_key: 'pharmacy.split_completed.title',
      body_key: 'pharmacy.split_completed.body',
      params: { order_id: order.id, splits: order.splits_count, status: order.status },
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { type: 'open_pharmacy_order', order_id: order.id },
    }).catch(() => null);
  }

  async notifyPharmacyNewAllocation(alloc: any) {
    await this.notif.create({
      user_id: alloc.pharmacy_account_id,
      title_key: 'pharmacy.new_allocation.title',
      body_key: 'pharmacy.new_allocation.body',
      params: { allocation_id: alloc.id, order_id: alloc.order_id, items_count: alloc.items?.length || 0 },
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { type: 'open_pharmacy_allocation', allocation_id: alloc.id },
    }).catch(() => null);
  }

  async notifyPatientItemUnavailable(alloc: PharmacyAllocation, item: any) {
    const order = await this.lookupOrderId(alloc.order_id);
    if (!order) return;
    await this.notif.create({
      user_id: order.patient_account_id,
      title_key: 'pharmacy.item_unavailable.title',
      body_key: 'pharmacy.item_unavailable.body',
      params: { order_id: order.id, item_name: item.name || item.sku },
      type: NotificationType.ALERT,
      priority: NotificationPriority.NORMAL,
      action: { type: 'open_pharmacy_order', order_id: order.id },
    }).catch(() => null);
  }

  async notifyPatientAllocationConfirmed(alloc: PharmacyAllocation) {
    const order = await this.lookupOrderId(alloc.order_id);
    if (!order) return;
    await this.notif.create({
      user_id: order.patient_account_id,
      title_key: 'pharmacy.alloc_confirmed.title',
      body_key: 'pharmacy.alloc_confirmed.body',
      params: { order_id: order.id, status: alloc.status },
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      action: { type: 'open_pharmacy_order', order_id: order.id },
    }).catch(() => null);
  }

  async notifyPatientAllocationProgress(alloc: PharmacyAllocation) {
    const order = await this.lookupOrderId(alloc.order_id);
    if (!order) return;
    await this.notif.create({
      user_id: order.patient_account_id,
      title_key: `pharmacy.alloc_${alloc.status}.title`,
      body_key: `pharmacy.alloc_${alloc.status}.body`,
      params: { order_id: order.id, status: alloc.status },
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      action: { type: 'open_pharmacy_order', order_id: order.id },
    }).catch(() => null);
  }

  async notifyPatientAllocationCancelled(alloc: PharmacyAllocation, reason?: string) {
    const order = await this.lookupOrderId(alloc.order_id);
    if (!order) return;
    await this.notif.create({
      user_id: order.patient_account_id,
      title_key: 'pharmacy.alloc_cancelled.title',
      body_key: 'pharmacy.alloc_cancelled.body',
      params: { order_id: order.id, reason },
      type: NotificationType.ALERT,
      priority: NotificationPriority.HIGH,
      action: { type: 'open_pharmacy_order', order_id: order.id },
    }).catch(() => null);
  }

  // ============ Phase 2A-rework: Broadcast Notifications ============
  async notifyPharmacyBroadcast(pharmacy_account_id: string, order: PharmacyOrder, bc: any) {
    await this.notif.create({
      user_id: pharmacy_account_id,
      title_key: 'pharmacy.broadcast.title',
      body_key: 'pharmacy.broadcast.body',
      params: { order_id: order.id, broadcast_id: bc.id, round: bc.current_round, radius_km: bc.current_radius_km, items_count: order.items?.length || 0 },
      type: NotificationType.INFO,
      priority: NotificationPriority.HIGH,
      action: { type: 'open_pharmacy_broadcast', broadcast_id: bc.id, order_id: order.id },
        }).catch(() => null);
    await this.realtime.emitToUser(pharmacy_account_id, 'pharmacy:broadcast:available', {
      broadcast_id: bc.id,
      order_id: order.id,
      round: bc.current_round,
      radius_km: bc.current_radius_km,
    });
  }
  async notifyPharmacyBroadcastCancelled(pharmacy_account_id: string, order_id: string, reason: string) {
    await this.notif.create({
      user_id: pharmacy_account_id,
      title_key: 'pharmacy.broadcast_cancelled.title',
      body_key: 'pharmacy.broadcast_cancelled.body',
      params: { order_id, reason },
      type: NotificationType.INFO,
      priority: NotificationPriority.NORMAL,
      action: { type: 'open_pharmacy_broadcast', order_id },
    }).catch(() => null);
    await this.realtime.emitToUser(pharmacy_account_id, 'pharmacy:broadcast:cancelled', { order_id, reason });
  }
  private async lookupOrderId(orderId: string): Promise<{ patient_account_id: string; id: string } | null> {
    const o = await this.orders.findOne({ id: orderId }, { id: 1, patient_account_id: 1 }).lean();
    return o ? { id: o.id, patient_account_id: o.patient_account_id } : null;
  }
}
