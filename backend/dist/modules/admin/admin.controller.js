"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const bcrypt = __importStar(require("bcryptjs"));
const crypto_1 = require("crypto");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const user_schema_1 = require("../../schemas/user.schema");
const provider_delta_schema_1 = require("../providers/schemas/provider-delta.schema");
const PROVIDER_CREATABLE_ROLES = [
    enums_1.UserRole.DOCTOR, enums_1.UserRole.PHARMACY, enums_1.UserRole.HOSPITAL, enums_1.UserRole.LAB,
    enums_1.UserRole.RADIOLOGY, enums_1.UserRole.NURSING, enums_1.UserRole.HOME_CARE, enums_1.UserRole.AMBULANCE,
    enums_1.UserRole.PHYSIOTHERAPIST,
];
let AdminController = class AdminController {
    constructor(userModel, deltaModel, appointmentModel, emergencyModel, connection, events) {
        this.userModel = userModel;
        this.deltaModel = deltaModel;
        this.appointmentModel = appointmentModel;
        this.emergencyModel = emergencyModel;
        this.connection = connection;
        this.events = events;
    }
    async referralReport() {
        const invites = this.connection.db.collection('referral_invites');
        const users = this.connection.db.collection('users');
        const loyaltyTx = this.connection.db.collection('loyalty_transactions');
        const [funnel, topRaw, recent, referralPoints, usersWithCode] = await Promise.all([
            invites.aggregate([{ $group: { _id: '$status', count: { $sum: 1 }, points: { $sum: { $ifNull: ['$reward_points', 0] } } } }]).toArray(),
            invites.aggregate([
                { $group: { _id: '$referrer_id', invites: { $sum: 1 }, rewarded: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, 1, 0] } }, points: { $sum: { $cond: [{ $eq: ['$status', 'rewarded'] }, { $ifNull: ['$reward_points', 0] }, 0] } } } },
                { $sort: { rewarded: -1, invites: -1 } },
                { $limit: 20 },
            ]).toArray(),
            invites.find({}).sort({ createdAt: -1 }).limit(20).toArray(),
            loyaltyTx.aggregate([
                { $match: { reason: { $regex: /^referral/ } } },
                { $group: { _id: null, total: { $sum: '$points_delta' }, count: { $sum: 1 } } },
            ]).toArray(),
            users.countDocuments({ referral_code: { $exists: true, $ne: null } }),
        ]);
        const ids = [...new Set([
                ...topRaw.map((t) => t._id),
                ...recent.map((i) => i.referrer_id),
                ...recent.map((i) => i.referred_user_id),
            ].filter(Boolean))];
        const named = await users.find({ id: { $in: ids } }, { projection: { id: 1, full_name: 1, phone: 1 } }).toArray();
        const nameById = new Map(named.map((u) => [u.id, u.full_name || u.phone || 'مستخدم']));
        const byStatus = (s) => funnel.find((f) => f._id === s)?.count || 0;
        return {
            funnel: {
                total_invites: funnel.reduce((a, f) => a + f.count, 0),
                registered: byStatus('registered'),
                rewarded: byStatus('rewarded'),
                users_with_code: usersWithCode,
            },
            points: {
                referral_points_paid: referralPoints[0]?.total || 0,
                referral_transactions: referralPoints[0]?.count || 0,
            },
            top_referrers: topRaw.map((t) => ({
                user_id: t._id,
                name: nameById.get(t._id) || t._id,
                invites: t.invites,
                rewarded: t.rewarded,
                points_earned: t.points,
            })),
            recent_invites: recent.map((i) => ({
                id: i.id,
                referrer: nameById.get(i.referrer_id) || i.referrer_id,
                referred: nameById.get(i.referred_user_id) || 'مستخدم جديد',
                status: i.status,
                reward_points: i.reward_points || 0,
                created_at: i.createdAt,
                rewarded_at: i.rewarded_at || null,
            })),
        };
    }
    async loyaltyOverview() {
        const accounts = this.connection.db.collection('loyalty_accounts');
        const tx = this.connection.db.collection('loyalty_transactions');
        const users = this.connection.db.collection('users');
        const [totals, tiers, top, recent] = await Promise.all([
            accounts.aggregate([{ $group: { _id: null, accounts: { $sum: 1 }, balance: { $sum: '$points' }, lifetime: { $sum: '$lifetime_points' } } }]).toArray(),
            accounts.aggregate([{ $group: { _id: '$tier', count: { $sum: 1 } } }]).toArray(),
            accounts.find({}).sort({ lifetime_points: -1 }).limit(15).toArray(),
            tx.find({}).sort({ createdAt: -1 }).limit(20).toArray(),
        ]);
        const named = await users.find({ id: { $in: [...new Set([...top.map((t) => t.user_id), ...recent.map((r) => r.user_id)])] } }, { projection: { id: 1, full_name: 1, phone: 1 } }).toArray();
        const nameById = new Map(named.map((u) => [u.id, u.full_name || u.phone || 'مستخدم']));
        return {
            accounts_total: totals[0]?.accounts || 0,
            points_in_circulation: totals[0]?.balance || 0,
            lifetime_points_issued: totals[0]?.lifetime || 0,
            tiers: Object.fromEntries(tiers.map((t) => [t._id || 'bronze', t.count])),
            top_earners: top.map((t) => ({
                user_id: t.user_id, name: nameById.get(t.user_id) || t.user_id,
                points: t.points, lifetime_points: t.lifetime_points, tier: t.tier,
            })),
            recent_transactions: recent.map((r) => ({
                user: nameById.get(r.user_id) || r.user_id,
                points_delta: r.points_delta, reason: r.reason, created_at: r.createdAt,
            })),
        };
    }
    async userOverview(userId, daysQ) {
        const user = await this.userModel.findOne({ id: userId }, { password_hash: 0, otp_codes: 0 }).lean()
            || await this.userModel.findById(userId, { password_hash: 0, otp_codes: 0 }).catch(() => null);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        const asPatient = { patient_id: user.id };
        const asProvider = { doctor_user_id: user.id };
        const isProvider = user.role !== enums_1.UserRole.PATIENT && user.role !== enums_1.UserRole.GUEST;
        const days = Math.max(0, parseInt(String(daysQ ?? '30'), 10) || 0);
        const since = days > 0 ? new Date(Date.now() - days * 86400000) : null;
        const periodFilter = (base) => since ? { ...base, createdAt: { $gte: since } } : base;
        const db = this.userModel.db;
        const providerProfile = isProvider
            ? await db.collection('provider_profiles').findOne({ user_id: user.id }, { projection: { account_id: 1, status: 1 } }).catch(() => null)
            : null;
        const providerAccountId = providerProfile?.account_id || null;
        const apptScope = periodFilter(isProvider ? { $or: [asPatient, asProvider] } : asPatient);
        const [apptCount, apptByStatus, recentAppts, sosCount, recentSos, deltas, providerRequests, providerReqByStatus, family] = await Promise.all([
            this.appointmentModel.countDocuments(apptScope),
            this.appointmentModel.aggregate([
                { $match: apptScope },
                { $group: { _id: { $ifNull: ['$status', '$state'] }, n: { $sum: 1 } } },
            ]),
            this.appointmentModel
                .find(apptScope, { id: 1, type: 1, status: 1, state: 1, slot_start: 1, createdAt: 1, price: 1, fee: 1 })
                .sort({ createdAt: -1 }).limit(20).lean(),
            this.emergencyModel.countDocuments({ patient_id: user.id }),
            this.emergencyModel
                .find({ patient_id: user.id }, { id: 1, state: 1, location: 1, createdAt: 1 })
                .sort({ createdAt: -1 }).limit(10).lean(),
            this.deltaModel
                .find({ providerId: user._id })
                .sort({ createdAt: -1 }).limit(10).lean(),
            providerAccountId
                ? db.collection('provider_requests')
                    .find(periodFilter({ provider_account_id: providerAccountId }), { projection: { _id: 0, id: 1, type: 1, status: 1, summary_ar: 1, amount_total: 1, currency: 1, createdAt: 1 } })
                    .sort({ createdAt: -1 }).limit(20).toArray().catch(() => [])
                : Promise.resolve([]),
            providerAccountId
                ? db.collection('provider_requests').aggregate([
                    { $match: periodFilter({ provider_account_id: providerAccountId }) },
                    { $group: { _id: '$status', n: { $sum: 1 } } },
                ]).toArray().catch(() => [])
                : Promise.resolve([]),
            !isProvider
                ? db.collection('family_groups').findOne({ 'members.user_id': user.id }, { projection: { _id: 0, name: 1, members: 1 } }).catch(() => null)
                : Promise.resolve(null),
        ]);
        return {
            user: {
                id: user.id, full_name: user.full_name, email: user.email, phone: user.phone,
                role: user.role, active: user.active !== false, suspended: !!user.suspended,
                verified: !!user.verified, is_guest: !!user.is_guest,
                city: user.city, specialty: user.specialty, license_number: user.license_number,
                years_experience: user.years_experience, consultation_fee: user.consultation_fee,
                createdAt: user.createdAt, last_login_at: user.last_login_at,
            },
            devices: {
                registered_count: Array.isArray(user.device_tokens) ? user.device_tokens.length : 0,
                last_login_at: user.last_login_at || null,
            },
            activity: {
                period_days: days,
                appointments_total: apptCount,
                appointments_by_status: Object.fromEntries(apptByStatus.map((r) => [String(r._id || 'unknown'), r.n])),
                sos_total: sosCount,
                recent_appointments: recentAppts,
                recent_sos: recentSos,
                provider_requests_total: providerRequests.length,
                provider_requests_by_status: Object.fromEntries(providerReqByStatus.map((r) => [String(r._id || 'unknown'), r.n])),
                recent_provider_requests: providerRequests,
            },
            family: family ? { group_name: family.name || null, members: (family.members || []).map((m) => ({ user_id: m.user_id, name: m.name || m.full_name || null, relation: m.relation || m.role || null })) } : null,
            provider_status: providerProfile?.status || null,
            profile_changes: deltas.map((d) => ({
                id: d.id || d._id,
                status: d.status,
                old_data: d.oldData,
                new_data: d.newData,
                reviewed_at: d.reviewedAt,
                rejection_reason: d.rejectionReason,
                created_at: d.createdAt,
            })),
        };
    }
    async listDisputes(status = 'open') {
        throw new common_1.ServiceUnavailableException('admin dispute queue is unavailable pending approved case, evidence, financial-reconciliation and maker-checker workflow');
    }
    async listUsers(page = '1', limit = '50', role, q, sort) {
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(200, Math.max(1, parseInt(limit, 10) || 50));
        const filter = {};
        if (role)
            filter.role = role;
        if (q?.trim()) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ full_name: rx }, { phone: rx }, { email: rx }];
        }
        const sortMap = {
            activity: { last_login_at: -1, createdAt: -1 },
            newest: { createdAt: -1 },
            oldest: { createdAt: 1 },
            name: { full_name: 1 },
        };
        const [items, total] = await Promise.all([
            this.userModel
                .find(filter, { password_hash: 0, otp_codes: 0 })
                .sort(sortMap[sort || ''] || sortMap.newest)
                .skip((p - 1) * l)
                .limit(l)
                .lean(),
            this.userModel.countDocuments(filter),
        ]);
        const nonPatient = items.filter((u) => u.role && !['patient', 'guest', 'admin', 'super_admin'].includes(u.role));
        let providerStatusMap = new Map();
        if (nonPatient.length) {
            const ids = nonPatient.map((u) => u.id);
            const db = this.userModel.db;
            const profiles = await db.collection('provider_profiles')
                .find({ user_id: { $in: ids } }, { projection: { user_id: 1, account_id: 1, status: 1 } }).toArray().catch(() => []);
            const accountIds = profiles.map((p2) => p2.account_id).filter(Boolean);
            const accounts = accountIds.length
                ? await db.collection('provider_accounts').find({ id: { $in: accountIds } }, { projection: { id: 1, status: 1 } }).toArray().catch(() => [])
                : [];
            const accountStatus = new Map(accounts.map((a) => [a.id, a.status]));
            for (const p2 of profiles) {
                providerStatusMap.set(p2.user_id, accountStatus.get(p2.account_id) || p2.status);
            }
        }
        const enriched = items.map((u) => ({ ...u, provider_status: providerStatusMap.get(u.id) || null }));
        return { data: enriched, total, page: p, pages: Math.ceil(total / l) };
    }
    async userStats() {
        const rows = await this.userModel.aggregate([
            { $group: { _id: '$role', count: { $sum: 1 } } },
        ]);
        const byRole = {};
        for (const r of rows)
            byRole[r._id || 'unknown'] = r.count;
        return { byRole, total: rows.reduce((a, r) => a + r.count, 0) };
    }
    assertOwner(user, dbUser) {
        const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
        const email = (dbUser?.email || user?.email || '').trim().toLowerCase();
        if (email !== designated)
            throw new common_1.ForbiddenException('owner_only');
    }
    async resolveUser(jwtUser) {
        return this.userModel.findOne({ id: jwtUser?.id }).lean();
    }
    async listSubAdmins(by) {
        this.assertOwner(by, await this.resolveUser(by));
        const admins = await this.userModel
            .find({ role: { $in: [enums_1.UserRole.ADMIN, enums_1.UserRole.SUPER_ADMIN] } }, { password_hash: 0 })
            .sort({ createdAt: -1 })
            .lean();
        const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
        return admins.map((a) => ({
            id: a.id, full_name: a.full_name, email: a.email, phone: a.phone,
            role: a.role, permissions: a.permissions || [],
            is_owner: (a.email || '').trim().toLowerCase() === designated,
            active: a.active !== false, createdAt: a.createdAt, last_login_at: a.last_login_at,
        }));
    }
    async createSubAdmin(by, body) {
        this.assertOwner(by, await this.resolveUser(by));
        const email = (body?.email || '').trim().toLowerCase();
        const name = (body?.full_name || '').trim();
        if (!email || !email.includes('@'))
            throw new common_1.BadRequestException('valid_email_required');
        if (!name)
            throw new common_1.BadRequestException('full_name_required');
        const exists = await this.userModel.findOne({ email });
        if (exists)
            throw new common_1.BadRequestException('email_already_registered');
        const password = body?.password && String(body.password).length >= 8
            ? String(body.password)
            : (0, crypto_1.randomBytes)(9).toString('base64url') + '@1';
        const permissions = Array.isArray(body?.permissions)
            ? body.permissions.filter((p) => typeof p === 'string').slice(0, 64)
            : [];
        const doc = await this.userModel.create({
            full_name: name,
            email,
            phone: body?.phone || undefined,
            password_hash: await bcrypt.hash(password, 12),
            role: enums_1.UserRole.ADMIN,
            permissions,
            active: true,
            is_guest: false,
        });
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: doc.id, action: 'sub_admin_created' });
        }
        catch { }
        return { ok: true, id: doc.id, email, initial_password: body?.password ? undefined : password };
    }
    async updateSubAdmin(by, userId, body) {
        this.assertOwner(by, await this.resolveUser(by));
        const target = await this.userModel.findOne({ id: userId });
        if (!target)
            throw new common_1.BadRequestException('user_not_found');
        if (target.role !== enums_1.UserRole.ADMIN && target.role !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.BadRequestException('not_an_admin');
        }
        const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
        if ((target.email || '').trim().toLowerCase() === designated) {
            throw new common_1.BadRequestException('cannot_modify_owner');
        }
        if (Array.isArray(body?.permissions)) {
            target.permissions = body.permissions.filter((p) => typeof p === 'string').slice(0, 64);
        }
        if (body?.active !== undefined)
            target.active = !!body.active;
        await target.save();
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: userId, action: 'sub_admin_updated' });
        }
        catch { }
        return { ok: true };
    }
    async deleteSubAdmin(by, userId) {
        this.assertOwner(by, await this.resolveUser(by));
        const target = await this.userModel.findOne({ id: userId });
        if (!target)
            throw new common_1.BadRequestException('user_not_found');
        const designated = (process.env.ADMIN_PASSKEY_EMAIL || 'Obaid08642@gmail.com').trim().toLowerCase();
        if ((target.email || '').trim().toLowerCase() === designated) {
            throw new common_1.BadRequestException('cannot_modify_owner');
        }
        if (target.role !== enums_1.UserRole.ADMIN && target.role !== enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.BadRequestException('not_an_admin');
        }
        await this.userModel.deleteOne({ id: userId });
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: userId, action: 'sub_admin_deleted' });
        }
        catch { }
        return { ok: true };
    }
    async createProvider(by, body) {
        const role = body?.role;
        if (!PROVIDER_CREATABLE_ROLES.includes(role))
            throw new common_1.BadRequestException('invalid_provider_role');
        const name = (body?.full_name || '').trim();
        if (!name)
            throw new common_1.BadRequestException('full_name_required');
        const email = (body?.email || '').trim().toLowerCase() || undefined;
        const phone = (body?.phone || '').trim() || undefined;
        if (!email && !phone)
            throw new common_1.BadRequestException('email_or_phone_required');
        if (email && await this.userModel.findOne({ email }))
            throw new common_1.BadRequestException('email_already_registered');
        if (phone && await this.userModel.findOne({ phone }))
            throw new common_1.BadRequestException('phone_already_registered');
        const password = body?.password && String(body.password).length >= 8
            ? String(body.password)
            : (0, crypto_1.randomBytes)(9).toString('base64url') + '@1';
        const doc = await this.userModel.create({
            full_name: name,
            email,
            phone,
            password_hash: await bcrypt.hash(password, 12),
            role,
            specialty: body?.specialty || undefined,
            license_number: body?.license_number || undefined,
            city: body?.city || undefined,
            verified: false,
            suspended: false,
            active: true,
            is_guest: false,
        });
        try {
            this.events?.emit('admin.provider_created', { admin_id: by?.id, provider_id: doc.id, role });
        }
        catch { }
        return { ok: true, id: doc.id, role, email, phone, initial_password: body?.password ? undefined : password };
    }
    async banUser(userId, by) {
        const user = await this.userModel.findOne({ id: userId }).exec()
            || await this.userModel.findById(userId).catch(() => null);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        if (user.role === enums_1.UserRole.ADMIN || user.role === enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.BadRequestException('cannot_ban_admin');
        }
        user.active = false;
        user.suspended = true;
        await user.save();
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: user.id || userId, action: 'ban' });
        }
        catch { }
        return { ok: true, message: 'user_banned' };
    }
    async unbanUser(userId, by) {
        const user = await this.userModel.findOne({ id: userId }).exec()
            || await this.userModel.findById(userId).catch(() => null);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        user.active = true;
        user.suspended = false;
        await user.save();
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: user.id || userId, action: 'unban' });
        }
        catch { }
        return { ok: true, message: 'user_unbanned' };
    }
    async deleteUser(userId, by) {
        const user = await this.userModel.findOne({ id: userId }).exec()
            || await this.userModel.findById(userId).catch(() => null);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        if (user.role === enums_1.UserRole.ADMIN || user.role === enums_1.UserRole.SUPER_ADMIN) {
            throw new common_1.BadRequestException('cannot_delete_admin');
        }
        const uid = user.id;
        const db = this.userModel.db;
        const ownedCollections = [
            { name: 'patients', fields: ['user_id'] },
            { name: 'provider_profiles', fields: ['user_id'] },
            { name: 'carts', fields: ['user_id', 'patient_id'] },
            { name: 'pushtokens', fields: ['user_id'] },
            { name: 'notifications', fields: ['user_id'] },
            { name: 'notificationpreferences', fields: ['user_id'] },
            { name: 'wallets', fields: ['user_id'] },
            { name: 'familymembers', fields: ['user_id', 'member_user_id', 'owner_id'] },
            { name: 'healthmedications', fields: ['user_id'] },
            { name: 'wearabledevices', fields: ['user_id'] },
            { name: 'medicationreminders', fields: ['user_id'] },
            { name: 'provider_contracts', fields: ['user_id'] },
        ];
        for (const c of ownedCollections) {
            try {
                await db.collection(c.name).deleteMany({ $or: c.fields.map((f) => ({ [f]: uid })) });
            }
            catch { }
        }
        await this.userModel.deleteOne({ _id: user._id });
        try {
            this.events?.emit('admin.user_updated', { admin_id: by?.id, target_user_id: uid, action: 'permanent_delete' });
        }
        catch { }
        return { ok: true, message: 'user_deleted_permanently' };
    }
    async approveProvider(userId, by) {
        const user = await this.userModel.findById(userId);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        if (![enums_1.UserRole.DOCTOR, enums_1.UserRole.PHARMACY].includes(user.role)) {
            throw new common_1.BadRequestException('user_not_a_provider');
        }
        user.verified = true;
        await user.save();
        try {
            this.events?.emit('admin.provider_approved', { admin_id: by?.id, provider_id: user.id || userId });
        }
        catch { }
        return { ok: true, message: 'provider_verified' };
    }
    async suspendProvider(userId, by) {
        const user = await this.userModel.findById(userId);
        if (!user)
            throw new common_1.BadRequestException('user_not_found');
        user.suspended = true;
        user.verified = false;
        await user.save();
        try {
            this.events?.emit('admin.provider_rejected', { admin_id: by?.id, provider_id: user.id || userId, action: 'suspend' });
        }
        catch { }
        return { ok: true, message: 'provider_suspended' };
    }
    async getPendingDeltas() {
        const deltas = await this.deltaModel.find({ status: 'pending' }).exec();
        return deltas;
    }
    async approveDelta(deltaId) {
        const delta = await this.deltaModel.findById(deltaId);
        if (!delta)
            throw new common_1.BadRequestException('delta_not_found');
        delta.status = 'approved';
        await delta.save();
        return { ok: true, message: 'delta_approved' };
    }
    async rejectDelta(deltaId) {
        const delta = await this.deltaModel.findById(deltaId);
        if (!delta)
            throw new common_1.BadRequestException('delta_not_found');
        delta.status = 'rejected';
        await delta.save();
        return { ok: true, message: 'delta_rejected' };
    }
};
exports.AdminController = AdminController;
__decorate([
    (0, common_1.Get)('referrals/report'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "referralReport", null);
__decorate([
    (0, common_1.Get)('loyalty/overview'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "loyaltyOverview", null);
__decorate([
    (0, common_1.Get)('users/:userId/overview'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "userOverview", null);
__decorate([
    (0, common_1.Get)('disputes'),
    __param(0, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listDisputes", null);
__decorate([
    (0, common_1.Get)('users'),
    __param(0, (0, common_1.Query)('page')),
    __param(1, (0, common_1.Query)('limit')),
    __param(2, (0, common_1.Query)('role')),
    __param(3, (0, common_1.Query)('q')),
    __param(4, (0, common_1.Query)('sort')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listUsers", null);
__decorate([
    (0, common_1.Get)('users/stats'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "userStats", null);
__decorate([
    (0, common_1.Get)('sub-admins'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "listSubAdmins", null);
__decorate([
    (0, common_1.Post)('sub-admins'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createSubAdmin", null);
__decorate([
    (0, common_1.Patch)('sub-admins/:userId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "updateSubAdmin", null);
__decorate([
    (0, common_1.Delete)('sub-admins/:userId'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteSubAdmin", null);
__decorate([
    (0, common_1.Post)('providers/create'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "createProvider", null);
__decorate([
    (0, common_1.Post)('users/:userId/ban'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "banUser", null);
__decorate([
    (0, common_1.Post)('users/:userId/unban'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "unbanUser", null);
__decorate([
    (0, common_1.Delete)('users/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "deleteUser", null);
__decorate([
    (0, common_1.Post)('approve/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveProvider", null);
__decorate([
    (0, common_1.Post)('suspend/:userId'),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "suspendProvider", null);
__decorate([
    (0, common_1.Post)('provider-deltas'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "getPendingDeltas", null);
__decorate([
    (0, common_1.Post)('provider-deltas/:deltaId/approve'),
    __param(0, (0, common_1.Param)('deltaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "approveDelta", null);
__decorate([
    (0, common_1.Post)('provider-deltas/:deltaId/reject'),
    __param(0, (0, common_1.Param)('deltaId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminController.prototype, "rejectDelta", null);
exports.AdminController = AdminController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectModel)(user_schema_1.User.name)),
    __param(1, (0, mongoose_1.InjectModel)(provider_delta_schema_1.ProviderDelta.name)),
    __param(2, (0, mongoose_1.InjectModel)('Appointment')),
    __param(3, (0, mongoose_1.InjectModel)('EmergencyRequest')),
    __param(4, (0, mongoose_1.InjectConnection)()),
    __param(5, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], AdminController);
//# sourceMappingURL=admin.controller.js.map