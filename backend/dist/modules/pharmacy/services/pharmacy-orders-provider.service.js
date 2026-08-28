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
exports.PharmacyOrdersProviderService = void 0;
const common_1 = require("@nestjs/common");
const redis_service_1 = require("../../redis/redis.service");
const event_bus_service_1 = require("../../events/event-bus.service");
const pharmacy_allocation_service_1 = require("./pharmacy-allocation.service");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
let PharmacyOrdersProviderService = class PharmacyOrdersProviderService {
    constructor(redis, bus, orders, allocs) {
        this.redis = redis;
        this.bus = bus;
        this.orders = orders;
        this.allocs = allocs;
    }
    async acceptOrder(user, orderId) {
        const lockKey = `order:accept:lock:${orderId}`;
        const acquired = await this.redis.setnx(lockKey, user.id);
        if (!acquired) {
            throw new common_1.BadRequestException('Order already accepted by another pharmacy');
        }
        await this.redis.expire(lockKey, 300);
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
        }).catch(() => null);
        return { success: true, status: confirmed.status, order_id: orderId, allocation_id: alloc.id };
    }
    async submitBasket(user, orderId, payload) {
        const order = await this.orders.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        const basket = Array.isArray(payload?.basket) ? payload.basket : (Array.isArray(payload?.items) ? payload.items : []);
        if (!basket.length)
            throw new common_1.BadRequestException('basket_empty');
        const subtotal = basket.reduce((s, i) => s + (Number(i?.price ?? i?.unit_price) || 0) * (Number(i?.qty ?? i?.qty_offered ?? 1) || 1), 0);
        const deliveryFee = Number(order.totals?.delivery_fee) || 0;
        await this.orders.updateOne({ id: orderId }, {
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
        });
        this.bus.emit({
            type: 'system.event',
            payload: { orderId, newState: 'basket_submitted', actorId: user.id, actorRole: 'pharmacy', timestamp: new Date() },
        }).catch(() => null);
        return { success: true, status: 'basket_submitted', order_id: orderId, subtotal: Math.round(subtotal * 100) / 100 };
    }
    async evaluateInsurance(user, orderId, payload) {
        const order = await this.orders.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        const copay = Number(payload?.copay) || 0;
        await this.orders.updateOne({ id: orderId }, {
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
        });
        return { success: true, status: 'insurance_evaluated', insurance_copay: copay };
    }
    async selectedAllocationForProvider(user, orderId) {
        const order = await this.orders.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (!order.selected_offer_id || !order.selected_allocation_id) {
            throw new common_1.BadRequestException('patient_offer_selection_required');
        }
        const allocation = await this.allocs.findByOrderForProvider(user, orderId);
        if (!allocation || allocation.id !== order.selected_allocation_id) {
            throw new common_1.ForbiddenException('selected_allocation_not_owned_by_provider');
        }
        return allocation;
    }
    async orderPreparing(user, orderId) {
        const alloc = await this.selectedAllocationForProvider(user, orderId);
        const a = await this.allocs.preparing(user, alloc.id);
        return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
    }
    async orderReady(user, orderId) {
        const alloc = await this.selectedAllocationForProvider(user, orderId);
        const a = await this.allocs.ready(user, alloc.id);
        return { success: true, status: a.status, order_id: orderId, allocation_id: alloc.id };
    }
    async orderDispatch(user, orderId, payload) {
        const alloc = await this.selectedAllocationForProvider(user, orderId);
        return this.allocs.outForDelivery(user, alloc.id, payload);
    }
};
exports.PharmacyOrdersProviderService = PharmacyOrdersProviderService;
exports.PharmacyOrdersProviderService = PharmacyOrdersProviderService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('PharmacyOrderRepository')),
    __metadata("design:paramtypes", [redis_service_1.RedisService,
        event_bus_service_1.EventBusService,
        pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacy_allocation_service_1.PharmacyAllocationService])
], PharmacyOrdersProviderService);
//# sourceMappingURL=pharmacy-orders-provider.service.js.map