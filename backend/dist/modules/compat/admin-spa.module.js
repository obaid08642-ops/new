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
exports.AdminSpaModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const platform_express_1 = require("@nestjs/platform-express");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const now = () => new Date();
const uid = (u) => u?.id || u?._id || u?.user_id;
const byId = (id) => {
    const or = [{ id }, { _id: id }];
    if (/^[0-9a-fA-F]{24}$/.test(String(id))) {
        try {
            or.push({ _id: new (require('mongoose').Types.ObjectId)(id) });
        }
        catch { }
    }
    return { $or: or };
};
const rx = (s) => new RegExp(String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
class AdminController {
}
__decorate([
    (0, mongoose_1.InjectConnection)(),
    __metadata("design:type", mongoose_2.Connection)
], AdminController.prototype, "conn", void 0);
let AdminDashboardController = class AdminDashboardController extends AdminController {
    async kpis() {
        const day = new Date(Date.now() - 24 * 3600 * 1000);
        const [patients, providers, pendingProviders, apptsToday, ordersToday, activeSos, pendingClaims] = await Promise.all([
            this.conn.collection('users').countDocuments({ role: 'patient' }),
            this.conn.collection('provider_profiles').countDocuments({}),
            this.conn.collection('provider_profiles').countDocuments({ verification_status: { $nin: ['verified'] } }),
            this.conn.collection('appointments').countDocuments({ createdAt: { $gte: day } }),
            this.conn.collection('orders').countDocuments({ createdAt: { $gte: day } }),
            this.conn.collection('emergencyrequests').countDocuments({ state: { $nin: ['RESOLVED', 'CLOSED'] } }),
            this.conn.collection('insuranceservicerequests').countDocuments({ state: 'PENDING_PROVIDER_REVIEW' }),
        ]);
        return {
            patients, providers, pending_provider_approvals: pendingProviders,
            appointments_24h: apptsToday, orders_24h: ordersToday,
            active_emergencies: activeSos, pending_insurance_claims: pendingClaims,
            generated_at: now(),
        };
    }
    async alerts() {
        const [sos, shortages, pendingProviders, openComplaints] = await Promise.all([
            this.conn.collection('emergencyrequests').find({ state: { $nin: ['RESOLVED', 'CLOSED'] } }).sort({ createdAt: -1 }).limit(10).toArray(),
            this.conn.collection('pharmacy_shortage_reports').find({ status: 'open' }).sort({ createdAt: -1 }).limit(10).toArray(),
            this.conn.collection('provider_profiles').find({ verification_status: { $nin: ['verified'] } }).sort({ createdAt: -1 }).limit(10).toArray(),
            this.conn.collection('complaints').find({ status: { $nin: ['resolved', 'closed'] } }).sort({ createdAt: -1 }).limit(10).toArray(),
        ]);
        const alerts = [];
        for (const e of sos)
            alerts.push({ kind: 'emergency', severity: 'critical', id: e.id || String(e._id), title: 'بلاغ طوارئ نشط', created_at: e.createdAt });
        for (const s of shortages)
            alerts.push({ kind: 'shortage', severity: 'warning', id: String(s._id), title: `بلاغ نقص دواء: ${s.product_name || s.medicine_id || ''}`, created_at: s.createdAt });
        for (const p of pendingProviders)
            alerts.push({ kind: 'provider_approval', severity: 'info', id: p.id || String(p._id), title: `مزوّد بانتظار الاعتماد: ${p.name || p.facility_name || ''}`, created_at: p.createdAt });
        for (const c of openComplaints)
            alerts.push({ kind: 'complaint', severity: 'warning', id: c.id || String(c._id), title: c.subject || 'شكوى مفتوحة', created_at: c.createdAt });
        alerts.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
        return alerts.slice(0, 30);
    }
    async liveFeed() {
        const [orders, appts, sos] = await Promise.all([
            this.conn.collection('orders').find({}).sort({ createdAt: -1 }).limit(10).toArray(),
            this.conn.collection('appointments').find({}).sort({ createdAt: -1 }).limit(10).toArray(),
            this.conn.collection('emergencyrequests').find({}).sort({ createdAt: -1 }).limit(5).toArray(),
        ]);
        const feed = [];
        for (const o of orders)
            feed.push({ kind: 'order', id: o.id || String(o._id), label: `طلب صيدلية — ${o.status || o.state || ''}`, at: o.createdAt });
        for (const a of appts)
            feed.push({ kind: 'appointment', id: a.id || String(a._id), label: `موعد — ${a.status || ''}`, at: a.createdAt });
        for (const e of sos)
            feed.push({ kind: 'emergency', id: e.id || String(e._id), label: `طوارئ — ${e.state || ''}`, at: e.createdAt });
        feed.sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
        return feed.slice(0, 25);
    }
};
__decorate([
    (0, common_1.Get)('kpis'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "kpis", null);
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "alerts", null);
__decorate([
    (0, common_1.Get)('live-feed'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDashboardController.prototype, "liveFeed", null);
AdminDashboardController = __decorate([
    (0, common_1.Controller)('dashboard'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminDashboardController);
let AdminBroadcastController = class AdminBroadcastController extends AdminController {
    async live() {
        const rows = await this.conn.collection('admin_broadcasts')
            .find({ status: { $in: ['scheduled', 'sending', 'sent'] } })
            .sort({ createdAt: -1 }).limit(50).toArray();
        return rows.map((b) => ({ ...b, id: b.id || String(b._id) }));
    }
    async config() {
        const doc = await this.conn.collection('admin_config').findOne({ key: 'broadcast' });
        return doc?.value || {};
    }
    async putConfig(user, body) {
        await this.conn.collection('admin_config').updateOne({ key: 'broadcast' }, { $set: { key: 'broadcast', value: body || {}, updated_by: uid(user), updatedAt: now() } }, { upsert: true });
        return { ok: true };
    }
    async expand(id, body) {
        const segments = Array.isArray(body?.segments) ? body.segments.map(String) : [];
        const update = { $set: { updatedAt: now() } };
        if (segments.length)
            update.$addToSet = { target_segments: { $each: segments } };
        const res = await this.conn.collection('admin_broadcasts').updateOne(byId(id), update);
        if (!res.matchedCount)
            throw new common_1.NotFoundException('الحملة غير موجودة');
        return { ok: true, added: segments.length };
    }
    async cancel(id, user) {
        const res = await this.conn.collection('admin_broadcasts').updateOne(byId(id), { $set: { status: 'cancelled', cancelled_by: uid(user), cancelled_at: now() } });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('الحملة غير موجودة');
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)('live'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminBroadcastController.prototype, "live", null);
__decorate([
    (0, common_1.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminBroadcastController.prototype, "config", null);
__decorate([
    (0, common_1.Put)('config'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBroadcastController.prototype, "putConfig", null);
__decorate([
    (0, common_1.Post)(':id/expand'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminBroadcastController.prototype, "expand", null);
__decorate([
    (0, common_1.Post)(':id/cancel'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminBroadcastController.prototype, "cancel", null);
AdminBroadcastController = __decorate([
    (0, common_1.Controller)('broadcast'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminBroadcastController);
let AdminEmergencyController = class AdminEmergencyController extends AdminController {
    async dispatch(id, user, body) {
        if (!body?.ambulance_id)
            throw new common_1.BadRequestException('ambulance_id مطلوب');
        const res = await this.conn.collection('emergencyrequests').updateOne(byId(id), {
            $set: { assigned_ambulance_id: body.ambulance_id, state: 'DISPATCH_INITIATED', updatedAt: now() },
            $push: { state_history: { from: null, to: 'DISPATCH_INITIATED', by: uid(user), note: body.note || `ambulance ${body.ambulance_id}`, at: now() } },
        });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('بلاغ الطوارئ غير موجود');
        await this.conn.collection('sos_dispatches').insertOne({
            emergency_id: id, ambulance_id: body.ambulance_id, note: body.note || null,
            dispatched_by: uid(user), createdAt: now(),
        });
        return { ok: true, state: 'DISPATCH_INITIATED' };
    }
};
__decorate([
    (0, common_1.Post)(':id/dispatch'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminEmergencyController.prototype, "dispatch", null);
AdminEmergencyController = __decorate([
    (0, common_1.Controller)('emergency'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminEmergencyController);
let AdminContractsController = class AdminContractsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('provider_contracts').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminContractsController.prototype, "list", null);
AdminContractsController = __decorate([
    (0, common_1.Controller)('contracts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminContractsController);
let AdminShiftsController = class AdminShiftsController extends AdminController {
    async list(facilityId) {
        const filter = facilityId ? { facility_id: facilityId } : {};
        const rows = await this.conn.collection('shifts').find(filter).sort({ date: 1 }).limit(500).toArray();
        return rows.map((s) => ({ ...s, id: s.id || String(s._id) }));
    }
    async create(user, body) {
        if (!body?.facility_id || !body?.staff_id || !body?.date)
            throw new common_1.BadRequestException('المنشأة والموظف والتاريخ مطلوبة');
        const doc = {
            id: (0, uuid_1.v4)(), facility_id: String(body.facility_id), staff_id: String(body.staff_id),
            staff_name: body.staff_name || null, role: body.role || null,
            date: new Date(body.date), start: body.start || null, end: body.end || null,
            status: 'scheduled', created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('shifts').insertOne(doc);
        return doc;
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('facility_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminShiftsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminShiftsController.prototype, "create", null);
AdminShiftsController = __decorate([
    (0, common_1.Controller)('shifts'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminShiftsController);
let AdminScorecardController = class AdminScorecardController extends AdminController {
    async list() {
        const profiles = await this.conn.collection('provider_profiles').find({})
            .project({ id: 1, name: 1, facility_name: 1, type: 1, specialty: 1, city: 1, rating_avg: 1, rating_count: 1, verification_status: 1 })
            .limit(300).toArray();
        const ids = profiles.flatMap((p) => [p.id, p.user_id, p.account_id].filter(Boolean).map(String));
        const completed = await this.conn.collection('appointments').aggregate([
            { $match: { provider_id: { $in: ids }, status: { $in: ['COMPLETED', 'completed'] } } },
            { $group: { _id: '$provider_id', count: { $sum: 1 } } },
        ]).toArray();
        const byProvider = new Map(completed.map((c) => [String(c._id), c.count]));
        return profiles.map((p) => ({
            id: p.id || String(p._id), name: p.name || p.facility_name, type: p.type, specialty: p.specialty, city: p.city,
            rating_avg: p.rating_avg ?? 0, rating_count: p.rating_count ?? 0,
            completed_appointments: byProvider.get(String(p.id)) || 0,
            verification_status: p.verification_status || 'pending',
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminScorecardController.prototype, "list", null);
AdminScorecardController = __decorate([
    (0, common_1.Controller)('scorecard'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminScorecardController);
let AdminComplianceController = class AdminComplianceController extends AdminController {
    async list() {
        const profiles = await this.conn.collection('provider_profiles')
            .find({ verification_status: { $nin: ['verified'] } }).limit(300).toArray();
        const accountIds = profiles.flatMap((p) => [p.account_id, p.user_id, p.id].filter(Boolean).map(String));
        const docs = await this.conn.collection('providerdocuments')
            .find({ $or: [{ account_id: { $in: accountIds } }, { provider_id: { $in: accountIds } }, { user_id: { $in: accountIds } }] })
            .project({ account_id: 1, provider_id: 1, user_id: 1, kind: 1, status: 1 }).toArray();
        const docCount = new Map();
        for (const d of docs) {
            for (const k of [d.account_id, d.provider_id, d.user_id].filter(Boolean).map(String)) {
                docCount.set(k, (docCount.get(k) || 0) + 1);
            }
        }
        return profiles.map((p) => {
            const keys = [p.account_id, p.user_id, p.id].filter(Boolean).map(String);
            const submitted = Math.max(0, ...keys.map((k) => docCount.get(k) || 0));
            return {
                provider_id: p.id || String(p._id), name: p.name || p.facility_name,
                type: p.type, verification_status: p.verification_status || 'pending',
                documents_submitted: submitted, documents_required: 4,
                compliant: (p.verification_status === 'verified') && submitted >= 4,
            };
        });
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminComplianceController.prototype, "list", null);
AdminComplianceController = __decorate([
    (0, common_1.Controller)('compliance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminComplianceController);
let AdminTransportController = class AdminTransportController extends AdminController {
    async list() {
        const rows = await this.conn.collection('transport_units').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminTransportController.prototype, "list", null);
AdminTransportController = __decorate([
    (0, common_1.Controller)('transport'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminTransportController);
let AdminFamilyCardsController = class AdminFamilyCardsController extends AdminController {
    async list() {
        const groups = await this.conn.collection('family_groups').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return groups.map((g) => ({
            id: g.id || String(g._id), owner_id: g.owner_id, name: g.name,
            members: Array.isArray(g.members) ? g.members.length : 0,
            created_at: g.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFamilyCardsController.prototype, "list", null);
AdminFamilyCardsController = __decorate([
    (0, common_1.Controller)('family-cards'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminFamilyCardsController);
let AdminBlacklistController = class AdminBlacklistController extends AdminController {
    async list() {
        const rows = await this.conn.collection('bans').find({ active: { $ne: false } }).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((b) => ({
            id: b.id || String(b._id), user_id: b.user_id || b.account_id,
            reason: b.reason, banned_by: b.banned_by || b.created_by,
            created_at: b.createdAt, expires_at: b.expires_at || null,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminBlacklistController.prototype, "list", null);
AdminBlacklistController = __decorate([
    (0, common_1.Controller)('blacklist'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminBlacklistController);
let AdminFraudController = class AdminFraudController extends AdminController {
    async alerts() {
        const rows = await this.conn.collection('fraud_alerts').find({ status: { $nin: ['resolved', 'dismissed'] } })
            .sort({ createdAt: -1 }).limit(200).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)('alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFraudController.prototype, "alerts", null);
AdminFraudController = __decorate([
    (0, common_1.Controller)('fraud'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminFraudController);
let AdminAdminsController = class AdminAdminsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('users')
            .find({ role: { $in: ['admin', 'super_admin', 'ADMIN', 'SUPER_ADMIN'] } })
            .project({ id: 1, full_name: 1, email: 1, phone: 1, role: 1, createdAt: 1, banned: 1 })
            .limit(200).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), name: r.full_name, email: r.email, phone: r.phone,
            role: r.role, active: !r.banned, created_at: r.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAdminsController.prototype, "list", null);
AdminAdminsController = __decorate([
    (0, common_1.Controller)('admins'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminAdminsController);
let AdminWaitlistController = class AdminWaitlistController extends AdminController {
    async list() {
        const rows = await this.conn.collection('waitlist_entries').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminWaitlistController.prototype, "list", null);
AdminWaitlistController = __decorate([
    (0, common_1.Controller)('waitlist'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminWaitlistController);
let AdminReferralsController = class AdminReferralsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('outbound_referrals').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), referrer_doctor_id: r.referrer_doctor_id, patient_id: r.patient_id,
            referral_code: r.referral_code, target_type: r.target_type, status: r.status, created_at: r.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminReferralsController.prototype, "list", null);
AdminReferralsController = __decorate([
    (0, common_1.Controller)('referrals'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminReferralsController);
let AdminTasksController = class AdminTasksController extends AdminController {
    async list() {
        const rows = await this.conn.collection('admin_tasks').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async create(user, body) {
        if (!body?.title)
            throw new common_1.BadRequestException('عنوان المهمة مطلوب');
        const doc = {
            id: (0, uuid_1.v4)(), title: String(body.title), description: body.description || null,
            assignee: body.assignee || null, due_date: body.due_date ? new Date(body.due_date) : null,
            status: 'open', created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('admin_tasks').insertOne(doc);
        return doc;
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminTasksController.prototype, "create", null);
AdminTasksController = __decorate([
    (0, common_1.Controller)('tasks'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminTasksController);
const SA_SPECIALTIES = [
    ['cardiology', 'قلب وأوعية دموية'], ['dermatology', 'جلدية'], ['pediatrics', 'طب أطفال'],
    ['obgyn', 'نساء وولادة'], ['orthopedics', 'عظام'], ['neurology', 'أعصاب'],
    ['psychiatry', 'طب نفسي'], ['dentistry', 'أسنان'], ['ophthalmology', 'عيون'],
    ['ent', 'أنف وأذن وحنجرة'], ['internal', 'باطنية'], ['family', 'طب أسرة'],
    ['urology', 'مسالك بولية'], ['gastro', 'جهاز هضمي'], ['endocrine', 'غدد صماء وسكري'],
    ['pulmonology', 'صدرية'], ['nephrology', 'كلى'], ['oncology', 'أورام'],
    ['rheumatology', 'روماتيزم'], ['surgery', 'جراحة عامة'], ['physiotherapy', 'علاج طبيعي'],
    ['nutrition', 'تغذية'], ['emergency', 'طوارئ'],
];
let AdminSpecialtiesController = class AdminSpecialtiesController extends AdminController {
    async list() {
        const col = this.conn.collection('specialties');
        if ((await col.countDocuments({})) === 0) {
            await col.insertMany(SA_SPECIALTIES.map(([code, name_ar], i) => ({
                id: `spec-${code}`, code, name_ar, name_en: code, sort: i + 1, active: true, createdAt: now(), updatedAt: now(),
            })));
        }
        const rows = await col.find({ active: { $ne: false } }).sort({ sort: 1 }).limit(200).toArray();
        return rows.map((s) => ({ id: s.id || String(s._id), code: s.code, name_ar: s.name_ar, name_en: s.name_en, active: s.active !== false }));
    }
    async create(body) {
        if (!body?.name_ar || !body?.code)
            throw new common_1.BadRequestException('الرمز والاسم مطلوبان');
        const doc = { id: `spec-${body.code}`, code: String(body.code), name_ar: String(body.name_ar), name_en: body.name_en || String(body.code), sort: Number(body.sort) || 100, active: true, createdAt: now(), updatedAt: now() };
        await this.conn.collection('specialties').updateOne({ code: doc.code }, { $set: doc }, { upsert: true });
        return doc;
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSpecialtiesController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminSpecialtiesController.prototype, "create", null);
AdminSpecialtiesController = __decorate([
    (0, common_1.Controller)('specialties'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminSpecialtiesController);
let AdminServicesController = class AdminServicesController extends AdminController {
    async list() {
        const [labs, rads, home] = await Promise.all([
            this.conn.collection('labservices').find({ active: { $ne: false } }).limit(200).toArray(),
            this.conn.collection('radiologyservices').find({ active: { $ne: false } }).limit(200).toArray(),
            this.conn.collection('homecareservices').find({ active: { $ne: false } }).limit(200).toArray(),
        ]);
        const map = (t) => (s) => ({
            id: s.id || String(s._id), type: t, name_ar: s.name_ar, name_en: s.name_en,
            price: s.price, category: s.category || null, active: s.active !== false,
        });
        return [...labs.map(map('lab')), ...rads.map(map('radiology')), ...home.map(map('home_care'))];
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminServicesController.prototype, "list", null);
AdminServicesController = __decorate([
    (0, common_1.Controller)('services'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminServicesController);
let AdminComplaintsController = class AdminComplaintsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('complaints').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminComplaintsController.prototype, "list", null);
AdminComplaintsController = __decorate([
    (0, common_1.Controller)('complaints'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminComplaintsController);
let AdminCmsController = class AdminCmsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('cms_pages').find({}).sort({ updatedAt: -1 }).limit(100).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "list", null);
AdminCmsController = __decorate([
    (0, common_1.Controller)('cms'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminCmsController);
let AdminBannersController = class AdminBannersController extends AdminController {
    async list() {
        const rows = await this.conn.collection('banners').find({}).sort({ sort: 1 }).limit(100).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async create(user, body) {
        if (!body?.title_ar)
            throw new common_1.BadRequestException('عنوان البانر مطلوب');
        const doc = {
            id: (0, uuid_1.v4)(), title_ar: String(body.title_ar), title_en: body.title_en || null,
            image_url: body.image_url || null, link: body.link || null,
            sort: Number(body.sort) || 0, active: body.active !== false,
            created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('banners').insertOne(doc);
        return doc;
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminBannersController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBannersController.prototype, "create", null);
AdminBannersController = __decorate([
    (0, common_1.Controller)('banners'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminBannersController);
let AdminOrdersController = class AdminOrdersController extends AdminController {
    async reassign(id, user, body) {
        const pid = String(body?.provider_id || '').trim();
        if (!pid)
            throw new common_1.BadRequestException('provider_id مطلوب');
        const order = await this.conn.collection('orders').findOne(byId(id));
        if (!order)
            throw new common_1.NotFoundException('الطلب غير موجود');
        const provider = await this.conn.collection('provider_profiles').findOne({ $or: [{ id: pid }, { user_id: pid }, { account_id: pid }] });
        if (!provider)
            throw new common_1.NotFoundException('مزوّد الخدمة غير موجود');
        const prev = order.pharmacy_id || order.provider_id || null;
        await this.conn.collection('orders').updateOne(byId(id), {
            $set: { pharmacy_id: pid, provider_id: pid, updatedAt: now() },
            $push: {
                state_history: {
                    from: order.state || order.status || null, to: order.state || order.status || null,
                    by_user_id: uid(user), by_role: 'admin',
                    note: `reassigned from ${prev || 'unassigned'} to ${pid}`, at: now(),
                },
            },
        });
        return { ok: true, order_id: order.id || id, provider_id: pid, previous: prev };
    }
};
__decorate([
    (0, common_1.Post)(':id/reassign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOrdersController.prototype, "reassign", null);
AdminOrdersController = __decorate([
    (0, common_1.Controller)('orders'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminOrdersController);
let AdminFinancialController = class AdminFinancialController extends AdminController {
    async summary() {
        const month = new Date();
        month.setDate(1);
        month.setHours(0, 0, 0, 0);
        const [gmvRows, monthRows, refundsPending, copayRows, withdrawalsPending] = await Promise.all([
            this.conn.collection('orders').aggregate([
                { $match: { status: { $nin: ['cancelled', 'CANCELLED'] } } },
                { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$totals.total', 0] } }, count: { $sum: 1 } } },
            ]).toArray(),
            this.conn.collection('orders').aggregate([
                { $match: { createdAt: { $gte: month }, status: { $nin: ['cancelled', 'CANCELLED'] } } },
                { $group: { _id: null, total: { $sum: { $ifNull: ['$total', '$totals.total', 0] } }, count: { $sum: 1 } } },
            ]).toArray(),
            this.conn.collection('refund_requests').countDocuments({ status: { $in: ['pending', 'requested'] } }),
            this.conn.collection('insuranceservicerequests').aggregate([
                { $match: { state: 'COPAY_PAID' } },
                { $group: { _id: null, total: { $sum: { $ifNull: ['$copay_amount', 0] } }, count: { $sum: 1 } } },
            ]).toArray(),
            this.conn.collection('withdrawals').countDocuments({ status: { $in: ['pending', 'PENDING'] } }),
        ]);
        return {
            gmv_total: gmvRows[0]?.total || 0, orders_total: gmvRows[0]?.count || 0,
            gmv_month: monthRows[0]?.total || 0, orders_month: monthRows[0]?.count || 0,
            refunds_pending: refundsPending,
            copay_collected: copayRows[0]?.total || 0, copay_count: copayRows[0]?.count || 0,
            withdrawals_pending: withdrawalsPending,
            generated_at: now(),
        };
    }
};
__decorate([
    (0, common_1.Get)('summary'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminFinancialController.prototype, "summary", null);
AdminFinancialController = __decorate([
    (0, common_1.Controller)('financial'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminFinancialController);
let AdminCommissionsController = class AdminCommissionsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('commissionrules').find({}).limit(200).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async update(id, user, body) {
        if (body?.commission === undefined)
            throw new common_1.BadRequestException('قيمة العمولة مطلوبة');
        const res = await this.conn.collection('commissionrules').updateOne(byId(id), { $set: { commission: body.commission, updated_by: uid(user), updatedAt: now() } });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('قاعدة العمولة غير موجودة');
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCommissionsController.prototype, "list", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCommissionsController.prototype, "update", null);
AdminCommissionsController = __decorate([
    (0, common_1.Controller)('commissions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminCommissionsController);
let AdminRefundsController = class AdminRefundsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('refund_requests').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async create(user, body) {
        if (!body?.order_id || !(Number(body?.amount) > 0))
            throw new common_1.BadRequestException('order_id والمبلغ مطلوبان');
        const doc = {
            id: (0, uuid_1.v4)(), order_id: String(body.order_id), amount: Number(body.amount),
            reason: body.reason || null, status: 'pending', issued_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('refund_requests').insertOne(doc);
        return doc;
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminRefundsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminRefundsController.prototype, "create", null);
AdminRefundsController = __decorate([
    (0, common_1.Controller)('refunds'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminRefundsController);
let AdminCouponsController = class AdminCouponsController extends AdminController {
    async list() {
        const rows = await this.conn.collection('coupons').find({}).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async create(user, body) {
        if (!body?.code)
            throw new common_1.BadRequestException('رمز القسيمة مطلوب');
        const doc = {
            id: (0, uuid_1.v4)(), code: String(body.code).toUpperCase(),
            discount_percent: body.discount_percent ?? null, discount_amount: body.discount_amount ?? null,
            max_uses: body.max_uses ?? null, used_count: 0,
            valid_from: body.valid_from ? new Date(body.valid_from) : now(),
            valid_until: body.valid_until ? new Date(body.valid_until) : null,
            min_order: body.min_order ?? null,
            max_discount: body.max_discount ?? null,
            usage_limit_per_user: body.usage_limit_per_user ?? 1,
            provider_id: body.provider_id ?? null,
            categories: Array.isArray(body.categories) ? body.categories : [],
            first_order_only: body.first_order_only === true,
            campaign_id: body.campaign_id ?? null,
            active: true, created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('coupons').updateOne({ code: doc.code }, { $set: doc }, { upsert: true });
        return doc;
    }
    async update(user, code, body) {
        const allowed = ['discount_percent', 'discount_amount', 'max_uses', 'valid_from', 'valid_until',
            'min_order', 'max_discount', 'usage_limit_per_user', 'provider_id', 'categories',
            'first_order_only', 'campaign_id', 'active'];
        const $set = { updatedAt: now() };
        for (const k of allowed)
            if (body?.[k] !== undefined)
                $set[k] = body[k];
        const r = await this.conn.collection('coupons').updateOne({ code: String(code).toUpperCase() }, { $set });
        if (!r.matchedCount)
            throw new common_1.NotFoundException('coupon_not_found');
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':code'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('code')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminCouponsController.prototype, "update", null);
AdminCouponsController = __decorate([
    (0, common_1.Controller)('coupons'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminCouponsController);
let AdminLoyaltyController = class AdminLoyaltyController extends AdminController {
    async putConfig(user, body) {
        await this.conn.collection('loyalty_config').updateOne({ key: 'global' }, { $set: { key: 'global', value: body || {}, updated_by: uid(user), updatedAt: now() } }, { upsert: true });
        return { ok: true };
    }
    async updateEarnRule(id, user, body) {
        const allowed = ['name_ar', 'name_en', 'event', 'points', 'multiplier', 'active', 'conditions'];
        const $set = { updated_by: uid(user), updatedAt: now() };
        for (const k of allowed)
            if (k in (body || {}))
                $set[k] = body[k];
        const res = await this.conn.collection('loyalty_earn_rules').updateOne(byId(id), { $set });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return { ok: true };
    }
    async toggleEarnRule(id) {
        const doc = await this.conn.collection('loyalty_earn_rules').findOne(byId(id));
        if (!doc)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        await this.conn.collection('loyalty_earn_rules').updateOne(byId(id), { $set: { active: !doc.active, updatedAt: now() } });
        return { ok: true, active: !doc.active };
    }
    async balance(id) {
        const acc = await this.conn.collection('loyalty_accounts').findOne({ user_id: id });
        const recent = await this.conn.collection('loyalty_transactions')
            .find({ user_id: id }).sort({ createdAt: -1 }).limit(10).toArray();
        return {
            user_id: id, balance: acc?.balance ?? 0, lifetime_earned: acc?.lifetime_earned ?? 0,
            tier: acc?.tier || 'bronze',
            recent_transactions: recent.map((t) => ({ id: String(t._id), points: t.points, kind: t.kind, reason: t.reason, at: t.createdAt })),
        };
    }
    async adjust(userId, points, kind, reason, by, orderId) {
        await this.conn.collection('loyalty_accounts').updateOne({ user_id: userId }, {
            $inc: { balance: points, ...(points > 0 ? { lifetime_earned: points } : {}) },
            $setOnInsert: { user_id: userId, tier: 'bronze', createdAt: now() },
            $set: { updatedAt: now() },
        }, { upsert: true });
        await this.conn.collection('loyalty_transactions').insertOne({
            user_id: userId, points, kind, reason, order_id: orderId || null, by, createdAt: now(),
        });
        const acc = await this.conn.collection('loyalty_accounts').findOne({ user_id: userId });
        return { ok: true, balance: acc?.balance ?? 0 };
    }
    async manualAdjust(user, body) {
        if (!body?.user_id || !Number.isFinite(Number(body?.points)) || Number(body.points) === 0) {
            throw new common_1.BadRequestException('user_id ونقاط غير صفرية مطلوبة');
        }
        const pts = Math.trunc(Number(body.points));
        return this.adjust(String(body.user_id), pts, pts > 0 ? 'admin_credit' : 'admin_debit', body.reason || null, uid(user));
    }
    async redeem(user, body) {
        if (!body?.user_id || !(Number(body?.points) > 0))
            throw new common_1.BadRequestException('user_id ونقاط موجبة مطلوبة');
        const pts = Math.trunc(Number(body.points));
        const acc = await this.conn.collection('loyalty_accounts').findOne({ user_id: String(body.user_id) });
        if (!acc || (acc.balance ?? 0) < pts)
            throw new common_1.BadRequestException('رصيد النقاط غير كافٍ');
        return this.adjust(String(body.user_id), -pts, 'redeem', body.order_id ? `order ${body.order_id}` : null, uid(user), body.order_id);
    }
};
__decorate([
    (0, common_1.Put)('config'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "putConfig", null);
__decorate([
    (0, common_1.Put)('earn-rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "updateEarnRule", null);
__decorate([
    (0, common_1.Post)('earn-rules/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "toggleEarnRule", null);
__decorate([
    (0, common_1.Get)('users/:id/balance'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "balance", null);
__decorate([
    (0, common_1.Post)('manual-adjust'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "manualAdjust", null);
__decorate([
    (0, common_1.Post)('redeem'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminLoyaltyController.prototype, "redeem", null);
AdminLoyaltyController = __decorate([
    (0, common_1.Controller)('loyalty'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminLoyaltyController);
let AdminDeliveryController = class AdminDeliveryController extends AdminController {
    async rules() {
        const rows = await this.conn.collection('delivery_rules').find({}).sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async createRule(user, body) {
        const doc = {
            id: (0, uuid_1.v4)(), name_ar: body?.name_ar || null,
            min_order_sar: body?.min_order_sar ?? null, service_type: body?.service_type || null,
            city: body?.city || null, user_segment: body?.user_segment || null,
            free: body?.free !== false, fee_sar: body?.fee_sar ?? 0,
            active: body?.active !== false, created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('delivery_rules').insertOne(doc);
        return doc;
    }
    async updateRule(id, user, body) {
        const allowed = ['name_ar', 'min_order_sar', 'service_type', 'city', 'user_segment', 'free', 'fee_sar', 'active'];
        const $set = { updated_by: uid(user), updatedAt: now() };
        for (const k of allowed)
            if (k in (body || {}))
                $set[k] = body[k];
        const res = await this.conn.collection('delivery_rules').updateOne(byId(id), { $set });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return { ok: true };
    }
    async toggleRule(id) {
        const doc = await this.conn.collection('delivery_rules').findOne(byId(id));
        if (!doc)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        await this.conn.collection('delivery_rules').updateOne(byId(id), { $set: { active: !doc.active, updatedAt: now() } });
        return { ok: true, active: !doc.active };
    }
    async deleteRule(id) {
        const res = await this.conn.collection('delivery_rules').deleteOne(byId(id));
        if (!res.deletedCount)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return { ok: true };
    }
    async baseFees(user, body) {
        await this.conn.collection('delivery_config').updateOne({ key: 'base-fees' }, { $set: { key: 'base-fees', value: body || {}, updated_by: uid(user), updatedAt: now() } }, { upsert: true });
        return { ok: true };
    }
    async toggleSystem(user, body) {
        await this.conn.collection('delivery_config').updateOne({ key: 'system' }, { $set: { key: 'system', enabled: body?.enabled !== false, updated_by: uid(user), updatedAt: now() } }, { upsert: true });
        return { ok: true, enabled: body?.enabled !== false };
    }
};
__decorate([
    (0, common_1.Get)('rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "rules", null);
__decorate([
    (0, common_1.Post)('rules'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "createRule", null);
__decorate([
    (0, common_1.Put)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "updateRule", null);
__decorate([
    (0, common_1.Post)('rules/:id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "toggleRule", null);
__decorate([
    (0, common_1.Delete)('rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "deleteRule", null);
__decorate([
    (0, common_1.Put)('base-fees'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "baseFees", null);
__decorate([
    (0, common_1.Post)('toggle'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminDeliveryController.prototype, "toggleSystem", null);
AdminDeliveryController = __decorate([
    (0, common_1.Controller)('delivery'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminDeliveryController);
let DeliveryCheckController = class DeliveryCheckController extends AdminController {
    async check(q) {
        const cfg = await this.conn.collection('delivery_config').findOne({ key: 'system' });
        if (cfg && cfg.enabled === false)
            return { free: false, fee_sar: null, reason: 'delivery_disabled' };
        const amount = Number(q?.order_amount) || 0;
        const fees = await this.conn.collection('delivery_config').findOne({ key: 'base-fees' });
        const baseFee = Number(fees?.value?.base_delivery_fee_sar ?? 15);
        const rules = await this.conn.collection('delivery_rules').find({ active: { $ne: false } }).toArray();
        for (const r of rules) {
            if (r.service_type && q?.service_type && String(r.service_type) !== String(q.service_type))
                continue;
            if (r.city && q?.city && String(r.city).toLowerCase() !== String(q.city).toLowerCase())
                continue;
            if (r.min_order_sar != null && amount < Number(r.min_order_sar))
                continue;
            return r.free === false
                ? { free: false, fee_sar: Number(r.fee_sar ?? baseFee), rule_id: r.id || String(r._id) }
                : { free: true, fee_sar: 0, rule_id: r.id || String(r._id) };
        }
        return { free: false, fee_sar: baseFee };
    }
};
__decorate([
    (0, common_1.Get)('check'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], DeliveryCheckController.prototype, "check", null);
DeliveryCheckController = __decorate([
    (0, common_1.Controller)('delivery')
], DeliveryCheckController);
let AdminPromotionsController = class AdminPromotionsController extends AdminController {
    async list(status) {
        const filter = status ? { status } : {};
        const rows = await this.conn.collection('promotioncampaigns').find(filter).sort({ createdAt: -1 }).limit(300).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async one(id) {
        const doc = await this.conn.collection('promotioncampaigns').findOne(byId(id));
        if (!doc)
            throw new common_1.NotFoundException('العرض غير موجود');
        return { ...doc, id: doc.id || String(doc._id) };
    }
    async create(user, body) {
        if (!body?.title_ar)
            throw new common_1.BadRequestException('عنوان العرض مطلوب');
        const doc = {
            id: (0, uuid_1.v4)(), provider_id: body.provider_id || null,
            title_ar: String(body.title_ar), title_en: body.title_en || null,
            original_price: body.original_price ?? null, discounted_price: body.discounted_price ?? null,
            start_date: body.start_date ? new Date(body.start_date) : now(),
            end_date: body.end_date ? new Date(body.end_date) : new Date(Date.now() + 30 * 86400000),
            image_url: body.image_url || null, target_parameters: body.target_parameters || {},
            status: body.status || 'approved', created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('promotioncampaigns').insertOne(doc);
        return doc;
    }
    async update(id, user, body) {
        const allowed = ['title_ar', 'title_en', 'original_price', 'discounted_price', 'start_date', 'end_date', 'image_url', 'target_parameters', 'status'];
        const $set = { updated_by: uid(user), updatedAt: now() };
        for (const k of allowed)
            if (k in (body || {}))
                $set[k] = body[k];
        const res = await this.conn.collection('promotioncampaigns').updateOne(byId(id), { $set });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('العرض غير موجود');
        return { ok: true };
    }
    async toggle(id) {
        const doc = await this.conn.collection('promotioncampaigns').findOne(byId(id));
        if (!doc)
            throw new common_1.NotFoundException('العرض غير موجود');
        const next = doc.status === 'approved' ? 'paused' : 'approved';
        await this.conn.collection('promotioncampaigns').updateOne(byId(id), { $set: { status: next, updatedAt: now() } });
        return { ok: true, status: next };
    }
    async remove(id) {
        const res = await this.conn.collection('promotioncampaigns').deleteOne(byId(id));
        if (!res.deletedCount)
            throw new common_1.NotFoundException('العرض غير موجود');
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "list", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "one", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "create", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/toggle'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "toggle", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminPromotionsController.prototype, "remove", null);
AdminPromotionsController = __decorate([
    (0, common_1.Controller)('promotions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminPromotionsController);
let PromotionsApplicableController = class PromotionsApplicableController extends AdminController {
    async applicable(q) {
        const nowD = now();
        const rows = await this.conn.collection('promotioncampaigns')
            .find({ status: 'approved', start_date: { $lte: nowD }, end_date: { $gte: nowD } })
            .limit(100).toArray();
        const amount = Number(q?.order_amount) || 0;
        return rows
            .filter((p) => {
            const t = p.target_parameters || {};
            if (t.min_order_sar != null && amount < Number(t.min_order_sar))
                return false;
            if (t.city && q?.city && String(t.city).toLowerCase() !== String(q.city).toLowerCase())
                return false;
            if (t.gender && q?.gender && String(t.gender) !== String(q.gender))
                return false;
            if (Array.isArray(t.services) && t.services.length && q?.services) {
                const wanted = String(q.services).split(',');
                if (!t.services.some((s) => wanted.includes(String(s))))
                    return false;
            }
            return true;
        })
            .map((p) => ({
            id: p.id || String(p._id), title_ar: p.title_ar, title_en: p.title_en,
            original_price: p.original_price, discounted_price: p.discounted_price,
            discount: p.original_price && p.discounted_price ? Math.round((1 - p.discounted_price / p.original_price) * 100) : null,
            end_date: p.end_date,
        }));
    }
};
__decorate([
    (0, common_1.Get)('applicable'),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PromotionsApplicableController.prototype, "applicable", null);
PromotionsApplicableController = __decorate([
    (0, common_1.Controller)('promotions')
], PromotionsApplicableController);
let AdminNotificationsController = class AdminNotificationsController extends AdminController {
    async history() {
        const rows = await this.conn.collection('notifications').find({}).sort({ createdAt: -1 }).limit(100).toArray();
        return rows.map((n) => ({
            id: n.id || String(n._id), user_id: n.user_id, title: n.title, body: n.body,
            kind: n.kind, read: !!n.read, created_at: n.createdAt,
        }));
    }
    async send(user, body) {
        const text = String(body?.body || body?.message || '').trim();
        if (!text || !body?.title)
            throw new common_1.BadRequestException('العنوان والنص مطلوبان');
        if (body?.user_id) {
            const doc = {
                id: (0, uuid_1.v4)(), user_id: String(body.user_id), title: String(body.title), body: text,
                kind: 'admin_direct', read: false, createdAt: now(),
            };
            await this.conn.collection('notifications').insertOne(doc);
            return { ok: true, mode: 'direct', id: doc.id };
        }
        const doc = {
            id: (0, uuid_1.v4)(), title: String(body.title), body: text,
            target_segments: body?.segment ? [String(body.segment)] : ['all'],
            status: 'scheduled', scheduled_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('admin_broadcasts').insertOne(doc);
        return { ok: true, mode: 'broadcast', id: doc.id };
    }
    async autoRules() {
        const rows = await this.conn.collection('notification_auto_rules').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        return rows.map((r) => ({ ...r, id: r.id || String(r._id) }));
    }
    async createAutoRule(user, body) {
        if (!body?.name || !body?.trigger)
            throw new common_1.BadRequestException('الاسم والمشغّل مطلوبان');
        const doc = {
            id: (0, uuid_1.v4)(), name: String(body.name), trigger: String(body.trigger),
            template: body.template || null, channels: body.channels || ['push'],
            active: body.active !== false, created_by: uid(user), createdAt: now(), updatedAt: now(),
        };
        await this.conn.collection('notification_auto_rules').insertOne(doc);
        return doc;
    }
    async updateAutoRule(id, body) {
        const allowed = ['name', 'trigger', 'template', 'channels', 'active'];
        const $set = { updatedAt: now() };
        for (const k of allowed)
            if (k in (body || {}))
                $set[k] = body[k];
        const res = await this.conn.collection('notification_auto_rules').updateOne(byId(id), { $set });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return { ok: true };
    }
    async removeAutoRule(id) {
        const res = await this.conn.collection('notification_auto_rules').deleteOne(byId(id));
        if (!res.deletedCount)
            throw new common_1.NotFoundException('القاعدة غير موجودة');
        return { ok: true };
    }
};
__decorate([
    (0, common_1.Get)('history'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "history", null);
__decorate([
    (0, common_1.Post)('send'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "send", null);
__decorate([
    (0, common_1.Get)('auto-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "autoRules", null);
__decorate([
    (0, common_1.Post)('auto-rules'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "createAutoRule", null);
__decorate([
    (0, common_1.Put)('auto-rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "updateAutoRule", null);
__decorate([
    (0, common_1.Delete)('auto-rules/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminNotificationsController.prototype, "removeAutoRule", null);
AdminNotificationsController = __decorate([
    (0, common_1.Controller)('notifications'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminNotificationsController);
let AdminNursingServicesController = class AdminNursingServicesController extends AdminController {
    async list() {
        const rows = await this.conn.collection('nurse_providers').find({}).limit(300).toArray();
        return rows.map((n) => ({
            id: n.id || String(n._id), name: n.name || n.full_name,
            license: n.license_number || null, city: n.city || null,
            coverage_radius_km: n.coverage_radius_km ?? null, active: n.active !== false,
        }));
    }
};
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNursingServicesController.prototype, "list", null);
AdminNursingServicesController = __decorate([
    (0, common_1.Controller)('nursing-services'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminNursingServicesController);
let AdminInsuranceClaimsController = class AdminInsuranceClaimsController extends AdminController {
    async decide(id, user, approve, body) {
        const req = await this.conn.collection('insuranceservicerequests').findOne(byId(id));
        if (!req)
            throw new common_1.NotFoundException('المطالبة غير موجودة');
        if (['COPAY_PAID', 'CANCELLED', 'EXPIRED'].includes(req.state)) {
            throw new common_1.BadRequestException(`لا يمكن اتخاذ قرار في حالة ${req.state}`);
        }
        const update = { decided_by: uid(user), decided_at: now(), updatedAt: now() };
        if (approve) {
            const pct = Number(body?.copay_percent) || 0;
            if (pct > 0 && pct < 100) {
                update.state = 'COPAY_PENDING';
                update.copay_percent = pct;
                update.copay_amount = Math.round((req.price || 0) * (pct / 100) * 100) / 100;
            }
            else {
                update.state = 'APPROVED_FULL';
                update.copay_percent = 0;
                update.copay_amount = 0;
            }
        }
        else {
            if (!String(body?.reason || '').trim())
                throw new common_1.BadRequestException('سبب الرفض مطلوب');
            update.state = 'REJECTED';
            update.rejection_reason = String(body.reason).trim();
        }
        await this.conn.collection('insuranceservicerequests').updateOne(byId(id), {
            $set: update,
            $push: { history: { state: update.state, at: now(), by: uid(user), note: body?.reason || 'admin decision' } },
        });
        return { ok: true, id: req.id || id, state: update.state, copay_amount: update.copay_amount };
    }
    approve(id, user, body) {
        return this.decide(id, user, true, body);
    }
    reject(id, user, body) {
        return this.decide(id, user, false, body);
    }
};
__decorate([
    (0, common_1.Post)('claims/:id/approve'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminInsuranceClaimsController.prototype, "approve", null);
__decorate([
    (0, common_1.Post)('claims/:id/reject'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminInsuranceClaimsController.prototype, "reject", null);
AdminInsuranceClaimsController = __decorate([
    (0, common_1.Controller)('insurance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminInsuranceClaimsController);
let AdminProviderSubAccountsController = class AdminProviderSubAccountsController extends AdminController {
    async subAccounts(id) {
        const rows = await this.conn.collection('provider_accounts')
            .find({ $or: [{ facility_id: id }, { parent_provider_id: id }, { parent_id: id }] })
            .project({ id: 1, email: 1, full_name: 1, role: 1, ptype: 1, status: 1, facility_id: 1, createdAt: 1 })
            .limit(300).toArray();
        return rows.map((r) => ({
            id: r.id || String(r._id), email: r.email, name: r.full_name,
            role: r.role || r.ptype, status: r.status, facility_id: r.facility_id, created_at: r.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)(':id/sub-accounts'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminProviderSubAccountsController.prototype, "subAccounts", null);
AdminProviderSubAccountsController = __decorate([
    (0, common_1.Controller)('providers'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminProviderSubAccountsController);
let AdminMedicinesController = class AdminMedicinesController extends AdminController {
    async shortage(id, user, body) {
        let med = await this.conn.collection('medicines_master').findOne(byId(id));
        let colName = 'medicines_master';
        if (!med) {
            med = await this.conn.collection('medicines').findOne(byId(id));
            colName = 'medicines';
        }
        if (!med)
            throw new common_1.NotFoundException('الدواء غير موجود');
        await this.conn.collection(colName).updateOne(byId(id), { $set: { shortage_flagged: true, updatedAt: now() } });
        const ins = await this.conn.collection('pharmacy_shortage_reports').insertOne({
            medicine_id: med.id || id, product_name: med.name_ar || med.name_en || null,
            reporter: body?.reporter || 'admin-console', note: body?.note || null,
            status: 'open', created_by: uid(user), createdAt: now(),
        });
        return { ok: true, id: String(ins.insertedId) };
    }
};
__decorate([
    (0, common_1.Post)(':id/shortage'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminMedicinesController.prototype, "shortage", null);
AdminMedicinesController = __decorate([
    (0, common_1.Controller)('medicines'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminMedicinesController);
let AdminBulkUploadController = class AdminBulkUploadController extends AdminController {
    async upload(user, file, body) {
        let rows = [];
        if (file?.buffer) {
            const text = file.buffer.toString('utf8');
            const lines = text.split(/\r?\n/).filter((l) => l.trim());
            const headers = lines.shift()?.split(',').map((h) => h.trim().toLowerCase()) || [];
            for (const line of lines.slice(0, 1000)) {
                const cells = line.split(',').map((c) => c.trim());
                const row = {};
                headers.forEach((h, i) => { row[h] = cells[i] ?? ''; });
                if (row.name_ar || row.name_en || row.name)
                    rows.push(row);
            }
        }
        else if (Array.isArray(body?.rows)) {
            rows = body.rows.slice(0, 1000);
        }
        else if (Array.isArray(body)) {
            rows = body.slice(0, 1000);
        }
        if (!rows.length)
            throw new common_1.BadRequestException('ملف CSV أو مصفوفة صفوف مطلوبة');
        let inserted = 0, updated = 0;
        for (const r of rows) {
            const nameAr = r.name_ar || r.name || null;
            const nameEn = r.name_en || null;
            if (!nameAr && !nameEn)
                continue;
            const doc = {
                name_ar: nameAr, name_en: nameEn, generic_name: r.generic_name || null,
                price: Number(r.price) || 0, category: r.category || null,
                stock: Number(r.stock) || 0, status: 'active', updatedAt: now(),
            };
            const key = r.id ? { id: String(r.id) } : { name_ar: nameAr };
            const res = await this.conn.collection('medicines_master').updateOne(key, { $set: doc, $setOnInsert: { id: r.id ? String(r.id) : (0, uuid_1.v4)(), createdAt: now(), created_by: uid(user) } }, { upsert: true });
            if (res.upsertedCount)
                inserted++;
            else
                updated++;
        }
        return { ok: true, received: rows.length, inserted, updated };
    }
};
__decorate([
    (0, common_1.Post)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file')),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.UploadedFile)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminBulkUploadController.prototype, "upload", null);
AdminBulkUploadController = __decorate([
    (0, common_1.Controller)('bulk-upload'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminBulkUploadController);
let AdminNursingMyController = class AdminNursingMyController extends AdminController {
    async my(user, nurseId) {
        const target = String(nurseId || uid(user));
        const rows = await this.conn.collection('homecarebookings')
            .find({ $or: [{ provider_id: target }, { nurse_id: target }, { provider_account_id: target }] })
            .sort({ createdAt: -1 }).limit(200).toArray();
        return rows.map((b) => ({
            id: b.id || String(b._id), patient_id: b.patient_id, state: b.state || b.status,
            service: b.service_name || b.service_id, address: b.address,
            scheduled_at: b.scheduled_at, created_at: b.createdAt,
        }));
    }
};
__decorate([
    (0, common_1.Get)('bookings/nursing/my'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('nurse_id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminNursingMyController.prototype, "my", null);
AdminNursingMyController = __decorate([
    (0, common_1.Controller)('home-care'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard)
], AdminNursingMyController);
const DEFAULT_PERMISSIONS = [
    { role: 'super_admin', permissions: ['*'] },
    { role: 'admin', permissions: ['providers.manage', 'orders.manage', 'finance.view', 'content.manage', 'notifications.send'] },
    { role: 'support', permissions: ['tickets.manage', 'users.view'] },
    { role: 'finance', permissions: ['finance.view', 'refunds.manage', 'payouts.manage'] },
];
const DEFAULT_WORKFLOWS = [
    { key: 'provider_onboarding', steps: ['register', 'verify_email', 'profile', 'kyc', 'bank', 'submit', 'admin_review', 'active'] },
    { key: 'pharmacy_order', steps: ['created', 'dispatched', 'accepted', 'preparing', 'ready', 'out_for_delivery', 'delivered'] },
    { key: 'consultation', steps: ['booked', 'confirmed', 'checked_in', 'in_progress', 'completed'] },
    { key: 'insurance_claim', steps: ['submitted', 'provider_review', 'decision', 'copay_payment', 'service_start'] },
];
const DEFAULT_THEME = {
    primary: '#0E7C7B', accent: '#F0A526', danger: '#D64550',
    background: '#F6F8FA', text: '#101828', radius: 12, font: 'Tajawal',
};
const DEFAULT_AI_CONFIG = {
    triage_model: 'nabd-triage-v2', symptom_confidence_threshold: 0.65,
    red_flag_escalation: true, max_suggestions: 3, languages: ['ar', 'en'],
};
let AdminSystemController = class AdminSystemController extends AdminController {
    async getConfig(key, fallback) {
        const doc = await this.conn.collection('system_config').findOne({ key });
        return doc?.value ?? fallback;
    }
    async putConfig(key, value, user) {
        await this.conn.collection('system_config').updateOne({ key }, { $set: { key, value, updated_by: uid(user), updatedAt: now() } }, { upsert: true });
        return { ok: true };
    }
    theme() { return this.getConfig('theme', DEFAULT_THEME); }
    putTheme(u, b) { return this.putConfig('theme', b || {}, u); }
    permissions() { return this.getConfig('permissions', DEFAULT_PERMISSIONS); }
    putPermissions(u, b) { return this.putConfig('permissions', b || [], u); }
    workflows() { return this.getConfig('workflows', DEFAULT_WORKFLOWS); }
    putWorkflows(u, b) { return this.putConfig('workflows', b || [], u); }
    aiConfig() { return this.getConfig('ai-config', DEFAULT_AI_CONFIG); }
    putAiConfig(u, b) { return this.putConfig('ai-config', b || {}, u); }
    alertRules() { return this.getConfig('alert-rules', []); }
    putAlertRules(u, b) { return this.putConfig('alert-rules', b || [], u); }
};
__decorate([
    (0, common_1.Get)('theme'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "theme", null);
__decorate([
    (0, common_1.Put)('theme'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "putTheme", null);
__decorate([
    (0, common_1.Get)('permissions'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "permissions", null);
__decorate([
    (0, common_1.Put)('permissions'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "putPermissions", null);
__decorate([
    (0, common_1.Get)('workflows'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "workflows", null);
__decorate([
    (0, common_1.Put)('workflows'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "putWorkflows", null);
__decorate([
    (0, common_1.Get)('ai-config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "aiConfig", null);
__decorate([
    (0, common_1.Put)('ai-config'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "putAiConfig", null);
__decorate([
    (0, common_1.Get)('alert-rules'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "alertRules", null);
__decorate([
    (0, common_1.Put)('alert-rules'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSystemController.prototype, "putAlertRules", null);
AdminSystemController = __decorate([
    (0, common_1.Controller)('system'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminSystemController);
let AdminAnalyticsController = class AdminAnalyticsController extends AdminController {
    async overview() {
        const since = new Date(Date.now() - 30 * 86400000);
        const [usersByDay, ordersByDay, apptsByDay] = await Promise.all([
            this.conn.collection('users').aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]).toArray(),
            this.conn.collection('orders').aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 }, revenue: { $sum: { $ifNull: ['$total', 0] } } } },
                { $sort: { _id: 1 } },
            ]).toArray(),
            this.conn.collection('appointments').aggregate([
                { $match: { createdAt: { $gte: since } } },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } },
            ]).toArray(),
        ]);
        return {
            window_days: 30,
            new_users_by_day: usersByDay.map((r) => ({ day: r._id, count: r.count })),
            orders_by_day: ordersByDay.map((r) => ({ day: r._id, count: r.count, revenue: r.revenue })),
            appointments_by_day: apptsByDay.map((r) => ({ day: r._id, count: r.count })),
        };
    }
    async heatmap() {
        const [byCityAppts, byCityOrders] = await Promise.all([
            this.conn.collection('appointments').aggregate([
                { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 30 },
            ]).toArray(),
            this.conn.collection('orders').aggregate([
                { $group: { _id: '$city', count: { $sum: 1 } } }, { $sort: { count: -1 } }, { $limit: 30 },
            ]).toArray(),
        ]);
        const merged = new Map();
        for (const r of byCityAppts)
            if (r._id)
                merged.set(r._id, (merged.get(r._id) || 0) + r.count);
        for (const r of byCityOrders)
            if (r._id)
                merged.set(r._id, (merged.get(r._id) || 0) + r.count);
        return [...merged.entries()].map(([city, count]) => ({ city, count })).sort((a, b) => b.count - a.count);
    }
    async customReport(body) {
        const entity = String(body?.entity || 'orders');
        const allowed = {
            orders: 'orders', appointments: 'appointments', users: 'users',
            insurance: 'insuranceservicerequests', emergencies: 'emergencyrequests',
            triage: 'ai_triage_sessions', assessments: 'self_assessments',
        };
        const colName = allowed[entity];
        if (!colName)
            throw new common_1.BadRequestException(`entity must be one of: ${Object.keys(allowed).join(', ')}`);
        const match = {};
        if (body?.from || body?.to) {
            match.createdAt = {};
            if (body.from)
                match.createdAt.$gte = new Date(body.from);
            if (body.to)
                match.createdAt.$lte = new Date(body.to);
        }
        const [total, byDay, byStatus] = await Promise.all([
            this.conn.collection(colName).countDocuments(match),
            this.conn.collection(colName).aggregate([
                { $match: match },
                { $group: { _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }, count: { $sum: 1 } } },
                { $sort: { _id: 1 } }, { $limit: 90 },
            ]).toArray(),
            this.conn.collection(colName).aggregate([
                { $match: match },
                { $group: { _id: { $ifNull: ['$status', '$state', '$urgency', '$severity'] }, count: { $sum: 1 } } },
            ]).toArray(),
        ]);
        return {
            entity, from: body?.from || null, to: body?.to || null, total,
            by_day: byDay.map((r) => ({ day: r._id, count: r.count })),
            by_status: byStatus.map((r) => ({ status: r._id || 'unknown', count: r.count })),
        };
    }
};
__decorate([
    (0, common_1.Get)('overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "overview", null);
__decorate([
    (0, common_1.Get)('heatmap'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "heatmap", null);
__decorate([
    (0, common_1.Post)('custom-report'),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminAnalyticsController.prototype, "customReport", null);
AdminAnalyticsController = __decorate([
    (0, common_1.Controller)('analytics'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminAnalyticsController);
let AdminNursingPortalController = class AdminNursingPortalController extends AdminController {
    async requests() {
        throw new common_1.ServiceUnavailableException('admin nursing operations are unavailable pending eligible-provider, acceptance, minimum-PHI and audit workflow approval');
    }
    async assign(id, user, body) {
        throw new common_1.ServiceUnavailableException('admin nursing assignment is unavailable pending eligible-provider, acceptance, minimum-PHI and audit workflow approval');
    }
};
__decorate([
    (0, common_1.Get)('requests'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminNursingPortalController.prototype, "requests", null);
__decorate([
    (0, common_1.Post)('requests/:id/assign'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminNursingPortalController.prototype, "assign", null);
AdminNursingPortalController = __decorate([
    (0, common_1.Controller)('admin/nursing'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN)
], AdminNursingPortalController);
let AdminSpaModule = class AdminSpaModule {
};
exports.AdminSpaModule = AdminSpaModule;
exports.AdminSpaModule = AdminSpaModule = __decorate([
    (0, common_1.Module)({
        controllers: [
            AdminNursingPortalController,
            AdminDashboardController,
            AdminBroadcastController,
            AdminEmergencyController,
            AdminContractsController,
            AdminShiftsController,
            AdminScorecardController,
            AdminComplianceController,
            AdminTransportController,
            AdminFamilyCardsController,
            AdminBlacklistController,
            AdminFraudController,
            AdminAdminsController,
            AdminWaitlistController,
            AdminReferralsController,
            AdminTasksController,
            AdminSpecialtiesController,
            AdminServicesController,
            AdminComplaintsController,
            AdminCmsController,
            AdminBannersController,
            AdminOrdersController,
            AdminFinancialController,
            AdminCommissionsController,
            AdminRefundsController,
            AdminCouponsController,
            AdminLoyaltyController,
            AdminDeliveryController,
            DeliveryCheckController,
            AdminPromotionsController,
            PromotionsApplicableController,
            AdminNotificationsController,
            AdminNursingServicesController,
            AdminInsuranceClaimsController,
            AdminProviderSubAccountsController,
            AdminMedicinesController,
            AdminBulkUploadController,
            AdminNursingMyController,
            AdminSystemController,
            AdminAnalyticsController,
        ],
    })
], AdminSpaModule);
//# sourceMappingURL=admin-spa.module.js.map