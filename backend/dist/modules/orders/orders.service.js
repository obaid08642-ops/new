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
exports.OrdersService = void 0;
const PDFDocument = require('pdfkit');
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const dispatch_service_1 = require("./dispatch.service");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const order_repository_1 = require("./repositories/order.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const delivery_repository_1 = require("./repositories/delivery.repository");
const pharmacybid_repository_1 = require("./repositories/pharmacybid.repository");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const product_ranking_event_service_1 = require("../product-ranking/product-ranking-event.service");
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
let OrdersService = class OrdersService {
    constructor(orderModel, medModel, delModel, bidModel, events, dispatchSvc, engine, conn, coupons, loyaltyRedeem, refundExec, cancelPolicy, rankingEvents) {
        this.orderModel = orderModel;
        this.medModel = medModel;
        this.delModel = delModel;
        this.bidModel = bidModel;
        this.events = events;
        this.dispatchSvc = dispatchSvc;
        this.engine = engine;
        this.conn = conn;
        this.coupons = coupons;
        this.loyaltyRedeem = loyaltyRedeem;
        this.refundExec = refundExec;
        this.cancelPolicy = cancelPolicy;
        this.rankingEvents = rankingEvents;
    }
    async assertNotCanonicalPharmacyOrder(order) {
        const isPharmacy = Boolean(order?.service_kind === 'pharmacy' ||
            order?.order_type === 'pharmacy' ||
            order?.type === 'pharmacy' ||
            order?.pharmacy_id ||
            (order?.basket_review_status && order.basket_review_status !== 'none') ||
            order?.insurance_details ||
            (Array.isArray(order?.items) && order.items.some((item) => item?.is_manual_entry || item?.is_substitute)));
        if (isPharmacy)
            throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async create(patient, data) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async transition(orderId, to, by, reason) {
        const order = await this.orderModel.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(order);
        const allowed = enums_1.ORDER_TRANSITIONS[order.state] || [];
        if (by.role !== enums_1.UserRole.ADMIN && by.role !== 'system' && !allowed.includes(to)) {
            throw new common_1.BadRequestException(`Invalid transition ${order.state} → ${to}`);
        }
        const from = order.state;
        return await this.engine.apply({
            kind: 'pharmacy', entity_id: order.id, from_domain: from, to_domain: to,
            actor_account_id: by.id, actor_role: by.role, patient_account_id: order.patient_id, reason,
            mutate: async () => {
                order.state = to;
                order.state_history.push({ from, to, by_user_id: by.id, by_role: by.role, reason, at: new Date() });
                if (to === enums_1.OrderState.REJECTED) {
                    order.rejection_reason = reason;
                    order.rejected_by = by.id;
                    this.events.emit(events_1.EVENTS.ORDER_REJECTED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                    order.escalated = true;
                    order.state_history.push({ from: to, to: enums_1.OrderState.ESCALATED_TO_ADMIN, by_user_id: 'system', by_role: 'system', reason: 'auto-escalate-on-reject', at: new Date() });
                    order.state = enums_1.OrderState.ESCALATED_TO_ADMIN;
                    this.events.emit(events_1.EVENTS.ORDER_ESCALATED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                }
                if (to === enums_1.OrderState.READY_FOR_DISPATCH) {
                    const existingDel = await this.delModel.findOne({ order_id: order.id });
                    if (!existingDel)
                        await this.delModel.create({ order_id: order.id, pharmacy_id: order.pharmacy_id, state: enums_1.DeliveryState.UNASSIGNED });
                    this.events.emit(events_1.EVENTS.ORDER_READY, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                }
                if (to === enums_1.OrderState.ASSIGNED_TO_DELIVERY)
                    this.events.emit(events_1.EVENTS.ORDER_ASSIGNED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                if (to === enums_1.OrderState.OUT_FOR_DELIVERY)
                    this.events.emit(events_1.EVENTS.ORDER_OUT_FOR_DELIVERY, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                if (to === enums_1.OrderState.DELIVERED) {
                    this.events.emit(events_1.EVENTS.ORDER_DELIVERED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                    await this.conn.collection('medicationreminders').updateOne({ patient_id: order.patient_id, refill_pending_order_id: order.id }, { $set: { order_id: order.id, refill_fulfilled_at: new Date() }, $unset: { refill_pending_order_id: 1 } });
                    if (Array.isArray(order.items) && this.rankingEvents) {
                        for (const it of order.items) {
                            if (it.medicine_id) {
                                this.rankingEvents.recordEvent({
                                    eventType: 'purchase_completed',
                                    drugId: it.medicine_id,
                                    pharmacyId: order.pharmacy_id || 'global',
                                    quantity: it.qty || 1,
                                    userId: order.patient_id,
                                }).catch(() => {});
                            }
                        }
                    }
                }
                if (to === enums_1.OrderState.CANCELLED)
                    this.events.emit(events_1.EVENTS.ORDER_CANCELLED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                if (to === enums_1.OrderState.ACCEPTED) {
                    this.events.emit(events_1.EVENTS.ORDER_ACCEPTED, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                    if (order.pharmacy_id)
                        await this.dispatchSvc.deductStock(order.pharmacy_id, order.items.map((it) => ({ medicine_id: it.medicine_id, qty: it.qty })));
                }
                if (to === enums_1.OrderState.PREPARING)
                    this.events.emit(events_1.EVENTS.ORDER_PREPARING, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                if (to === enums_1.OrderState.PARTIALLY_FULFILLED)
                    this.events.emit(events_1.EVENTS.ORDER_PARTIAL, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                if (to === enums_1.OrderState.PHARMACY_RECEIVED)
                    this.events.emit(events_1.EVENTS.ORDER_RECEIVED_BY_PHARMACY, { order_id: order.id, patient_id: order.patient_id, pharmacy_id: order.pharmacy_id });
                await order.save();
                return order.toObject();
            },
        });
    }
    assertOrderAccess(order, user) {
        if (!user)
            return;
        const role = String(user.role || '').toLowerCase();
        if (role === enums_1.UserRole.ADMIN || role === 'admin' || role === 'super_admin')
            return;
        if (role === enums_1.UserRole.PATIENT && order.patient_id === user.id)
            return;
        if (['pharmacy', 'provider'].includes(role) && order.pharmacy_id === user.id)
            return;
        throw new common_1.NotFoundException('order_not_found');
    }
    async getById(id, user) {
        const o = await this.orderModel.findOne({ id }, { _id: 0, __v: 0 });
        if (!o)
            throw new common_1.NotFoundException();
        this.assertOrderAccess(o, user);
        if (o.is_split && o.sub_order_ids?.length) {
            const subs = await this.orderModel.find({ id: { $in: o.sub_order_ids } }, { _id: 0, __v: 0 });
            o.sub_orders = subs;
        }
        return o;
    }
    async listMine(patient_id, type) {
        const q = { patient_id, parent_order_id: { $exists: false } };
        if (type) {
            q.type = type;
        }
        return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100);
    }
    async listForPharmacy(pharmacy_id, state) {
        const q = { pharmacy_id };
        if (state)
            q.state = state;
        return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200);
    }
    async listAll(state, search) {
        const q = {};
        if (state)
            q.state = state;
        if (search)
            q.$or = [{ id: search }, { patient_phone: { $regex: search, $options: 'i' } }];
        return this.orderModel.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(500);
    }
    async listEscalated() {
        return this.orderModel.find({ escalated: true, state: { $ne: enums_1.OrderState.DELIVERED } }, { _id: 0, __v: 0 });
    }
    async accept(orderId, by) { return this.transition(orderId, enums_1.OrderState.ACCEPTED, by); }
    async reject(orderId, by, reason) {
        const order = await this.orderModel.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException();
        const rejectedPharm = order.pharmacy_id;
        await this.transition(orderId, enums_1.OrderState.REJECTED, by, reason);
        if (order.delivery_address?.lat && order.delivery_address?.lng) {
            const result = await this.dispatchSvc.dispatchSplit({ lat: order.delivery_address.lat, lng: order.delivery_address.lng }, order.items.map((it) => ({ medicine_id: it.medicine_id, qty: it.qty })), rejectedPharm ? [rejectedPharm] : []);
            if (result.ok) {
                order.pharmacy_id = result.selected_pharmacy_id;
                order.escalated = false;
                order.state = enums_1.OrderState.CREATED;
                order.state_history.push({ from: enums_1.OrderState.ESCALATED_TO_ADMIN, to: enums_1.OrderState.CREATED, by_user_id: 'system', by_role: 'system', reason: 're-dispatch-after-rejection', at: new Date() });
                await order.save();
                await this.transition(orderId, enums_1.OrderState.PHARMACY_RECEIVED, { id: 'system', role: 'system' });
            }
        }
        return this.getById(orderId);
    }
    async markPreparing(orderId, by) { return this.transition(orderId, enums_1.OrderState.PREPARING, by); }
    async markReady(orderId, by) { return this.transition(orderId, enums_1.OrderState.READY_FOR_DISPATCH, by); }
    async markPartial(orderId, by, unavailableMedicineIds) {
        const o = await this.orderModel.findOne({ id: orderId });
        if (!o)
            throw new common_1.NotFoundException();
        const oldTotal = Number(o.total || 0);
        o.items = o.items.map((it) => ({ ...it, unavailable: unavailableMedicineIds.includes(it.medicine_id) }));
        o.subtotal = o.items.filter((it) => !it.unavailable).reduce((s, it) => s + it.price * it.qty, 0);
        o.total = o.subtotal + (o.delivery_fee || 0);
        await o.save();
        const result = await this.transition(orderId, enums_1.OrderState.PARTIALLY_FULFILLED, by);
        const diff = round2(oldTotal - Number(o.total || 0));
        if (diff > 0 && o.payment_status === 'paid') {
            try {
                await this.refundExec.execute({
                    refund_id: `partial_${orderId}_${String(o.total).replace('.', '_')}`,
                    booking_kind: 'pharmacy', booking_id: orderId, patient_id: o.patient_id,
                    amount: diff, reason: 'partial fulfillment — unavailable items refunded', actor_id: by.id,
                });
            }
            catch (e) {
                this.events.emit('refund.execution_failed', { order_id: orderId, amount: diff, error: e?.message });
            }
        }
        return result;
    }
    async cancel(orderId, by, reason) {
        const order = await this.orderModel.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(order);
        this.assertOrderAccess(order, by);
        const policy = await this.cancelPolicy.forOrder(order.state, by.role, order.delivery_fee || 0);
        if (!policy.allowed) {
            throw new common_1.BadRequestException(`Cannot cancel order at this stage (${policy.block_reason || 'not_allowed'})`);
        }
        const wasPaid = order.payment_status === 'paid'
            || !!(await this.conn.collection('moyasar_payments').findOne({ booking_id: orderId, status: 'paid' }));
        if (wasPaid) {
            const cardPaid = await this.conn.collection('moyasar_payments').findOne({ booking_id: orderId, status: 'paid' });
            const cardAmount = cardPaid ? Number(cardPaid.amount || 0) - Number(cardPaid.refunded_amount || 0) : 0;
            const refundViaGateway = round2(Math.max(0, cardAmount - policy.fee_sar));
            if (refundViaGateway > 0) {
                await this.refundExec.execute({
                    refund_id: `cancel_${orderId}`,
                    booking_kind: 'pharmacy',
                    booking_id: orderId,
                    patient_id: order.patient_id,
                    amount: refundViaGateway,
                    reason: reason || `cancellation by ${by.role}`,
                    actor_id: by.id,
                });
            }
            let walletApplied = Number(order.wallet_applied || 0);
            if (walletApplied <= 0) {
                const debits = await this.conn.collection('wallet_transactions')
                    .find({ referenceType: 'booking', referenceId: orderId, type: 'debit' }).toArray();
                walletApplied = round2(debits.reduce((s, t) => s + Number(t.amount || 0), 0));
            }
            if (walletApplied > 0) {
                const already = await this.conn.collection('wallet_transactions').findOne({ referenceId: `cancel_${orderId}` });
                if (!already) {
                    const wallet = await this.conn.collection('wallets').findOne({ ownerId: order.patient_id, ownerType: 'patient' });
                    if (wallet) {
                        await this.conn.collection('wallets').updateOne({ _id: wallet._id }, { $inc: { balance: walletApplied }, $set: { updatedAt: new Date() } });
                        await this.conn.collection('wallet_transactions').insertOne({
                            id: require('uuid').v4(), walletId: wallet.id, amount: walletApplied, type: 'credit',
                            referenceType: 'refund', referenceId: `cancel_${orderId}`,
                            description: `استرداد محفظة لإلغاء الطلب #${orderId.slice(0, 8)}`,
                            createdAt: new Date(), updatedAt: new Date(),
                        });
                    }
                }
            }
            const upd = { refund_status: 'REFUNDED', payment_status: 'refunded', refunded_at: new Date() };
            if (policy.fee_sar > 0) {
                upd.cancellation_fee = policy.fee_sar;
                upd.cancellation_fee_reason = policy.fee_reason;
            }
            await this.orderModel.updateOne({ id: orderId }, { $set: upd });
        }
        try {
            await this.loyaltyRedeem.refundRedemption(order.patient_id, orderId);
        }
        catch { }
        try {
            await this.coupons.release(orderId);
        }
        catch { }
        if (policy.restore_stock && order.pharmacy_id) {
            try {
                await this.dispatchSvc.restoreStock(order.pharmacy_id, order.items.map((it) => ({ medicine_id: it.medicine_id, qty: it.qty })));
            }
            catch { }
        }
        return this.transition(orderId, enums_1.OrderState.CANCELLED, by, reason);
    }
    async generatePdf(orderId, user) {
        const order = await this.orderModel.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException();
        this.assertOrderAccess(order, user);
        return new Promise((resolve, reject) => {
            try {
                const doc = new PDFDocument({ margin: 50, size: 'A4' });
                const buffers = [];
                doc.on('data', buffers.push.bind(buffers));
                doc.on('error', reject);
                doc.on('end', () => {
                    resolve(Buffer.concat(buffers));
                });
                doc.fontSize(24).fillColor('#004D40').text('Nabd Plus - Medical Report', { align: 'center' });
                doc.moveDown();
                doc.fontSize(12).fillColor('#333333');
                doc.text(`Order ID: ${order.id}`);
                doc.text(`Date: ${new Date().toLocaleDateString()}`);
                doc.moveDown(2);
                if (!order.results || order.results.length === 0) {
                    doc.fontSize(14).fillColor('#666666').text('No results available yet.', { align: 'center' });
                }
                else {
                    const tableTop = doc.y;
                    doc.font('Helvetica-Bold');
                    doc.text('Test Name', 50, tableTop);
                    doc.text('Result', 250, tableTop);
                    doc.text('Reference', 350, tableTop);
                    doc.text('Status', 450, tableTop);
                    doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();
                    let y = tableTop + 25;
                    doc.font('Helvetica');
                    order.results.forEach((res) => {
                        const isAbnormal = res.isAbnormal === true;
                        doc.fillColor('#333333').text(res.name || 'Unknown', 50, y);
                        doc.fillColor(isAbnormal ? '#D32F2F' : '#333333').text(String(res.result || '-'), 250, y);
                        doc.fillColor('#666666').text(res.reference || '-', 350, y);
                        doc.fillColor(isAbnormal ? '#D32F2F' : '#4CAF50').text(isAbnormal ? 'Abnormal' : 'Normal', 450, y);
                        y += 20;
                        doc.moveTo(50, y - 5).lineTo(500, y - 5).strokeColor('#EEEEEE').stroke();
                    });
                }
                doc.fontSize(10).fillColor('#999999').text('Generated securely by Nabdah Systems.', 50, 750, { align: 'center' });
                doc.end();
            }
            catch (error) {
                reject(error);
            }
        });
    }
    async assignDelivery(orderId, driver_id, by) {
        const o = await this.orderModel.findOne({ id: orderId });
        if (!o)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(o);
        let del = await this.delModel.findOne({ order_id: orderId });
        if (!del)
            del = await this.delModel.create({ order_id: orderId, pharmacy_id: o.pharmacy_id });
        del.driver_id = driver_id;
        del.state = enums_1.DeliveryState.ASSIGNED;
        await del.save();
        o.delivery_id = del.id;
        await o.save();
        this.events.emit(events_1.EVENTS.DELIVERY_ASSIGNED, { order_id: orderId, driver_id });
        return this.transition(orderId, enums_1.OrderState.ASSIGNED_TO_DELIVERY, by);
    }
    async updateDelivery(orderId, state, location) {
        const order = await this.orderModel.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(order);
        const del = await this.delModel.findOneAndUpdate({ order_id: orderId }, { $set: { state, ...(location ? { current_location: location } : {}) } }, { new: true });
        this.events.emit(events_1.EVENTS.DELIVERY_UPDATED, { order_id: orderId, state });
        return del;
    }
    async reorder(orderId, patient) {
        const o = await this.orderModel.findOne({ id: orderId, patient_id: patient.id });
        if (!o)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(o);
        return this.create(patient, {
            items: o.items.map((it) => ({ medicine_id: it.medicine_id, qty: it.qty })),
            delivery_address: o.delivery_address,
            delivery_mode: o.delivery_mode,
            payment_method: o.payment_method,
        });
    }
    async reorderPartial(orderId, patient, body) {
        const o = await this.orderModel.findOne({ id: orderId, patient_id: patient.id });
        if (!o)
            throw new common_1.NotFoundException();
        await this.assertNotCanonicalPharmacyOrder(o);
        if (!Array.isArray(body.items) || body.items.length === 0)
            throw new common_1.BadRequestException('items_required');
        return this.create(patient, {
            items: body.items.map((it) => ({
                medicine_id: it.medicine_id,
                qty: Math.max(1, parseInt(it.qty, 10) || 1),
                name_ar: it.name_ar,
                name_en: it.name_en,
                price: it.price,
            })),
            delivery_address: body.delivery_address || o.delivery_address,
            delivery_mode: o.delivery_mode,
            payment_method: o.payment_method,
            notes: body.notes,
        });
    }
    async patientApproveBasket(patient, id) {
        const o = await this.orderModel.findOne({ id, patient_id: patient.id });
        if (!o)
            throw new common_1.NotFoundException('order_not_found');
        await this.assertNotCanonicalPharmacyOrder(o);
        if (o.basket_review_status !== 'submitted_for_patient_approval')
            throw new common_1.ForbiddenException('not_submitted');
        o.basket_review_status = 'patient_approved';
        o.basket_decided_at = new Date();
        await o.save();
        this.events.emit('order.basket.approved', { order_id: id, by: patient.id });
        return o.toObject();
    }
    async patientRejectBasket(patient, id, reason) {
        const o = await this.orderModel.findOne({ id, patient_id: patient.id });
        if (!o)
            throw new common_1.NotFoundException('order_not_found');
        await this.assertNotCanonicalPharmacyOrder(o);
        if (o.basket_review_status !== 'submitted_for_patient_approval')
            throw new common_1.ForbiddenException('not_submitted');
        o.basket_review_status = 'patient_rejected';
        o.basket_decided_at = new Date();
        o.state = enums_1.OrderState.CANCELLED;
        o.cancel_reason = reason || 'patient_rejected_basket';
        o.cancelled_at = new Date();
        await o.save();
        this.events.emit('order.basket.rejected', { order_id: id, by: patient.id, reason });
        return o.toObject();
    }
    async placeBid(_user, _body) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async acceptBid(_user, _bidId) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async listBids(_user, _prescriptionRequestId) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async listPharmacyBids(_user) {
        throw new common_1.ServiceUnavailableException('canonical_pharmacy_flow_required');
    }
    async getTracking(id, user) {
        const order = await this.orderModel.findOne({ id }).lean();
        if (!order)
            throw new common_1.NotFoundException();
        const isOwner = order.patient_id === user?.id || order.pharmacy_id === user?.id;
        if (!isOwner && !['admin', 'super_admin'].includes(user?.role)) {
            throw new common_1.ForbiddenException();
        }
        let delivery = null;
        if (order.delivery_id) {
            const del = await this.delModel.findOne({ id: order.delivery_id }).lean();
            if (del) {
                delivery = {
                    state: del.state,
                    eta_minutes: del.eta_minutes,
                    driver_id: del.driver_id,
                    location: del.current_location,
                };
            }
        }
        const pharmacy = order.pharmacy_id
            ? await this.conn.collection('provider_profiles').findOne({ id: order.pharmacy_id }, { projection: { name_ar: 1, name_en: 1 } })
            : null;
        return {
            order_id: order.id,
            state: order.state,
            updated_at: order.updatedAt,
            delivery_mode: order.delivery_mode || 'DELIVERY',
            total: order.total,
            pharmacy_name: pharmacy?.name_ar || pharmacy?.name_en || null,
            delivery,
        };
    }
    async updateInsuranceApproval(id, payload, user) {
        const order = await this.orderModel.findOne({ id });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        await this.assertNotCanonicalPharmacyOrder(order);
        const { status, totalCopay, items } = payload;
        if (status) {
            order.insurance_status = status;
            if (['PENDING_INSURANCE', 'APPROVED', 'PARTIAL_APPROVAL', 'REJECTED'].includes(status)) {
                await this.transition(id, status, user);
            }
        }
        if (totalCopay !== undefined) {
            order.insurance_copay = totalCopay;
        }
        if (items && Array.isArray(items)) {
            for (const itemPayload of items) {
                const item = order.items.find((i) => i.medicine_id === itemPayload.medicine_id);
                if (item) {
                    if (itemPayload.isCovered !== undefined)
                        item.isCovered = itemPayload.isCovered;
                    if (itemPayload.rejectReason !== undefined)
                        item.rejectReason = itemPayload.rejectReason;
                    if (itemPayload.cashPrice !== undefined)
                        item.cashPrice = itemPayload.cashPrice;
                }
            }
            order.markModified('items');
        }
        await order.save();
        return order.toObject();
    }
    async optInCash(id, itemId, payload, user) {
        const order = await this.orderModel.findOne({ id, patient_id: user.id });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        await this.assertNotCanonicalPharmacyOrder(order);
        const item = order.items.find((i) => i.medicine_id === itemId);
        if (!item)
            throw new common_1.NotFoundException('Item not found');
        item.optInCash = payload.optInCash ?? true;
        order.markModified('items');
        await order.save();
        return order.toObject();
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('OrderRepository')),
    __param(1, (0, common_1.Inject)('MedicineRepository')),
    __param(2, (0, common_1.Inject)('DeliveryRepository')),
    __param(3, (0, common_1.Inject)('PharmacyBidRepository')),
    __param(7, (0, mongoose_1.InjectConnection)()),
    __param(12, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [order_repository_1.OrderRepository,
        medicine_repository_1.MedicineRepository,
        delivery_repository_1.DeliveryRepository,
        pharmacybid_repository_1.PharmacyBidRepository,
        event_emitter_1.EventEmitter2,
        dispatch_service_1.DispatchService,
        workflow_engine_module_1.WorkflowEngineService,
        mongoose_2.Connection,
        finance_engine_module_1.CouponService,
        finance_engine_module_1.LoyaltyRedeemService,
        finance_engine_module_1.RefundExecutor,
        finance_engine_module_1.CancellationPolicy,
        product_ranking_event_service_1.ProductRankingEventService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map