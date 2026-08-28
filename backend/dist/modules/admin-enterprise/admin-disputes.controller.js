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
var AdminDisputesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminDisputesController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
const wallet_service_1 = require("../wallet/wallet.service");
let AdminDisputesController = AdminDisputesController_1 = class AdminDisputesController {
    constructor(conn, audit, wallet) {
        this.conn = conn;
        this.audit = audit;
        this.wallet = wallet;
        this.maxRefund = Number(process.env.DISPUTE_MAX_REFUND_SAR || 2000);
    }
    async list(status = 'open', category, q, page = '1', limit = '25') {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const base = {
            category: category
                ? String(category).toUpperCase()
                : { $in: AdminDisputesController_1.DISPUTE_CATEGORIES },
        };
        if (status === 'open')
            base.status = { $in: ['OPEN', 'IN_PROGRESS'] };
        else if (status && status !== 'all')
            base.status = String(status).toUpperCase();
        if (q?.trim()) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            base.$or = [{ subject: rx }, { message: rx }, { user_name: rx }, { user_phone: rx }, { tracking_id: rx }];
        }
        const col = this.conn.collection('support_requests');
        const [items, total, byStatus] = await Promise.all([
            col.find(base).sort({ priority: -1, createdAt: -1 }).skip((p - 1) * l).limit(l)
                .project({ _id: 0, thread: 0 })
                .toArray(),
            col.countDocuments(base),
            col.aggregate([
                { $match: { category: base.category === undefined ? base.category : base.category } },
                { $group: { _id: '$status', count: { $sum: 1 } } },
            ]).toArray().catch(() => []),
        ]);
        const ids = items.map((t) => t.id);
        const refunds = ids.length ? await this.conn.collection('wallet_transactions')
            .find({ referenceType: 'refund', referenceId: { $in: ids }, type: 'credit' })
            .project({ referenceId: 1, amount: 1 })
            .toArray().catch(() => []) : [];
        const refundMap = new Map();
        for (const r of refunds)
            refundMap.set(r.referenceId, (refundMap.get(r.referenceId) || 0) + Number(r.amount || 0));
        return {
            data: items.map((t) => ({
                id: t.id,
                tracking_id: t.tracking_id || null,
                patient: { id: t.user_id, name: t.user_name || null, phone: t.user_phone || null },
                category: t.category,
                subject: t.subject,
                message: t.message,
                status: t.status,
                priority: t.priority,
                source_role: t.source_role,
                refunded_so_far: refundMap.get(t.id) || 0,
                created_at: t.createdAt,
                resolved_at: t.resolved_at || null,
            })),
            stats: Object.fromEntries(byStatus.map((s) => [String(s._id || 'unknown'), s.count])),
            total, page: p, pages: Math.ceil(total / l),
        };
    }
    async detail(id) {
        const t = await this.conn.collection('support_requests').findOne({ id }, { projection: { _id: 0 } });
        if (!t)
            throw new common_1.NotFoundException('dispute_not_found');
        const refunds = await this.conn.collection('wallet_transactions')
            .find({ referenceType: 'refund', referenceId: id, type: 'credit' }).project({ _id: 0, amount: 1, description: 1, createdAt: 1 }).toArray();
        return { ...t, refunds };
    }
    async resolve(id, b, me) {
        const decision = String(b?.decision || '');
        if (!['refund_full', 'refund_partial', 'reject', 'close_no_action'].includes(decision)) {
            throw new common_1.BadRequestException('invalid_decision');
        }
        const isMoney = decision.startsWith('refund');
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason, isMoney ? rbac_1.MIN_FINANCIAL_REASON_LENGTH : 5);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        if (isMoney && !(0, rbac_1.roleSatisfies)('admin', [...(0, auth_guard_1.getEffectiveRoles)(me), ...(me.permissions || [])])) {
            throw new common_1.ForbiddenException('insufficient_permissions');
        }
        const ticket = await this.conn.collection('support_requests').findOne({ id });
        if (!ticket)
            throw new common_1.NotFoundException('dispute_not_found');
        if (['RESOLVED', 'CLOSED'].includes(String(ticket.status))) {
            throw new common_1.ConflictException('dispute_already_resolved');
        }
        if (!AdminDisputesController_1.DISPUTE_CATEGORIES.includes(String(ticket.category))) {
            throw new common_1.BadRequestException('not_a_dispute_category');
        }
        let creditedAmount = 0;
        if (decision === 'refund_partial') {
            const amt = Math.round(Number(b?.amount) * 100) / 100;
            if (!Number.isFinite(amt) || amt <= 0)
                throw new common_1.BadRequestException('amount_required_positive');
            if (amt > this.maxRefund)
                throw new common_1.BadRequestException(`amount_exceeds_cap_${this.maxRefund}`);
            creditedAmount = amt;
        }
        else if (decision === 'refund_full') {
            const amt = Math.round(Number(b?.amount) * 100) / 100;
            creditedAmount = Number.isFinite(amt) && amt > 0 ? Math.min(amt, this.maxRefund) : this.maxRefund;
        }
        if (creditedAmount > 0) {
            await this.wallet.topup(ticket.user_id, 'patient', creditedAmount, `refund: ${reason}`.slice(0, 180), 'refund', ticket.id);
        }
        const resolutionEntry = {
            by: me.id,
            role: 'admin',
            message: `[resolution:${decision}] ${reason}${creditedAmount ? ` — مبلغ ${creditedAmount} ر.س إلى المحفظة` : ''}`,
            at: new Date(),
        };
        await this.conn.collection('support_requests').updateOne({ id }, { $set: { status: 'RESOLVED', resolved_at: new Date(), resolved_by: me.id, resolution_decision: decision }, $push: { thread: resolutionEntry } });
        await this.audit.write({
            action: `dispute_${decision}`,
            actor: me,
            target_type: 'support_request',
            target_id: id,
            reason,
            before: { status: ticket.status },
            after: { status: 'RESOLVED', decision, credited_amount: creditedAmount || null },
            meta: { patient_id: ticket.user_id, category: ticket.category },
        });
        return {
            ok: true,
            id,
            decision,
            credited_amount: creditedAmount || null,
            status: 'RESOLVED',
        };
    }
};
exports.AdminDisputesController = AdminDisputesController;
AdminDisputesController.DISPUTE_CATEGORIES = ['COMPLAINT', 'PAYMENT', 'ORDER_ISSUE'];
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('category')),
    __param(2, (0, common_1.Query)('q')),
    __param(3, (0, common_1.Query)('page')),
    __param(4, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDisputesController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDisputesController.prototype, "detail", null);
__decorate([
    (0, common_1.Post)(':id/resolve'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.DISPUTES_RESOLVE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDisputesController.prototype, "resolve", null);
exports.AdminDisputesController = AdminDisputesController = AdminDisputesController_1 = __decorate([
    (0, common_1.Controller)('admin/disputes'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(2, (0, common_1.Inject)(wallet_service_1.WalletService)),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService,
        wallet_service_1.WalletService])
], AdminDisputesController);
//# sourceMappingURL=admin-disputes.controller.js.map