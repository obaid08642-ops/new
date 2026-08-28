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
exports.ReturnsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const wallet_service_1 = require("../wallet/wallet.service");
const returnrequest_repository_1 = require("./repositories/returnrequest.repository");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const NON_RETURNABLE_CATEGORIES = ['cold_chain', 'refrigerated', 'controlled', 'prescription_only_nonreturnable'];
let ReturnsService = class ReturnsService {
    constructor(returnModel, walletService, refundExec, conn) {
        this.returnModel = returnModel;
        this.walletService = walletService;
        this.refundExec = refundExec;
        this.conn = conn;
    }
    async policy() {
        const cfg = await this.conn.collection('finance_config').findOne({ key: 'return_policy' });
        return {
            window_days: Number(cfg?.window_days ?? 7),
            non_returnable_categories: Array.isArray(cfg?.non_returnable_categories) ? cfg.non_returnable_categories : NON_RETURNABLE_CATEGORIES,
        };
    }
    async eligibility(userId, orderId) {
        const order = await this.conn.collection('orders').findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order.patient_id !== userId)
            throw new common_1.ForbiddenException('not_your_order');
        const pol = await this.policy();
        const delivered = ['DELIVERED', 'COMPLETED', 'PARTIALLY_FULFILLED'].includes(String(order.state || '').toUpperCase());
        const deliveredAt = order.delivered_at || order.updatedAt || order.createdAt;
        const ageDays = (Date.now() - new Date(deliveredAt).getTime()) / (24 * 3600 * 1000);
        const withinWindow = delivered && ageDays <= pol.window_days;
        const items = (order.items || []).map((it) => ({
            medicine_id: it.medicine_id,
            name_ar: it.name_ar, name_en: it.name_en,
            qty: it.qty, price: it.price,
            returnable: !pol.non_returnable_categories.includes(it.category) && it.non_returnable !== true,
            reason: pol.non_returnable_categories.includes(it.category) ? 'category_non_returnable' : (it.non_returnable === true ? 'flagged_non_returnable' : null),
        }));
        return {
            order_id: orderId,
            delivered,
            within_window: withinWindow,
            window_days: pol.window_days,
            eligible: withinWindow && items.some((i) => i.returnable),
            items,
        };
    }
    async createRequest(userId, data) {
        if (!data.serviceType)
            throw new common_1.BadRequestException('serviceType is required');
        if (!data.reason)
            throw new common_1.BadRequestException('reason is required');
        if (!data.orderId)
            throw new common_1.BadRequestException('orderId is required');
        let amount = 0;
        let reviewedItems = [];
        if (String(data.serviceType).toLowerCase().includes('pharm')) {
            const el = await this.eligibility(userId, data.orderId);
            if (!el.eligible) {
                throw new common_1.BadRequestException(el.within_window ? 'no_returnable_items' : `return_window_expired (${el.window_days} days)`);
            }
            if (data.is_opened === true || data.is_used === true) {
                throw new common_1.BadRequestException('opened_or_used_products_are_not_returnable');
            }
            const requestedIds = Array.isArray(data.items) && data.items.length
                ? data.items.map((i) => i.medicine_id || i).filter(Boolean)
                : el.items.filter((i) => i.returnable).map((i) => i.medicine_id);
            reviewedItems = el.items.filter((i) => requestedIds.includes(i.medicine_id));
            if (!reviewedItems.length)
                throw new common_1.BadRequestException('no_valid_items_selected');
            const nonReturnable = reviewedItems.filter((i) => !i.returnable);
            if (nonReturnable.length)
                throw new common_1.BadRequestException(`non_returnable_items: ${nonReturnable.map((i) => i.medicine_id).join(', ')}`);
            amount = Math.round(reviewedItems.reduce((s, i) => s + (i.price || 0) * (i.qty || 1), 0) * 100) / 100;
            if (!(amount > 0))
                throw new common_1.BadRequestException('computed_return_amount_is_zero');
        }
        else {
            const order = await this.conn.collection('orders').findOne({ id: data.orderId });
            amount = Number(order?.total ?? order?.totals?.total ?? 0);
            if (!(amount > 0))
                throw new common_1.BadRequestException('could_not_resolve_amount_from_booking');
        }
        const returnRequest = await this.returnModel.create({
            patient_id: userId,
            order_id: data.orderId,
            service_type: data.serviceType,
            reason: data.reason,
            details: data.details,
            items: reviewedItems,
            is_opened: data.is_opened === true,
            is_used: data.is_used === true,
            refund_method: data.refundMethod || 'original',
            amount,
            attached_docs: data.attachedDocs || [],
            status: 'processing',
        });
        return returnRequest.toObject();
    }
    async myReturns(userId) {
        return this.returnModel.find({ patient_id: userId }).sort({ createdAt: -1 }).lean();
    }
    async providerReturns(providerId) {
        const orders = await this.returnModel.db.collection('orders')
            .find({ pharmacy_id: providerId }, { projection: { id: 1 } }).toArray();
        const ids = orders.map((o) => o.id);
        if (!ids.length)
            return [];
        return this.returnModel.find({ order_id: { $in: ids } }).sort({ createdAt: -1 }).lean();
    }
    async getById(id, userId, userRole) {
        const request = await this.returnModel.findOne({ id }).lean();
        if (!request)
            throw new common_1.NotFoundException('Return request not found');
        if (request.patient_id !== userId && userRole !== 'admin') {
            throw new common_1.ForbiddenException('Access denied');
        }
        return request;
    }
    async adminList(status) {
        const filter = status ? { status } : {};
        return this.returnModel.find(filter).sort({ createdAt: -1 }).lean();
    }
    async adminDecide(id, decision, note, adminUser) {
        const request = await this.returnModel.findOne({ id });
        if (!request)
            throw new common_1.NotFoundException('Return request not found');
        if (request.status !== 'processing')
            throw new common_1.BadRequestException('Request already processed');
        request.admin_note = note;
        request.resolved_by = adminUser.id;
        request.resolved_at = new Date();
        if (decision === 'rejected') {
            request.status = 'rejected';
            await request.save();
            return request.toObject();
        }
        request.status = 'approved';
        const exec = await this.refundExec.execute({
            refund_id: `return_${request.id}`,
            booking_kind: 'pharmacy',
            booking_id: request.order_id,
            patient_id: request.patient_id,
            amount: Number(request.amount),
            reason: `return approved: ${request.reason}`,
            actor_id: adminUser.id,
        });
        request.execution = exec;
        request.status = 'completed';
        await request.save();
        return request.toObject();
    }
};
exports.ReturnsService = ReturnsService;
exports.ReturnsService = ReturnsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ReturnRequestRepository')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [returnrequest_repository_1.ReturnRequestRepository,
        wallet_service_1.WalletService,
        finance_engine_module_1.RefundExecutor,
        mongoose_2.Connection])
], ReturnsService);
//# sourceMappingURL=returns.service.js.map