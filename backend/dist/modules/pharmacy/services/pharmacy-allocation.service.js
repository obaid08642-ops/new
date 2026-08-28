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
exports.PharmacyAllocationService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const smart_split_service_1 = require("./smart-split.service");
const pharmacy_notification_service_1 = require("./pharmacy-notification.service");
const event_bus_service_1 = require("../../events/event-bus.service");
const workflow_engine_module_1 = require("../../workflow-engine/workflow-engine.module");
const pharmacyallocation_repository_1 = require("./repositories/pharmacyallocation.repository");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const enums_1 = require("../../../common/enums");
function assertProvider(u) { if (!u || !(0, enums_1.isProviderRole)(u.role))
    throw new common_1.ForbiddenException('provider_scope_required'); }
let PharmacyAllocationService = class PharmacyAllocationService {
    constructor(allocs, orders, inv, split, notif, bus, engine) {
        this.allocs = allocs;
        this.orders = orders;
        this.inv = inv;
        this.split = split;
        this.notif = notif;
        this.bus = bus;
        this.engine = engine;
    }
    async listForProvider(user, status) {
        assertProvider(user);
        const q = { pharmacy_account_id: user.id };
        if (status)
            q.status = status;
        return this.allocs.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    }
    async findByOrderForProvider(user, orderId) {
        assertProvider(user);
        const a = await this.allocs.findOne({ order_id: orderId, pharmacy_account_id: user.id });
        if (!a)
            throw new common_1.NotFoundException('allocation_not_found_for_order');
        return a;
    }
    async detail(user, id) {
        const a = await this.allocs.findOne({ id }, { _id: 0, __v: 0 }).lean();
        if (!a)
            throw new common_1.NotFoundException('allocation_not_found');
        if (user.role === 'provider' && a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        const order = await this.orders.findOne({ id: a.order_id }, { _id: 0, __v: 0, patient_account_id: 0 }).lean();
        let patient_contact = null;
        if (order && order.selected_allocation_id === a.id && order.selected_offer_id === a.offer_id) {
            const patient = await this.orders.db.collection('users').findOne({ id: order.patient_account_id });
            if (patient)
                patient_contact = { name: patient.full_name || patient.name || null, phone: patient.phone || null };
        }
        return { ...a, order, patient_contact };
    }
    async itemAction(user, allocId, allocItemId, body) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id: allocId });
        if (!a)
            throw new common_1.NotFoundException('allocation_not_found');
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException('not_yours');
        if (a.offer_id)
            throw new common_1.BadRequestException('selected_offer_immutable');
        if (![pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW, pharmacy_schema_1.PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(a.status)) {
            throw new common_1.BadRequestException(`cannot_change_items_in_${a.status}`);
        }
        const item = a.items.find(i => i.id === allocItemId);
        if (!item)
            throw new common_1.NotFoundException('alloc_item_not_found');
        const prevAction = item.action;
        const prevQty = item.qty_offered;
        const prevInvId = item.inventory_id;
        item.action = body.action;
        item.notes = body.notes || item.notes;
        item.updated_at = new Date();
        if (body.action === pharmacy_schema_1.AllocationItemAction.SUBSTITUTE) {
            if (!body.substitute_sku)
                throw new common_1.BadRequestException('substitute_sku_required');
            const subInv = await this.inv.findOne({ provider_account_id: user.id, sku: body.substitute_sku, available: true });
            if (!subInv)
                throw new common_1.BadRequestException('substitute_not_in_inventory');
            if (subInv.stock < (body.qty_offered || item.qty_requested))
                throw new common_1.BadRequestException('substitute_insufficient_stock');
            if (prevAction === pharmacy_schema_1.AllocationItemAction.AVAILABLE && prevInvId && prevQty) {
                await this.inv.updateOne({ id: prevInvId, provider_account_id: user.id }, { $inc: { stock: prevQty } });
            }
            const qty = body.qty_offered || item.qty_requested;
            const reserved = await this.inv.findOneAndUpdate({ id: subInv.id, provider_account_id: user.id, stock: { $gte: qty } }, { $inc: { stock: -qty } });
            if (!reserved)
                throw new common_1.BadRequestException('substitute_stock_race');
            item.substitute_for_sku = item.sku;
            item.substitute_reason = body.substitute_reason;
            item.inventory_id = subInv.id;
            item.sku = subInv.sku;
            item.name = subInv.name_ar || subInv.name_en;
            item.qty_offered = qty;
            item.unit_price = subInv.price;
        }
        else if (body.action === pharmacy_schema_1.AllocationItemAction.UNAVAILABLE) {
            if (prevAction === pharmacy_schema_1.AllocationItemAction.AVAILABLE && prevInvId && prevQty) {
                await this.inv.updateOne({ id: prevInvId, provider_account_id: user.id }, { $inc: { stock: prevQty } });
            }
            item.qty_offered = 0;
            item.inventory_id = undefined;
        }
        else if (body.action === pharmacy_schema_1.AllocationItemAction.AVAILABLE) {
            const newQty = body.qty_offered || item.qty_requested;
            if (newQty !== prevQty) {
                const delta = newQty - prevQty;
                if (delta > 0) {
                    const reserved = await this.inv.findOneAndUpdate({ id: item.inventory_id, provider_account_id: user.id, stock: { $gte: delta } }, { $inc: { stock: -delta } });
                    if (!reserved)
                        throw new common_1.BadRequestException('insufficient_stock_for_increase');
                }
                else if (delta < 0 && item.inventory_id) {
                    await this.inv.updateOne({ id: item.inventory_id, provider_account_id: user.id }, { $inc: { stock: -delta } });
                }
                item.qty_offered = newQty;
            }
        }
        a.totals.subtotal = a.items.filter(i => i.action === pharmacy_schema_1.AllocationItemAction.AVAILABLE || i.action === pharmacy_schema_1.AllocationItemAction.SUBSTITUTE).reduce((s, i) => s + (i.unit_price || 0) * (i.qty_offered || 0), 0);
        a.totals.total = a.totals.subtotal + (a.totals.delivery_fee || 0);
        a.timeline.push({ ts: new Date(), event: 'item_action', by: user.id, meta: { item_id: allocItemId, action: body.action } });
        a.markModified('items');
        await a.save();
        if (body.action === pharmacy_schema_1.AllocationItemAction.UNAVAILABLE) {
            await this.notif.notifyPatientItemUnavailable(a, item);
        }
        return a.toObject();
    }
    transition(a, to, by, meta) {
        if (!pharmacy_schema_1.ALLOCATION_TRANSITIONS[a.status].includes(to)) {
            throw new common_1.BadRequestException(`invalid_transition_${a.status}_to_${to}`);
        }
        a.status = to;
        a.timeline.push({ ts: new Date(), event: to, by, meta });
    }
    async assertFulfillmentAuthorized(a) {
        const order = await this.orders.findOne({ id: a.order_id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (!order.selected_offer_id || !order.selected_allocation_id ||
            order.selected_offer_id !== a.offer_id || order.selected_allocation_id !== a.id ||
            Number(order.selected_offer_version) !== Number(a.offer_version)) {
            throw new common_1.BadRequestException('selected_offer_binding_required');
        }
        const quotedTotal = Number(order.pricing_snapshot?.totals?.total);
        if (!order.pricing_snapshot || order.pricing_snapshot.offer_id !== a.offer_id ||
            Number(order.pricing_snapshot.offer_version) !== Number(a.offer_version) ||
            !Number.isFinite(quotedTotal) || Math.round(quotedTotal * 100) !== Math.round(Number(a.totals?.total || 0) * 100)) {
            throw new common_1.BadRequestException('selected_quote_version_mismatch');
        }
        const paymentMethod = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
        const paidFor = async (amount) => {
            const snapshotHash = String(order.pricing_snapshot?.hash || '');
            if (!snapshotHash)
                return false;
            const payment = await this.orders.db.collection('pharmacy_payment_evidence').findOne({
                order_id: order.id, selected_offer_id: a.offer_id, selected_offer_version: a.offer_version,
                quote_snapshot_hash: snapshotHash, amount: Math.round(amount * 100) / 100,
                currency: String(a.totals?.currency || 'SAR'), payer_account_id: order.patient_account_id,
                status: 'confirmed', gateway_payment_id: { $exists: true }, webhook_event_id: { $exists: true },
            });
            return !!payment;
        };
        if (paymentMethod === 'cash' || paymentMethod === 'card') {
            if (!await paidFor(quotedTotal))
                throw new common_1.BadRequestException('payment_confirmation_required');
            return order;
        }
        if (paymentMethod === 'cod') {
            const policy = await this.orders.db.collection('pharmacy_fulfillment_policies').findOne({
                active: true, payment_method: 'cod', allow_preparation: true,
                $or: [{ provider_account_id: a.pharmacy_account_id }, { provider_account_id: null }, { provider_account_id: { $exists: false } }],
            });
            if (!policy)
                throw new common_1.BadRequestException('cod_policy_confirmation_required');
            return order;
        }
        if (paymentMethod === 'insurance') {
            const decision = order.insurance_decision;
            if (!decision || decision.offer_id !== a.offer_id || Number(decision.offer_version) !== Number(a.offer_version)) {
                throw new common_1.BadRequestException('insurance_decision_required');
            }
            if (decision.outcome === 'full' && Number(decision.patient_share || 0) === 0)
                return order;
            if (decision.outcome === 'partial' && Number(decision.patient_share || 0) > 0 && await paidFor(Number(decision.patient_share)))
                return order;
            if (decision.outcome === 'rejected')
                throw new common_1.BadRequestException('insurance_requote_required');
            throw new common_1.BadRequestException('copay_payment_confirmation_required');
        }
        throw new common_1.BadRequestException('unsupported_payment_method');
    }
    async confirm(user, id) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        await this.assertFulfillmentAuthorized(a);
        const anyUnavailable = a.items.some(i => i.action === pharmacy_schema_1.AllocationItemAction.UNAVAILABLE);
        const anyAvailable = a.items.some(i => i.action !== pharmacy_schema_1.AllocationItemAction.UNAVAILABLE);
        if (!anyAvailable) {
            this.transition(a, pharmacy_schema_1.PharmacyAllocationState.REJECTED, user.id, { reason: 'all_items_unavailable' });
            a.rejection_reason = 'all_items_unavailable';
        }
        else if (anyUnavailable) {
            this.transition(a, pharmacy_schema_1.PharmacyAllocationState.PARTIALLY_CONFIRMED, user.id);
        }
        else {
            this.transition(a, pharmacy_schema_1.PharmacyAllocationState.CONFIRMED, user.id);
        }
        a.estimated_ready_at = new Date(Date.now() + (a.estimated_preparation_minutes || 30) * 60_000);
        await a.save();
        await this.refreshOrderAfterAllocationChange(a.order_id);
        await this.notif.notifyPatientAllocationConfirmed(a);
        return a.toObject();
    }
    async preparing(user, id) { return this.advance(user, id, pharmacy_schema_1.PharmacyAllocationState.PREPARING); }
    async ready(user, id) { return this.advance(user, id, pharmacy_schema_1.PharmacyAllocationState.READY_FOR_PICKUP); }
    async outForDelivery(user, id, body) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        await this.assertFulfillmentAuthorized(a);
        const order = await this.orders.findOne({ id: a.order_id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order?.delivery?.method === 'pickup')
            throw new common_1.BadRequestException('pickup_orders_are_handed_over_not_shipped');
        const fromStatus = a.status;
        this.transition(a, pharmacy_schema_1.PharmacyAllocationState.OUT_FOR_DELIVERY, user.id);
        await a.save();
        await this.orders.updateOne({ id: a.order_id }, {
            $set: {
                'delivery.courier_name': String(body?.courier_name || '').slice(0, 120) || undefined,
                'delivery.courier_phone': String(body?.courier_phone || '').slice(0, 32) || undefined,
                'delivery.courier_eta': body?.eta ? new Date(body.eta) : undefined,
                'delivery.dispatched_at': new Date(),
            },
            $push: { timeline: { ts: new Date(), event: 'out_for_delivery', by: user.id } },
        });
        await this.refreshOrderAfterAllocationChange(a.order_id);
        await this.notif.notifyPatientAllocationProgress(a);
        await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: 'transition_to_out_for_delivery', before: { status: fromStatus }, after: { status: a.status }, meta: { order_id: a.order_id } });
        return a.toObject();
    }
    async delivered(user, id, body) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        await this.assertFulfillmentAuthorized(a);
        const order = await this.orders.findOne({ id: a.order_id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        const method = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
        const isCod = method === 'cod' || order.status === pharmacy_schema_1.PharmacyOrderState.COD_DUE_ON_DELIVERY;
        if (isCod) {
            const expected = Math.round(Number(order.pricing_snapshot?.totals?.total ?? a.totals?.total) * 100) / 100;
            const collected = Number(body?.collection?.amount_collected);
            const collMethod = body?.collection?.method;
            if (!['cash', 'card_terminal'].includes(String(collMethod)) || !Number.isFinite(collected)) {
                throw new common_1.BadRequestException('cod_collection_proof_required');
            }
            if (Math.round(collected * 100) / 100 !== expected) {
                throw new common_1.BadRequestException('collected_amount_must_match_selected_quote_total');
            }
            await this.orders.db.collection('pharmacy_payment_evidence').insertOne({
                id: (0, uuid_1.v4)(),
                kind: 'cod_collection',
                order_id: order.id,
                allocation_id: a.id,
                selected_offer_id: a.offer_id,
                selected_offer_version: a.offer_version,
                amount: Math.round(collected * 100) / 100,
                currency: String(a.totals?.currency || 'SAR'),
                method: collMethod,
                collected_by: user.id,
                collected_at: new Date(),
                status: 'confirmed',
            });
            await this.orders.updateOne({ id: a.order_id }, {
                $set: { 'delivery.collection_proof': { method: collMethod, amount_collected: Math.round(collected * 100) / 100, collected_by: user.id, collected_at: new Date() } },
            });
        }
        const fromStatus = a.status;
        this.transition(a, pharmacy_schema_1.PharmacyAllocationState.DELIVERED, user.id);
        await a.save();
        await this.refreshOrderAfterAllocationChange(a.order_id);
        await this.notif.notifyPatientAllocationProgress(a);
        await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: 'transition_to_delivered', before: { status: fromStatus }, after: { status: a.status }, meta: { order_id: a.order_id } });
        return a.toObject();
    }
    async advance(user, id, to) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        await this.assertFulfillmentAuthorized(a);
        const fromStatus = a.status;
        this.transition(a, to, user.id);
        await a.save();
        await this.refreshOrderAfterAllocationChange(a.order_id);
        await this.notif.notifyPatientAllocationProgress(a);
        await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: `transition_to_${to}`, before: { status: fromStatus }, after: { status: to }, meta: { order_id: a.order_id } });
        return a.toObject();
    }
    async cancel(user, id, reason) {
        assertProvider(user);
        const a = await this.allocs.findOne({ id });
        if (!a)
            throw new common_1.NotFoundException();
        if (a.pharmacy_account_id !== user.id)
            throw new common_1.ForbiddenException();
        if ([pharmacy_schema_1.PharmacyAllocationState.DELIVERED, pharmacy_schema_1.PharmacyAllocationState.CANCELLED].includes(a.status))
            throw new common_1.BadRequestException('already_terminal');
        await this.split.releaseStockForAllocation(a);
        this.transition(a, pharmacy_schema_1.PharmacyAllocationState.CANCELLED, user.id, { reason });
        a.cancellation_reason = reason;
        await a.save();
        await this.refreshOrderAfterAllocationChange(a.order_id);
        await this.notif.notifyPatientAllocationCancelled(a, reason);
        await this.bus.emit({ type: 'allocation.cancelled', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: reason || 'pharmacy_cancelled', meta: { order_id: a.order_id } });
        return a.toObject();
    }
    async refreshOrderAfterAllocationChange(orderId) {
        const order = await this.orders.findOne({ id: orderId });
        if (!order)
            return;
        const allocs = await this.allocs.find({ order_id: orderId }).lean();
        const allConfirmed = allocs.every(a => [pharmacy_schema_1.PharmacyAllocationState.CONFIRMED, pharmacy_schema_1.PharmacyAllocationState.PARTIALLY_CONFIRMED, pharmacy_schema_1.PharmacyAllocationState.PREPARING, pharmacy_schema_1.PharmacyAllocationState.READY_FOR_PICKUP, pharmacy_schema_1.PharmacyAllocationState.OUT_FOR_DELIVERY, pharmacy_schema_1.PharmacyAllocationState.DELIVERED, pharmacy_schema_1.PharmacyAllocationState.REJECTED, pharmacy_schema_1.PharmacyAllocationState.CANCELLED].includes(a.status));
        const allDelivered = allocs.length > 0 && allocs.every(a => [pharmacy_schema_1.PharmacyAllocationState.DELIVERED, pharmacy_schema_1.PharmacyAllocationState.CANCELLED, pharmacy_schema_1.PharmacyAllocationState.REJECTED].includes(a.status));
        const anyOut = allocs.some(a => a.status === pharmacy_schema_1.PharmacyAllocationState.OUT_FOR_DELIVERY);
        const anyPreparing = allocs.some(a => [pharmacy_schema_1.PharmacyAllocationState.PREPARING, pharmacy_schema_1.PharmacyAllocationState.READY_FOR_PICKUP].includes(a.status));
        let nextStatus = null;
        let event = '';
        if (allDelivered && order.status !== pharmacy_schema_1.PharmacyOrderState.DELIVERED && order.status !== pharmacy_schema_1.PharmacyOrderState.COMPLETED) {
            nextStatus = pharmacy_schema_1.PharmacyOrderState.DELIVERED;
            event = 'all_allocations_delivered';
        }
        else if (anyOut && order.status !== pharmacy_schema_1.PharmacyOrderState.OUT_FOR_DELIVERY) {
            nextStatus = pharmacy_schema_1.PharmacyOrderState.OUT_FOR_DELIVERY;
            event = 'first_out_for_delivery';
        }
        else if (anyPreparing && order.status !== pharmacy_schema_1.PharmacyOrderState.IN_FULFILLMENT) {
            nextStatus = pharmacy_schema_1.PharmacyOrderState.IN_FULFILLMENT;
            event = 'fulfillment_started';
        }
        else if (allConfirmed && order.status === pharmacy_schema_1.PharmacyOrderState.FULLY_ALLOCATED) {
            nextStatus = pharmacy_schema_1.PharmacyOrderState.CONFIRMED;
            event = 'all_allocations_confirmed';
        }
        if (!nextStatus)
            return;
        await this.engine.transition({
            kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: nextStatus,
            actor_role: 'system', patient_account_id: order.patient_account_id, reason: event,
            mutate: async () => {
                order.status = nextStatus;
                order.timeline.push({ ts: new Date(), event });
                if (nextStatus === pharmacy_schema_1.PharmacyOrderState.DELIVERED) {
                    await this.bus.emit({ type: 'pharmacy.all_allocations_delivered', entity_type: 'order', entity_id: order.id, patient_account_id: order.patient_account_id, reason_code: 'all_allocations_delivered', actor_role: 'system', meta: { allocations: allocs.length } });
                }
                await order.save();
                return order.toObject();
            },
        }).catch(() => null);
    }
    async expireStale() {
        const now = new Date();
        const stale = await this.allocs.find({ status: pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW, review_expires_at: { $lt: now } });
        let expired = 0;
        for (const a of stale) {
            await this.split.releaseStockForAllocation(a);
            this.transition(a, pharmacy_schema_1.PharmacyAllocationState.EXPIRED, 'system', { reason: 'review_timeout' });
            await a.save();
            expired++;
            await this.refreshOrderAfterAllocationChange(a.order_id);
        }
        return { expired, scanned: stale.length };
    }
    updateInsurance() {
        throw new common_1.ServiceUnavailableException('legacy_allocation_insurance_disabled_use_admin_selected_offer_decision');
    }
};
exports.PharmacyAllocationService = PharmacyAllocationService;
exports.PharmacyAllocationService = PharmacyAllocationService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyAllocationRepository')),
    __param(1, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(2, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __metadata("design:paramtypes", [pharmacyallocation_repository_1.PharmacyAllocationRepository,
        pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        smart_split_service_1.SmartSplitService,
        pharmacy_notification_service_1.PharmacyNotificationService,
        event_bus_service_1.EventBusService,
        workflow_engine_module_1.WorkflowEngineService])
], PharmacyAllocationService);
//# sourceMappingURL=pharmacy-allocation.service.js.map