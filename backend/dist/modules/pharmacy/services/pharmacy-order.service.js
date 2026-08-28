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
exports.PharmacyOrderService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const smart_split_service_1 = require("./smart-split.service");
const pharmacy_notification_service_1 = require("./pharmacy-notification.service");
const pharmacy_broadcast_service_1 = require("./pharmacy-broadcast.service");
const event_bus_service_1 = require("../../events/event-bus.service");
const workflow_engine_module_1 = require("../../workflow-engine/workflow-engine.module");
const pharmacy_schema_2 = require("../schemas/pharmacy.schema");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyallocation_repository_1 = require("./repositories/pharmacyallocation.repository");
function assertPatient(u) { if (!u || u.role !== 'patient')
    throw new common_1.ForbiddenException('patient_scope_required'); }
let PharmacyOrderService = class PharmacyOrderService {
    constructor(orders, allocs, split, notif, broadcast, bus, engine) {
        this.orders = orders;
        this.allocs = allocs;
        this.split = split;
        this.notif = notif;
        this.broadcast = broadcast;
        this.bus = bus;
        this.engine = engine;
    }
    async create(user, body) {
        assertPatient(user);
        const items = (body.items || []).map((it) => ({
            id: (0, uuid_1.v4)(),
            raw_name: it.raw_name || it.name || it.name_ar || 'unknown',
            name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
            dosage: it.dosage, form: it.form, frequency: it.frequency, duration: it.duration,
            qty: Math.max(1, Number(it.qty) || 1),
            match_status: pharmacy_schema_1.OrderItemMatchStatus.MANUAL,
            matched_sku: it.sku || it.matched_sku, unit_price: it.unit_price,
            intake_source: it.intake_source || 'manual',
            notes: it.notes,
        }));
        if (!items.length)
            throw new common_1.BadRequestException('items_required');
        const order = await this.orders.create({
            id: (0, uuid_1.v4)(),
            patient_account_id: user.id,
            status: pharmacy_schema_1.PharmacyOrderState.DRAFT,
            items,
            delivery_address: body.delivery_address,
            patient_notes: body.patient_notes,
            prescription_attachments: body.prescription_attachments || [],
            totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
            timeline: [{ ts: new Date(), event: 'created' }],
        });
        await this.engine.announceCreated({ kind: 'pharmacy', entity_id: order.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { items: items.length, intake_source: 'broadcast' } });
        return order.toObject();
    }
    async list(user, status) {
        assertPatient(user);
        const q = { patient_account_id: user.id };
        if (status)
            q.status = status;
        return this.orders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    }
    async detail(user, id) {
        const order = await this.orders.findOne({ id }, { _id: 0, __v: 0 }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (user.role === 'patient' && order.patient_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        const allocs = await this.allocs.find({ order_id: id }, { _id: 0, __v: 0 }).lean();
        const allocStatuses = allocs.map((a) => a.status);
        let effective_status = order.status;
        const isPersistent = ['cancelled', 'completed'].includes(order.status);
        if (!isPersistent && allocs.length > 0) {
            const allClosed = allocStatuses.every((s) => ['delivered', 'cancelled', 'rejected', 'expired'].includes(s));
            const anyDelivered = allocStatuses.some((s) => s === 'delivered');
            const anyOOD = allocStatuses.some((s) => s === 'out_for_delivery');
            const anyPreparing = allocStatuses.some((s) => ['preparing', 'ready_for_pickup'].includes(s));
            if (allClosed && anyDelivered)
                effective_status = 'delivered';
            else if (anyOOD)
                effective_status = 'out_for_delivery';
            else if (anyPreparing)
                effective_status = 'in_fulfillment';
        }
        return { ...order, effective_status, allocations_detail: allocs };
    }
    async update(user, id, body) {
        assertPatient(user);
        const order = await this.orders.findOne({ id });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order.patient_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        if (order.status !== pharmacy_schema_1.PharmacyOrderState.DRAFT)
            throw new common_1.BadRequestException(`not_editable_in_${order.status}`);
        if (body.items) {
            order.items = body.items.map((it) => ({
                id: it.id || (0, uuid_1.v4)(),
                raw_name: it.raw_name || it.name || it.name_ar || 'unknown',
                name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
                dosage: it.dosage, form: it.form, frequency: it.frequency, duration: it.duration,
                qty: Math.max(1, Number(it.qty) || 1),
                match_status: it.match_status || pharmacy_schema_1.OrderItemMatchStatus.MANUAL,
                matched_sku: it.sku || it.matched_sku, unit_price: it.unit_price,
                intake_source: it.intake_source || 'manual',
                notes: it.notes,
            }));
        }
        if (body.delivery_address)
            order.delivery_address = body.delivery_address;
        if (body.patient_notes !== undefined)
            order.patient_notes = body.patient_notes;
        order.timeline.push({ ts: new Date(), event: 'edited' });
        await order.save();
        return order.toObject();
    }
    async submit(user, id) {
        assertPatient(user);
        const order = await this.orders.findOne({ id });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order.patient_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        if (!pharmacy_schema_1.ORDER_TRANSITIONS[order.status].includes(pharmacy_schema_1.PharmacyOrderState.READY_FOR_SPLIT) && order.status !== pharmacy_schema_1.PharmacyOrderState.READY_FOR_SPLIT) {
            if (order.status !== pharmacy_schema_1.PharmacyOrderState.DRAFT) {
                throw new common_1.BadRequestException(`cannot_submit_from_${order.status}`);
            }
        }
        return await this.engine.transition({
            kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: pharmacy_schema_1.PharmacyOrderState.READY_FOR_SPLIT,
            actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, reason: 'patient_submitted',
            mutate: async () => {
                order.status = pharmacy_schema_1.PharmacyOrderState.READY_FOR_SPLIT;
                order.timeline.push({ ts: new Date(), event: 'submitted_by_patient' });
                await order.save();
                await this.broadcast.start(order);
                return this.detail(user, order.id);
            },
        });
    }
    async cancel(user, id, reason) {
        assertPatient(user);
        const order = await this.orders.findOne({ id });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order.patient_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        if ([pharmacy_schema_1.PharmacyOrderState.DELIVERED, pharmacy_schema_1.PharmacyOrderState.COMPLETED, pharmacy_schema_1.PharmacyOrderState.CANCELLED].includes(order.status)) {
            throw new common_1.BadRequestException(`cannot_cancel_in_${order.status}`);
        }
        return await this.engine.transition({
            kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: pharmacy_schema_1.PharmacyOrderState.CANCELLED,
            actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, reason: reason || 'patient_requested',
            mutate: async () => {
                order.status = pharmacy_schema_1.PharmacyOrderState.CANCELLED;
                order.cancellation_reason = reason || 'patient_requested';
                order.timeline.push({ ts: new Date(), event: 'cancelled_by_patient', meta: { reason } });
                await order.save();
                const openAllocs = await this.allocs.find({ order_id: id });
                for (const a of openAllocs) {
                    if (![pharmacy_schema_2.PharmacyAllocationState.DELIVERED, pharmacy_schema_2.PharmacyAllocationState.CANCELLED, pharmacy_schema_2.PharmacyAllocationState.REJECTED].includes(a.status)) {
                        await this.split.releaseStockForAllocation(a);
                        a.status = pharmacy_schema_2.PharmacyAllocationState.CANCELLED;
                        a.cancellation_reason = 'order_cancelled_by_patient';
                        a.timeline.push({ ts: new Date(), event: 'cancelled_by_patient' });
                        await a.save();
                    }
                }
                this.bus.emit({ type: 'pharmacy.allocations_released', entity_type: 'order', entity_id: id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, reason_code: reason || 'patient_requested', meta: { released_allocations: openAllocs.length } }).catch(() => null);
                return { ok: true };
            },
        });
    }
};
exports.PharmacyOrderService = PharmacyOrderService;
exports.PharmacyOrderService = PharmacyOrderService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(1, (0, common_1.Inject)('PharmacyAllocationRepository')),
    __metadata("design:paramtypes", [pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyallocation_repository_1.PharmacyAllocationRepository,
        smart_split_service_1.SmartSplitService,
        pharmacy_notification_service_1.PharmacyNotificationService,
        pharmacy_broadcast_service_1.PharmacyBroadcastService,
        event_bus_service_1.EventBusService,
        workflow_engine_module_1.WorkflowEngineService])
], PharmacyOrderService);
//# sourceMappingURL=pharmacy-order.service.js.map