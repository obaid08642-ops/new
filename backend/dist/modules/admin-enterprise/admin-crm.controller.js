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
exports.AdminGdprController = exports.AdminCrmController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const audit_service_1 = require("./audit.service");
const orders_console_service_1 = require("./orders-console.service");
const rbac_1 = require("../../common/rbac");
let AdminCrmController = class AdminCrmController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    async searchPatients(q, page = '1', limit = '25') {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
        const filter = { role: 'patient' };
        if (q?.trim()) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ full_name: rx }, { phone: rx }, { email: rx }, { id: rx }];
        }
        const users = this.conn.collection('users');
        const [items, total] = await Promise.all([
            users.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
                .project({ _id: 0, id: 1, full_name: 1, phone: 1, email: 1, verified: 1, is_guest: 1, createdAt: 1 })
                .toArray(),
            users.countDocuments(filter),
        ]);
        const ids = items.map((u) => u.id);
        const counts = new Map();
        await Promise.all(orders_console_service_1.ORDER_KINDS.map(async (k) => {
            const rows = await this.conn.collection(k.collection).aggregate([
                { $match: { patient_id: { $in: ids } } },
                { $group: { _id: `$${k.patientField}`, n: { $sum: 1 } } },
            ]).toArray().catch(() => []);
            for (const r of rows)
                counts.set(String(r._id), (counts.get(String(r._id)) || 0) + r.n);
        }));
        return {
            data: items.map((u) => ({ ...u, bookings_total: counts.get(u.id) || 0 })),
            total, page: p, pages: Math.ceil(total / l),
        };
    }
    async patient360(id) {
        const user = await this.conn.collection('users').findOne({ id }, { projection: { _id: 0, password_hash: 0, otp_codes: 0 } });
        if (!user)
            throw new common_1.NotFoundException('user_not_found');
        const [bookingsByKind, walletAgg, walletTx, tickets, devices] = await Promise.all([
            Promise.all(orders_console_service_1.ORDER_KINDS.map(async (k) => ({
                kind: k.kind, label_ar: k.label_ar,
                rows: await this.conn.collection(k.collection)
                    .find({ patient_id: id })
                    .sort({ createdAt: -1 }).limit(15)
                    .project({ _id: 0, id: 1, state: `$${k.stateField}`, total: { $ifNull: ['$total_price', '$total'] }, payment_status: 1, createdAt: 1 })
                    .toArray()
                    .catch(() => []),
                count: await this.conn.collection(k.collection).countDocuments({ patient_id: id }).catch(() => 0),
            }))),
            this.conn.collection('wallets').findOne({ ownerId: id, ownerType: 'patient' }).catch(() => null),
            this.conn.collection('wallet_transactions').find({
                walletId: (await this.conn.collection('wallets').findOne({ ownerId: id, ownerType: 'patient' }))?.id || '__none__',
            }).sort({ createdAt: -1 }).limit(20).project({ _id: 0 }).toArray().catch(() => []),
            this.conn.collection('support_requests').find({ user_id: id }).sort({ createdAt: -1 }).limit(15)
                .project({ _id: 0, id: 1, tracking_id: 1, category: 1, subject: 1, status: 1, priority: 1, createdAt: 1 })
                .toArray().catch(() => []),
            this.conn.collection('sessions').find({ user_id: id }).sort({ last_seen_at: -1 }).limit(10)
                .project({ _id: 0, device_name: 1, platform: 1, ip: 1, last_seen_at: 1, revoked: 1 })
                .toArray().catch(() => []),
        ]);
        const lifetimeSpend = await this.conn.collection('moyasar_payments').aggregate([
            { $match: { patient_id: id, status: { $in: ['paid', 'confirmed', 'succeeded'] } } },
            { $group: { _id: null, total: { $sum: '$amount' }, orders: { $sum: 1 } } },
        ]).toArray().catch(() => []);
        return {
            profile: user,
            bookings_by_kind: bookingsByKind,
            wallet: { balance: walletAgg?.balance ?? 0, recent_transactions: walletTx },
            support_tickets: tickets,
            devices,
            financial_summary: {
                lifetime_paid: Math.round((lifetimeSpend[0]?.total || 0) * 100) / 100,
                paid_orders: lifetimeSpend[0]?.orders || 0,
            },
        };
    }
    impersonateLegacyDisabled() {
        throw new common_1.GoneException('legacy_crm_impersonation_disabled_use_admin_impersonation_session');
    }
};
exports.AdminCrmController = AdminCrmController;
__decorate([
    (0, common_1.Get)('patients'),
    __param(0, (0, common_1.Query)('q')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCrmController.prototype, "searchPatients", null);
__decorate([
    (0, common_1.Get)('patients/:id/360'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CRM_READ),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminCrmController.prototype, "patient360", null);
__decorate([
    (0, common_1.Post)('patients/:id/legacy-impersonate-disabled'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_IMPERSONATE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminCrmController.prototype, "impersonateLegacyDisabled", null);
exports.AdminCrmController = AdminCrmController = __decorate([
    (0, common_1.Controller)('admin/crm'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminCrmController);
let AdminGdprController = class AdminGdprController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    async list(status, page = '1', limit = '25') {
        const q = status ? { status } : {};
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, parseInt(limit, 10) || 25);
        const col = this.conn.collection('gdpr_requests');
        const [items, total, byStatus] = await Promise.all([
            col.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).project({ _id: 0 }).toArray(),
            col.countDocuments(q),
            col.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray().catch(() => []),
        ]);
        return { data: items, total, page: p, pages: Math.ceil(total / l), by_status: Object.fromEntries(byStatus.map((s) => [s._id, s.n])) };
    }
    async createRequest(b, me) {
        const userId = String(b?.user_id || '').trim();
        const type = String(b?.type || '');
        if (!userId)
            throw new common_1.BadRequestException('user_id_required');
        if (!['export', 'delete'].includes(type))
            throw new common_1.BadRequestException('invalid_type');
        const exists = await this.conn.collection('gdpr_requests').findOne({ user_id: userId, type, status: { $in: ['requested', 'processing'] } });
        if (exists)
            throw new common_1.ConflictException('request_already_open');
        const doc = {
            id: `gdpr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            user_id: userId, type,
            status: 'requested',
            requested_by: me.id,
            result_ref: null,
            createdAt: new Date(), updatedAt: new Date(),
        };
        await this.conn.collection('gdpr_requests').insertOne(doc);
        await this.audit.write({
            action: `gdpr_request_create_${type}`, actor: me, target_type: 'gdpr_request', target_id: doc.id,
            after: { user_id: userId, type },
        });
        const { _id, ...clean } = doc;
        return clean;
    }
    async start(id, me) {
        return this.transition(id, 'requested', 'processing', me);
    }
    async completeExport(id, me) {
        const req = await this.conn.collection('gdpr_requests').findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request_not_found');
        if (req.type !== 'export')
            throw new common_1.BadRequestException('not_an_export_request');
        await this.transition(id, 'processing', 'completed', me);
        const uid = req.user_id;
        const pkg = { generated_at: new Date().toISOString(), user_id: uid, collections: {} };
        pkg.collections.user = await this.conn.collection('users').findOne({ id: uid }, { projection: { _id: 0, password_hash: 0, otp_codes: 0 } });
        for (const k of orders_console_service_1.ORDER_KINDS) {
            pkg.collections[k.kind] = await this.conn.collection(k.collection)
                .find({ patient_id: uid }).sort({ createdAt: -1 }).limit(500)
                .project({ _id: 0 }).toArray();
        }
        pkg.collections.wallet_transactions = await this.conn.collection('wallet_transactions').find({ referenceId: uid }).limit(500).project({ _id: 0 }).toArray().catch(() => []);
        pkg.collections.support_requests = await this.conn.collection('support_requests').find({ user_id: uid }).limit(200).project({ _id: 0 }).toArray();
        await this.conn.collection('gdpr_exports').updateOne({ request_id: id }, { $set: { payload: pkg, created_at: new Date() }, $setOnInsert: { id: `gex_${id}` } }, { upsert: true });
        await this.conn.collection('gdpr_requests').updateOne({ id }, { $set: { result_ref: `gdpr_export:${id}` } });
        await this.audit.write({
            action: 'gdpr_export_completed', actor: me, target_type: 'gdpr_request', target_id: id,
            after: { user_id: uid, collections: Object.keys(pkg.collections) },
        });
        return { ok: true, id, export_ref: `gdpr_export:${id}`, collections: Object.keys(pkg.collections) };
    }
    async completeDelete(id, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(`GDPR erasure completion ${id}`);
        }
        catch {
            reason = 'gdpr';
        }
        const req = await this.conn.collection('gdpr_requests').findOne({ id });
        if (!req)
            throw new common_1.NotFoundException('request_not_found');
        if (req.type !== 'delete')
            throw new common_1.BadRequestException('not_a_delete_request');
        await this.transition(id, 'processing', 'completed', me);
        const uid = req.user_id;
        const anonMarker = `deleted-gdpr-${id}`;
        await this.conn.collection('users').updateOne({ id: uid }, { $set: {
                full_name: anonMarker, phone: `anon+${id}@erased.invalid`, email: `anon+${id}@erased.invalid`,
                password_hash: '', otp_codes: [], anonymized_at: new Date(), anonymized_via: id,
            } });
        await Promise.all(orders_console_service_1.ORDER_KINDS.map((k) => this.conn.collection(k.collection).updateMany({ patient_id: uid }, [{ $set: { patient_name: anonMarker, patient_phone: `erased:${id}` } }]).catch(() => null)));
        await this.audit.write({
            action: 'gdpr_delete_completed', actor: me, target_type: 'gdpr_request', target_id: id,
            reason, after: { user_id: uid, anonymized_fields: ['full_name', 'phone', 'email'] },
        });
        return { ok: true, id, anonymized_user_id: uid };
    }
    async transition(id, from, to, me) {
        const res = await this.conn.collection('gdpr_requests').findOneAndUpdate({ id, status: from }, { $set: { status: to, updatedAt: new Date(), ...(to === 'processing' ? { processing_by: me.id } : { completed_at: new Date() }) } }, { returnDocument: 'after' }).catch(() => null);
        if (!res)
            throw new common_1.BadRequestException(`expected_state_${from}_with_open_transition`);
        void me;
        return res;
    }
};
exports.AdminGdprController = AdminGdprController;
AdminGdprController.LIFECYCLE = ['requested', 'processing', 'completed'];
__decorate([
    (0, common_1.Get)('requests'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.GDPR_MANAGE),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminGdprController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('requests'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.GDPR_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminGdprController.prototype, "createRequest", null);
__decorate([
    (0, common_1.Post)(':id/start'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.GDPR_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminGdprController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/export/complete'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.GDPR_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminGdprController.prototype, "completeExport", null);
__decorate([
    (0, common_1.Post)(':id/delete/complete'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.GDPR_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminGdprController.prototype, "completeDelete", null);
exports.AdminGdprController = AdminGdprController = __decorate([
    (0, common_1.Controller)('admin/gdpr'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminGdprController);
//# sourceMappingURL=admin-crm.controller.js.map