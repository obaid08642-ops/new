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
var UsersService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersService = void 0;
const common_1 = require("@nestjs/common");
const event_emitter_1 = require("@nestjs/event-emitter");
const jwt_1 = require("@nestjs/jwt");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const bcrypt = __importStar(require("bcryptjs"));
const user_repository_1 = require("./repositories/user.repository");
const patient_profile_repository_1 = require("./repositories/patient-profile.repository");
const provider_profile_repository_1 = require("./repositories/provider-profile.repository");
const redis_service_1 = require("../redis/redis.service");
const crypto_1 = require("crypto");
let UsersService = UsersService_1 = class UsersService {
    constructor(userRepository, patientRepository, providerRepository, conn, redisService, events) {
        this.userRepository = userRepository;
        this.patientRepository = patientRepository;
        this.providerRepository = providerRepository;
        this.conn = conn;
        this.redisService = redisService;
        this.events = events;
    }
    async getWishlist(userId) {
        const profile = await this.patientRepository.findOne({ user_id: userId });
        return profile?.wishlist || [];
    }
    async toggleWishlist(userId, itemId) {
        const profile = await this.patientRepository.findOne({ user_id: userId });
        if (!profile)
            return { ok: false };
        const idx = (profile.wishlist || []).findIndex((i) => i.id === itemId);
        if (idx >= 0) {
            profile.wishlist.splice(idx, 1);
        }
        else {
            if (!profile.wishlist)
                profile.wishlist = [];
            profile.wishlist.push({ id: itemId });
        }
        await this.patientRepository.updateOne({ user_id: userId }, { $set: { wishlist: profile.wishlist } });
        return { ok: true, message: 'Wishlist toggled' };
    }
    listAll(role, search) {
        const q = {};
        if (role)
            q.role = role;
        if (search)
            q.$or = [{ full_name: { $regex: search, $options: 'i' } }, { phone: { $regex: search, $options: 'i' } }];
        return this.userRepository.find(q, { _id: 0, password_hash: 0, __v: 0 }, { sort: { createdAt: -1 }, limit: 500 });
    }
    async getPatientProfile(user_id) {
        let p = await this.patientRepository.findOne({ user_id }, { _id: 0, __v: 0 });
        if (!p)
            p = await this.patientRepository.create({ user_id });
        const o = typeof p.toObject === 'function' ? p.toObject() : p;
        return { ...o, chronic_conditions: o.chronic_diseases || [] };
    }
    async userForPatientContract(userId) {
        const user = await this.userRepository.findOne({ id: userId });
        if (!user)
            throw new common_1.NotFoundException('user_not_found');
        return user;
    }
    memberSince(user) {
        const value = user?.createdAt || user?.created_at;
        return value ? new Date(value).toISOString() : null;
    }
    async ensureHealthId(user) {
        if (user.health_id)
            return String(user.health_id);
        const healthId = `HP-${(0, crypto_1.randomUUID)()}`;
        await this.userRepository.updateOne({ id: user.id }, { $set: { health_id: healthId } });
        user.health_id = healthId;
        return healthId;
    }
    async getPatientDisplay(userId) {
        const user = await this.userForPatientContract(userId);
        const healthId = await this.ensureHealthId(user);
        return {
            display_name: String(user.full_name || ''),
            avatar_url: user.avatar && String(user.avatar).startsWith('https://') ? user.avatar : null,
            locale: user.preferred_lang || 'ar',
            member_since: this.memberSince(user),
            health_id: healthId,
        };
    }
    async updatePatientWebProfile(userId, body) {
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new common_1.BadRequestException('invalid_profile_payload');
        const allowed = new Set(['display_name', 'avatar_media_id', 'locale', 'gender', 'birth_date', 'height_cm', 'weight_kg', 'blood_type']);
        for (const key of Object.keys(body)) {
            if (!allowed.has(key) || key.includes('.') || key.startsWith('$')) {
                throw new common_1.BadRequestException('profile_field_not_allowed');
            }
        }
        const user = await this.userForPatientContract(userId);
        const userPatch = {};
        const profilePatch = {};
        if (body.display_name !== undefined) {
            const displayName = String(body.display_name).trim();
            if (!displayName || displayName.length > 160)
                throw new common_1.BadRequestException('invalid_display_name');
            userPatch.full_name = displayName;
        }
        if (body.locale !== undefined) {
            const locale = String(body.locale);
            if (!['ar', 'en', 'ur', 'hi', 'bn', 'fil'].includes(locale))
                throw new common_1.BadRequestException('invalid_locale');
            userPatch.preferred_lang = locale;
        }
        if (body.avatar_media_id !== undefined) {
            const mediaId = String(body.avatar_media_id).trim();
            const media = await this.conn.db.collection('storage_objects').findOne({ id: mediaId, owner_account_id: userId });
            if (!media?.public_url || !String(media.public_url).startsWith('https://'))
                throw new common_1.BadRequestException('avatar_media_not_owned');
            userPatch.avatar = String(media.public_url);
        }
        if (body.gender !== undefined)
            profilePatch.gender = body.gender;
        if (body.birth_date !== undefined)
            profilePatch.date_of_birth = body.birth_date;
        if (body.height_cm !== undefined)
            profilePatch.height_cm = body.height_cm;
        if (body.weight_kg !== undefined)
            profilePatch.weight_kg = body.weight_kg;
        if (body.blood_type !== undefined)
            profilePatch.blood_type = body.blood_type;
        if (Object.keys(userPatch).length)
            await this.userRepository.updateOne({ id: userId }, { $set: userPatch });
        if (Object.keys(profilePatch).length)
            await this.patientRepository.updateOne({ user_id: userId }, { $set: profilePatch }, { upsert: true });
        return this.getPatientDisplay(userId);
    }
    async getHealthId(userId) {
        const user = await this.userForPatientContract(userId);
        const healthId = await this.ensureHealthId(user);
        const secret = process.env.JWT_SECRET;
        if (!secret)
            throw new common_1.BadRequestException('health_id_signing_unavailable');
        const qrPayload = new jwt_1.JwtService({ secret }).sign({ sub: userId, health_id: healthId, purpose: 'health_id' }, { expiresIn: '5m' });
        return { health_id: healthId, qr_payload: qrPayload, issued_at: new Date().toISOString() };
    }
    async updatePatientProfile(user_id, data) {
        const mapped = {};
        for (const [k, v] of Object.entries(data || {})) {
            if (k === 'chronic_conditions') {
                mapped.chronic_diseases = v;
                continue;
            }
            if (k.startsWith('$') || k.includes('.'))
                continue;
            if (UsersService_1.PATIENT_PROFILE_EDITABLE.has(k))
                mapped[k] = v;
        }
        return this.patientRepository.updateOne({ user_id }, { $set: mapped }, { upsert: true, new: true, projection: { _id: 0, __v: 0 } });
    }
    async getSetting(id, key, defaults) {
        const p = await this.patientRepository.findOne({ user_id: id }, { [key]: 1 });
        return p?.[key] ?? defaults;
    }
    async setSetting(id, key, body) {
        const clean = (body && typeof body === 'object') ? body : {};
        await this.patientRepository.updateOne({ user_id: id }, { $set: { [key]: clean } }, { upsert: true });
        return clean;
    }
    notificationDefaults() {
        return {
            channels: { push: true, email: false, sms: true },
            categories: { appointments: true, orders: true, health: true, chat: true, account: true, marketing: false },
        };
    }
    normalizeNotificationSettings(value) {
        const defaults = this.notificationDefaults();
        const source = value && typeof value === 'object' && !Array.isArray(value) ? value : {};
        const sourceChannels = source.channels && typeof source.channels === 'object' ? source.channels : source;
        const sourceCategories = source.categories && typeof source.categories === 'object' ? source.categories : {};
        const channels = { ...defaults.channels };
        const categories = { ...defaults.categories };
        for (const key of UsersService_1.NOTIFICATION_CHANNELS)
            if (typeof sourceChannels[key] === 'boolean')
                channels[key] = sourceChannels[key];
        for (const key of UsersService_1.NOTIFICATION_CATEGORIES)
            if (typeof sourceCategories[key] === 'boolean')
                categories[key] = sourceCategories[key];
        return { channels, categories };
    }
    validateNotificationPatch(body) {
        if (!body || typeof body !== 'object' || Array.isArray(body))
            throw new common_1.BadRequestException('invalid_notification_settings');
        const allowedTopLevel = new Set(['channels', 'categories']);
        for (const key of Object.keys(body)) {
            if (!allowedTopLevel.has(key) || key.includes('.') || key.startsWith('$'))
                throw new common_1.BadRequestException('notification_setting_not_allowed');
        }
        const clean = {};
        const validateGroup = (name, keys) => {
            if (body[name] === undefined)
                return;
            if (!body[name] || typeof body[name] !== 'object' || Array.isArray(body[name]))
                throw new common_1.BadRequestException(`invalid_notification_${name}`);
            clean[name] = {};
            for (const [key, value] of Object.entries(body[name])) {
                if (!keys.includes(key) || typeof value !== 'boolean' || key.includes('.') || key.startsWith('$')) {
                    throw new common_1.BadRequestException('notification_setting_not_allowed');
                }
                clean[name][key] = value;
            }
        };
        validateGroup('channels', UsersService_1.NOTIFICATION_CHANNELS);
        validateGroup('categories', UsersService_1.NOTIFICATION_CATEGORIES);
        if (!clean.channels && !clean.categories)
            throw new common_1.BadRequestException('notification_settings_empty');
        return clean;
    }
    async getNotificationSettings(id) {
        const stored = await this.getSetting(id, 'notification_settings', null);
        return this.normalizeNotificationSettings(stored);
    }
    async updateNotificationSettings(id, body) {
        const patch = this.validateNotificationPatch(body);
        const current = await this.getNotificationSettings(id);
        const next = {
            channels: { ...current.channels, ...(patch.channels || {}) },
            categories: { ...current.categories, ...(patch.categories || {}) },
        };
        await this.patientRepository.updateOne({ user_id: id }, { $set: { notification_settings: next } }, { upsert: true });
        return next;
    }
    async getStorageDetails(id) {
        const LIMIT_GB = 5;
        const sumBase64 = async (collection, match, field) => {
            try {
                const rows = await this.conn.db.collection(collection).aggregate([
                    { $match: { ...match, [field]: { $type: 'string', $ne: '' } } },
                    { $group: { _id: null, total: { $sum: { $strLenBytes: `$${field}` } } } },
                ]).toArray();
                return rows.length ? (rows[0].total * 3) / 4 : 0;
            }
            catch {
                return 0;
            }
        };
        const prescBytes = await sumBase64('prescriptions', { patient_id: id }, 'upload_image');
        let reportBytes = 0;
        try {
            const rows = await this.conn.db.collection('medicalreports').aggregate([
                { $match: { patient_id: id } },
                { $unwind: '$attachments' },
                { $match: { 'attachments.base64': { $type: 'string' } } },
                { $group: { _id: null, total: { $sum: { $strLenBytes: '$attachments.base64' } } } },
            ]).toArray();
            reportBytes = rows.length ? (rows[0].total * 3) / 4 : 0;
        }
        catch { }
        const usedBytes = prescBytes + reportBytes;
        const fmt = (b) => b >= 1073741824 ? `${(b / 1073741824).toFixed(1)} GB` : `${(b / 1048576).toFixed(1)} MB`;
        const limitBytes = LIMIT_GB * 1073741824;
        const pct = (b) => Math.min(100, Math.round((b / limitBytes) * 100));
        return {
            used: fmt(usedBytes),
            total: `${LIMIT_GB} GB`,
            limit: LIMIT_GB,
            items: [
                { label: 'الوصفات المرفوعة', val: fmt(prescBytes), pct: pct(prescBytes), color: '#23B5CE' },
                { label: 'التقارير الطبية', val: fmt(reportBytes), pct: pct(reportBytes), color: '#7A6BEA' },
            ],
        };
    }
    async getPrivacySettings(id) {
        return this.getSetting(id, 'privacy_settings', { profile_visible: true, share_data: false });
    }
    async updatePrivacySettings(id, body) {
        return this.setSetting(id, 'privacy_settings', body);
    }
    async getSecuritySettings(id) {
        return this.getSetting(id, 'security_settings', { biometric: false, two_factor: false });
    }
    async updateSecuritySettings(id, body) {
        return this.setSetting(id, 'security_settings', body);
    }
    async changePassword(id, body) {
        const current = String(body?.current_password || '');
        const next = String(body?.new_password || '');
        if (next.length < 8)
            throw new common_1.BadRequestException('كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل');
        const u = await this.userRepository.findOne({ id });
        if (!u)
            throw new common_1.NotFoundException();
        if (u.password_hash) {
            const ok = await bcrypt.compare(current, u.password_hash);
            if (!ok)
                throw new common_1.UnauthorizedException('كلمة المرور الحالية غير صحيحة');
        }
        const hash = await bcrypt.hash(next, 12);
        await this.userRepository.updateOne({ id }, { $set: { password_hash: hash } });
        return { success: true };
    }
    async getSessions(id) {
        try {
            const client = this.redisService.getClient?.();
            if (!client)
                return [];
            const jtis = await client.smembers(`refresh_user:${id}`);
            const sessions = [];
            for (const jti of jtis || []) {
                const raw = await client.get(`refresh:${jti}`);
                if (!raw)
                    continue;
                let device = null;
                try {
                    device = JSON.parse(raw)?.d ?? null;
                }
                catch { }
                const ttl = await client.ttl(`refresh:${jti}`);
                sessions.push({ id: jti, device, expires_in_seconds: ttl });
            }
            return sessions;
        }
        catch {
            return [];
        }
    }
    async revokeSession(id, jti) {
        const client = this.redisService.getClient?.();
        if (!client)
            throw new common_1.BadRequestException('sessions unavailable');
        const isMember = await client.sismember(`refresh_user:${id}`, jti);
        if (!isMember)
            throw new common_1.NotFoundException('session not found');
        await client.del(`refresh:${jti}`);
        await client.srem(`refresh_user:${id}`, jti);
        return { ok: true };
    }
    async toggle(user_id, by) {
        const u = await this.userRepository.findOne({ id: user_id });
        if (!u)
            throw new common_1.NotFoundException();
        if (u.id === by.id)
            throw new common_1.ForbiddenException('Cannot toggle yourself');
        u.active = !u.active;
        await this.userRepository.updateOne({ id: user_id }, { $set: { active: u.active } });
        return { ok: true, active: u.active };
    }
    async deleteUser(user_id, by) {
        if (user_id === by.id)
            throw new common_1.ForbiddenException('Cannot delete yourself');
        const target = await this.userRepository.findOne({ id: user_id });
        try {
            this.events?.emit('admin.user_deleted', {
                admin_id: by?.id,
                target_user_id: user_id,
                role: target?.role,
                phone_tail: target?.phone ? String(target.phone).slice(-4) : undefined,
            });
        }
        catch { }
        await this.userRepository.deleteOne({ id: user_id });
        return { ok: true };
    }
};
exports.UsersService = UsersService;
UsersService.PATIENT_PROFILE_EDITABLE = new Set([
    'full_name', 'date_of_birth', 'dob', 'gender', 'height_cm', 'weight_kg', 'height', 'weight',
    'blood_type', 'phone', 'email',
    'chronic_diseases', 'allergies', 'current_medications', 'emergency_contacts',
    'addresses', 'preferred_lang', 'avatar_url', 'national_id', 'marital_status',
    'occupation', 'smoking_status', 'notes',
]);
UsersService.NOTIFICATION_CHANNELS = ['push', 'email', 'sms'];
UsersService.NOTIFICATION_CATEGORIES = ['appointments', 'orders', 'health', 'chat', 'account', 'marketing'];
exports.UsersService = UsersService = UsersService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UserRepository')),
    __param(1, (0, common_1.Inject)('PatientProfileRepository')),
    __param(2, (0, common_1.Inject)('ProviderProfileRepository')),
    __param(3, (0, mongoose_1.InjectConnection)()),
    __param(5, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        patient_profile_repository_1.PatientProfileRepository,
        provider_profile_repository_1.ProviderProfileRepository,
        mongoose_2.Connection,
        redis_service_1.RedisService,
        event_emitter_1.EventEmitter2])
], UsersService);
//# sourceMappingURL=users.service.js.map