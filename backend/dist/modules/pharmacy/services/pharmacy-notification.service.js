"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyNotificationService = void 0;
const common_1 = require("@nestjs/common");
const notifications_service_1 = require("../../notifications/notifications.service");
const enums_1 = require("../../../common/enums");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const realtime_service_1 = require("../../realtime/realtime.service");
let PharmacyNotificationService = class PharmacyNotificationService {
    constructor(notif, orders, realtime) {
        this.notif = notif;
        this.orders = orders;
        this.realtime = realtime;
    }
    async notifyPatientSplitCompleted(order) {
        await this.notif.create({
            user_id: order.patient_account_id,
            title_key: 'pharmacy.split_completed.title',
            body_key: 'pharmacy.split_completed.body',
            params: { order_id: order.id, splits: order.splits_count, status: order.status },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { type: 'open_pharmacy_order', order_id: order.id },
        }).catch(() => null);
    }
    async notifyPharmacyNewAllocation(alloc) {
        await this.notif.create({
            user_id: alloc.pharmacy_account_id,
            title_key: 'pharmacy.new_allocation.title',
            body_key: 'pharmacy.new_allocation.body',
            params: { allocation_id: alloc.id, order_id: alloc.order_id, items_count: alloc.items?.length || 0 },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { type: 'open_pharmacy_allocation', allocation_id: alloc.id },
        }).catch(() => null);
    }
    async notifyPatientItemUnavailable(alloc, item) {
        const order = await this.lookupOrderId(alloc.order_id);
        if (!order)
            return;
        await this.notif.create({
            user_id: order.patient_account_id,
            title_key: 'pharmacy.item_unavailable.title',
            body_key: 'pharmacy.item_unavailable.body',
            params: { order_id: order.id, item_name: item.name || item.sku },
            type: enums_1.NotificationType.ALERT,
            priority: enums_1.NotificationPriority.NORMAL,
            action: { type: 'open_pharmacy_order', order_id: order.id },
        }).catch(() => null);
    }
    async notifyPatientAllocationConfirmed(alloc) {
        const order = await this.lookupOrderId(alloc.order_id);
        if (!order)
            return;
        await this.notif.create({
            user_id: order.patient_account_id,
            title_key: 'pharmacy.alloc_confirmed.title',
            body_key: 'pharmacy.alloc_confirmed.body',
            params: { order_id: order.id, status: alloc.status },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.NORMAL,
            action: { type: 'open_pharmacy_order', order_id: order.id },
        }).catch(() => null);
    }
    async notifyPatientAllocationProgress(alloc) {
        const order = await this.lookupOrderId(alloc.order_id);
        if (!order)
            return;
        await this.notif.create({
            user_id: order.patient_account_id,
            title_key: `pharmacy.alloc_${alloc.status}.title`,
            body_key: `pharmacy.alloc_${alloc.status}.body`,
            params: { order_id: order.id, status: alloc.status },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.NORMAL,
            action: { type: 'open_pharmacy_order', order_id: order.id },
        }).catch(() => null);
    }
    async notifyPatientAllocationCancelled(alloc, reason) {
        const order = await this.lookupOrderId(alloc.order_id);
        if (!order)
            return;
        await this.notif.create({
            user_id: order.patient_account_id,
            title_key: 'pharmacy.alloc_cancelled.title',
            body_key: 'pharmacy.alloc_cancelled.body',
            params: { order_id: order.id, reason },
            type: enums_1.NotificationType.ALERT,
            priority: enums_1.NotificationPriority.HIGH,
            action: { type: 'open_pharmacy_order', order_id: order.id },
        }).catch(() => null);
    }
    async notifyPharmacyBroadcast(pharmacy_account_id, order, bc) {
        await this.notif.create({
            user_id: pharmacy_account_id,
            title_key: 'pharmacy.broadcast.title',
            body_key: 'pharmacy.broadcast.body',
            params: { order_id: order.id, broadcast_id: bc.id, round: bc.current_round, radius_km: bc.current_radius_km, items_count: order.items?.length || 0 },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.HIGH,
            action: { type: 'open_pharmacy_broadcast', broadcast_id: bc.id, order_id: order.id },
        }).catch(() => null);
        await this.realtime.emitToUser(pharmacy_account_id, 'pharmacy:broadcast:available', {
            broadcast_id: bc.id,
            order_id: order.id,
            round: bc.current_round,
            radius_km: bc.current_radius_km,
        });
    }
    async notifyPharmacyBroadcastCancelled(pharmacy_account_id, order_id, reason) {
        await this.notif.create({
            user_id: pharmacy_account_id,
            title_key: 'pharmacy.broadcast_cancelled.title',
            body_key: 'pharmacy.broadcast_cancelled.body',
            params: { order_id, reason },
            type: enums_1.NotificationType.INFO,
            priority: enums_1.NotificationPriority.NORMAL,
            action: { type: 'open_pharmacy_broadcast', order_id },
        }).catch(() => null);
        await this.realtime.emitToUser(pharmacy_account_id, 'pharmacy:broadcast:cancelled', { order_id, reason });
    }
    async lookupOrderId(orderId) {
        const o = await this.orders.findOne({ id: orderId }, { id: 1, patient_account_id: 1 }).lean();
        return o ? { id: o.id, patient_account_id: o.patient_account_id } : null;
    }
};
exports.PharmacyNotificationService = PharmacyNotificationService;
exports.PharmacyNotificationService = PharmacyNotificationService = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('PharmacyOrderRepository')),
    __metadata("design:paramtypes", [notifications_service_1.NotificationsService,
        pharmacyorder_repository_1.PharmacyOrderRepository,
        realtime_service_1.RealtimeService])
], PharmacyNotificationService);
//# sourceMappingURL=pharmacy-notification.service.js.map