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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const bcrypt = __importStar(require("bcryptjs"));
const common_2 = require("@nestjs/common");
const push_module_1 = require("../push/push.module");
const mail_module_1 = require("../mail/mail.module");
const sms_service_1 = require("../sms/sms.service");
const event_emitter_1 = require("@nestjs/event-emitter");
const enums_1 = require("../../common/enums");
const events_1 = require("../../common/events");
const user_repository_1 = require("./repositories/user.repository");
const patientprofile_repository_1 = require("./repositories/patientprofile.repository");
const redis_service_1 = require("../redis/redis.service");
const passkey_service_1 = require("./passkey.service");
const device_trust_service_1 = require("./device-trust.service");
let AuthService = AuthService_1 = class AuthService {
    constructor(userModel, patientModel, jwt, events, redisService, passkeys, deviceTrust, push, mail, sms) {
        this.userModel = userModel;
        this.patientModel = patientModel;
        this.jwt = jwt;
        this.events = events;
        this.redisService = redisService;
        this.passkeys = passkeys;
        this.deviceTrust = deviceTrust;
        this.push = push;
        this.mail = mail;
        this.sms = sms;
        this.OTP_TTL_SECONDS = 5 * 60;
        this.OTP_MAX_VERIFY_ATTEMPTS = 5;
        this.PATIENT_OTP_TTL_SECONDS = 5 * 60;
        this.PATIENT_EXCHANGE_TTL_SECONDS = 60;
        this.PATIENT_OTP_LOCK_TTL_SECONDS = 15 * 60;
    }
    signToken(user, deviceId) {
        const accessToken = this.jwt.sign({ sub: user.id, id: user.id, role: user.role, phone: user.phone, is_guest: !!user.is_guest, ...(deviceId ? { dev: deviceId.slice(0, 32) } : {}) }, { expiresIn: '1h' });
        const jti = require('crypto').randomUUID();
        const refreshToken = this.jwt.sign({ sub: user.id, type: 'refresh', jti }, { expiresIn: '14d' });
        this.storeRefreshSession(user.id, jti, deviceId).catch(() => { });
        return { accessToken, refreshToken };
    }
    async storeRefreshSession(userId, jti, deviceId) {
        try {
            const client = this.redisService.getClient?.();
            if (!client)
                return;
            await client.set(`refresh:${jti}`, JSON.stringify({ u: userId, d: deviceId || null }), 'EX', 14 * 24 * 3600);
            await client.sadd(`refresh_user:${userId}`, jti);
            await client.expire(`refresh_user:${userId}`, 30 * 24 * 3600);
        }
        catch { }
    }
    async refreshToken(token, deviceId) {
        let payload;
        try {
            payload = this.jwt.verify(token);
        }
        catch {
            throw new common_1.UnauthorizedException('Invalid or expired refresh token');
        }
        if (payload.type !== 'refresh')
            throw new common_1.UnauthorizedException('Invalid token type');
        const client = this.redisService.getClient?.();
        let boundDevice = null;
        if (client && payload.jti) {
            const raw = await client.get(`refresh:${payload.jti}`);
            if (!raw) {
                if (payload.sub)
                    await this.revokeAllUserSessions(payload.sub).catch(() => { });
                throw new common_1.UnauthorizedException('refresh_token_reused_or_revoked');
            }
            try {
                boundDevice = JSON.parse(raw).d || null;
            }
            catch {
                boundDevice = null;
            }
            if (boundDevice && deviceId && boundDevice !== deviceId) {
                if (payload.sub)
                    await this.revokeAllUserSessions(payload.sub).catch(() => { });
                throw new common_1.UnauthorizedException('refresh_token_device_mismatch');
            }
            await client.del(`refresh:${payload.jti}`);
            if (payload.sub)
                await client.srem(`refresh_user:${payload.sub}`, payload.jti);
        }
        const u = await this.userModel.findOne({ id: payload.sub });
        if (!u || u.active === false)
            throw new common_1.UnauthorizedException('User not found or disabled');
        return this.signToken(u, boundDevice || deviceId);
    }
    async revokeAllUserSessions(userId) {
        const client = this.redisService.getClient?.();
        if (!client)
            return { ok: true };
        const jtis = await client.smembers(`refresh_user:${userId}`);
        if (jtis?.length)
            await client.del(...jtis.map((j) => `refresh:${j}`));
        await client.del(`refresh_user:${userId}`);
        return { ok: true, revoked: jtis?.length || 0 };
    }
    async logoutAllDevices(userId) {
        await this.revokeAllUserSessions(userId).catch(() => { });
        this.events.emit('USER_LOGGED_OUT_ALL', { user_id: userId });
        return { ok: true, message: 'Logged out from all devices' };
    }
    async recordComplianceConsent(userId, documentType, version) {
        await this.userModel.updateOne({ id: userId }, { $push: { "legal_consents": { policy_id: documentType, version, accepted_at: new Date() } } });
    }
    static assertString(v, field) {
        if (typeof v !== 'string' || !v.trim())
            throw new common_1.BadRequestException(`invalid ${field}`);
    }
    normalizeOtpIdentifier(identifier) {
        return identifier.trim().toLowerCase();
    }
    otpKey(identifier) {
        return `auth:otp:login-2fa:${this.normalizeOtpIdentifier(identifier)}`;
    }
    otpIssueRateKey(identifier) {
        return `auth:otp:issue:${this.normalizeOtpIdentifier(identifier)}`;
    }
    otpVerifyRateKey(identifier) {
        return `auth:otp:verify:${this.normalizeOtpIdentifier(identifier)}`;
    }
    patientOtpKey(identifier) {
        return `auth:otp:patient:${this.normalizeOtpIdentifier(identifier)}`;
    }
    patientOtpIssueRateKey(identifier) {
        return `auth:otp:patient:issue:${this.normalizeOtpIdentifier(identifier)}`;
    }
    patientOtpVerifyRateKey(identifier) {
        return `auth:otp:patient:verify:${this.normalizeOtpIdentifier(identifier)}`;
    }
    patientOtpLockKey(identifier) {
        return `auth:otp:patient:lock:${this.normalizeOtpIdentifier(identifier)}`;
    }
    patientExchangeKey(token) {
        return `auth:session:exchange:${token}`;
    }
    passwordResetKey(token) {
        return `auth:password:reset:${token}`;
    }
    opaqueOtpResponse(identifier) {
        return {
            otp_sent: true,
            channel: this.normalizeOtpIdentifier(identifier).includes('@') ? 'email' : 'sms',
            expires_in: this.PATIENT_OTP_TTL_SECONDS,
        };
    }
    async requestPatientOtp(identifier) {
        AuthService_1.assertString(identifier, 'identifier');
        const normalized = this.normalizeOtpIdentifier(identifier);
        const rate = await this.redisService.checkRateLimit(this.patientOtpIssueRateKey(normalized), 3, 10 * 60);
        if (!rate.allowed) {
            throw new common_1.HttpException({ message: 'otp_rate_limited', code: 'otp_rate_limited', statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.userModel.findOne(normalized.includes('@') ? { email: normalized } : { phone: normalized });
        if (!user || user.active === false)
            return this.opaqueOtpResponse(normalized);
        const code = require('crypto').randomInt(100000, 1000000).toString();
        await this.redisService.setJson(this.patientOtpKey(normalized), { code_hash: await bcrypt.hash(code, 12), user_id: user.id, attempts: 0 }, this.PATIENT_OTP_TTL_SECONDS);
        try {
            if (normalized.includes('@')) {
                await this.mail?.sendOtp(normalized, code);
            }
            else if (await this.sms?.isEnabled()) {
                await this.sms?.sendOtp(normalized, code);
            }
            else {
                await this.push?.sendToUser(user.id, 'رمز التحقق — نَبْض', `رمز التحقق الخاص بك: ${code}`, { kind: 'patient_web_otp' });
            }
        }
        catch {
        }
        return this.opaqueOtpResponse(normalized);
    }
    async verifyPatientOtp(identifier, code, deviceId) {
        AuthService_1.assertString(identifier, 'identifier');
        if (typeof code !== 'string' || !/^\d{6}$/.test(code)) {
            throw new common_1.UnauthorizedException({ message: 'otp_invalid', code: 'otp_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        const normalized = this.normalizeOtpIdentifier(identifier);
        if (await this.redisService.exists(this.patientOtpLockKey(normalized))) {
            throw new common_1.HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const rate = await this.redisService.checkRateLimit(this.patientOtpVerifyRateKey(normalized), this.OTP_MAX_VERIFY_ATTEMPTS, this.PATIENT_OTP_LOCK_TTL_SECONDS);
        if (!rate.allowed) {
            await this.redisService.set(this.patientOtpLockKey(normalized), '1', this.PATIENT_OTP_LOCK_TTL_SECONDS);
            throw new common_1.HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const key = this.patientOtpKey(normalized);
        const entry = await this.redisService.getJson(key);
        if (!entry?.code_hash || !entry.user_id) {
            throw new common_1.GoneException({ message: 'otp_expired', code: 'otp_expired', statusCode: common_1.HttpStatus.GONE });
        }
        const valid = await bcrypt.compare(code, entry.code_hash);
        if (!valid) {
            const attempts = (entry.attempts || 0) + 1;
            if (attempts >= this.OTP_MAX_VERIFY_ATTEMPTS) {
                await this.redisService.del(key);
                await this.redisService.set(this.patientOtpLockKey(normalized), '1', this.PATIENT_OTP_LOCK_TTL_SECONDS);
                throw new common_1.HttpException({ message: 'otp_locked', code: 'otp_locked', statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS }, common_1.HttpStatus.TOO_MANY_REQUESTS);
            }
            const ttl = await this.redisService.ttl(key);
            await this.redisService.setJson(key, { ...entry, attempts }, ttl > 0 ? ttl : this.PATIENT_OTP_TTL_SECONDS);
            throw new common_1.UnauthorizedException({ message: 'otp_invalid', code: 'otp_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        await this.redisService.del(key);
        await this.redisService.del(`ratelimit:${this.patientOtpVerifyRateKey(normalized)}`);
        const exchangeToken = require('crypto').randomBytes(32).toString('base64url');
        await this.redisService.setJson(this.patientExchangeKey(exchangeToken), { user_id: entry.user_id, device_id: deviceId || null }, this.PATIENT_EXCHANGE_TTL_SECONDS);
        return { exchange_token: exchangeToken, expires_in: this.PATIENT_EXCHANGE_TTL_SECONDS };
    }
    async exchangePatientSession(exchangeToken) {
        AuthService_1.assertString(exchangeToken, 'exchange_token');
        const key = this.patientExchangeKey(exchangeToken);
        const redis = this.redisService.getClient();
        const claimed = await redis.set(`${key}:claim`, '1', 'EX', this.PATIENT_EXCHANGE_TTL_SECONDS, 'NX');
        if (!claimed) {
            throw new common_1.UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        const entry = await this.redisService.getJson(key);
        if (!entry?.user_id) {
            await redis.del(`${key}:claim`);
            throw new common_1.UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        await this.redisService.del(key);
        const user = await this.userModel.findOne({ id: entry.user_id });
        if (!user || user.active === false) {
            throw new common_1.UnauthorizedException({ message: 'exchange_token_invalid', code: 'exchange_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        const tokens = this.signToken(user, entry.device_id || undefined);
        return { access_token: tokens.accessToken, refresh_token: tokens.refreshToken };
    }
    async forgotPatientPassword(identifier) {
        AuthService_1.assertString(identifier, 'identifier');
        const normalized = this.normalizeOtpIdentifier(identifier);
        const rate = await this.redisService.checkRateLimit(`auth:password:forgot:${normalized}`, 3, 10 * 60);
        if (!rate.allowed) {
            throw new common_1.HttpException({ message: 'password_reset_rate_limited', code: 'password_reset_rate_limited', statusCode: common_1.HttpStatus.TOO_MANY_REQUESTS }, common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const user = await this.userModel.findOne(normalized.includes('@') ? { email: normalized } : { phone: normalized });
        if (!user || user.active === false)
            return { requested: true };
        const resetToken = require('crypto').randomBytes(32).toString('base64url');
        await this.redisService.setJson(this.passwordResetKey(resetToken), { user_id: user.id }, this.PATIENT_EXCHANGE_TTL_SECONDS);
        try {
            if (normalized.includes('@')) {
                await this.mail?.send(normalized, 'Password reset', `Your Nabdah Plus password-reset token is ${resetToken}. It expires in 60 seconds.`);
            }
            else if (await this.sms?.isEnabled()) {
                await this.sms?.sendOtp(normalized, resetToken);
            }
        }
        catch {
        }
        return { requested: true };
    }
    async resetPatientPassword(resetToken, newPassword) {
        AuthService_1.assertString(resetToken, 'reset_token');
        AuthService_1.assertString(newPassword, 'new_password');
        if (newPassword.length < 8)
            throw new common_1.BadRequestException({ message: 'password_too_short', code: 'password_too_short', statusCode: common_1.HttpStatus.BAD_REQUEST });
        const key = this.passwordResetKey(resetToken);
        const redis = this.redisService.getClient();
        const claimed = await redis.set(`${key}:claim`, '1', 'EX', this.PATIENT_EXCHANGE_TTL_SECONDS, 'NX');
        if (!claimed)
            throw new common_1.UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        const entry = await this.redisService.getJson(key);
        if (!entry?.user_id) {
            await redis.del(`${key}:claim`);
            throw new common_1.UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        }
        await this.redisService.del(key);
        const user = await this.userModel.findOne({ id: entry.user_id });
        if (!user || user.active === false)
            throw new common_1.UnauthorizedException({ message: 'reset_token_invalid', code: 'reset_token_invalid', statusCode: common_1.HttpStatus.UNAUTHORIZED });
        user.password_hash = await bcrypt.hash(newPassword, 12);
        await user.save();
        await this.revokeAllUserSessions(user.id);
        return { reset: true };
    }
    async registerPatientContract(data) {
        AuthService_1.assertString(data?.name, 'name');
        AuthService_1.assertString(data?.identifier, 'identifier');
        AuthService_1.assertString(data?.password, 'password');
        AuthService_1.assertString(data?.locale, 'locale');
        if (!Array.isArray(data?.consents) || data.consents.length === 0) {
            throw new common_1.BadRequestException({ message: 'consents_required', code: 'consents_required', statusCode: common_1.HttpStatus.BAD_REQUEST });
        }
        const identifier = this.normalizeOtpIdentifier(data.identifier);
        const isEmail = identifier.includes('@');
        const seenPolicies = new Set();
        const consents = data.consents.map((consent) => {
            AuthService_1.assertString(consent?.policy_id, 'consent.policy_id');
            AuthService_1.assertString(consent?.version, 'consent.version');
            const key = `${consent.policy_id}:${consent.version}`;
            if (seenPolicies.has(key)) {
                throw new common_1.BadRequestException({ message: 'duplicate_consent', code: 'duplicate_consent', statusCode: common_1.HttpStatus.BAD_REQUEST });
            }
            seenPolicies.add(key);
            return { policy_id: consent.policy_id.trim(), version: consent.version.trim(), accepted_at: new Date() };
        });
        const existing = await this.userModel.findOne(isEmail ? { email: identifier } : { phone: identifier });
        if (existing) {
            throw new common_1.ConflictException({ message: 'identifier_already_registered', code: 'identifier_already_registered', statusCode: common_1.HttpStatus.CONFLICT });
        }
        const user = await this.userModel.create({
            full_name: data.name.trim(),
            ...(isEmail ? { email: identifier } : { phone: identifier }),
            password_hash: await bcrypt.hash(data.password, 12),
            role: enums_1.UserRole.PATIENT,
            preferred_lang: data.locale.trim(),
            legal_consents: consents,
        });
        await this.patientModel.create({
            user_id: user.id,
            full_name: user.full_name,
            ...(isEmail ? { email: identifier } : { phone: identifier }),
        });
        this.events.emit(events_1.EVENTS.USER_REGISTERED, { user_id: user.id, role: user.role });
        await this.requestPatientOtp(identifier);
        return { registered: true };
    }
    async register(data) {
        if (data.email !== undefined)
            AuthService_1.assertString(data.email, 'email');
        if (data.phone !== undefined)
            AuthService_1.assertString(data.phone, 'phone');
        AuthService_1.assertString(data.password, 'password');
        if (!data.email && !data.phone)
            throw new common_1.BadRequestException('Email or phone is required');
        if (data.phone) {
            const exists = await this.userModel.findOne({ phone: data.phone });
            if (exists)
                throw new common_1.ConflictException('Phone already registered');
        }
        if (data.email) {
            const exists = await this.userModel.findOne({ email: data.email });
            if (exists)
                throw new common_1.ConflictException('Email already registered');
        }
        const hash = await bcrypt.hash(data.password, 12);
        const SELF_REGISTERABLE = [
            enums_1.UserRole.PATIENT, enums_1.UserRole.DOCTOR, enums_1.UserRole.PHARMACY, enums_1.UserRole.HOSPITAL,
            enums_1.UserRole.LAB, enums_1.UserRole.RADIOLOGY, enums_1.UserRole.HOME_CARE, enums_1.UserRole.NURSING,
            enums_1.UserRole.NURSE, enums_1.UserRole.AMBULANCE, enums_1.UserRole.PHYSIOTHERAPIST,
        ];
        const requestedRole = (data.role || enums_1.UserRole.PATIENT);
        if (!SELF_REGISTERABLE.includes(requestedRole)) {
            throw new common_1.BadRequestException('role_not_self_registerable');
        }
        const u = await this.userModel.create({
            full_name: data.full_name,
            phone: data.phone,
            email: data.email,
            password_hash: hash,
            role: requestedRole,
        });
        if (u.role === enums_1.UserRole.PATIENT) {
            await this.patientModel.create({ user_id: u.id });
        }
        this.events.emit(events_1.EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
        return { user: this.publicUser(u), token: this.signToken(u) };
    }
    async login(identifier, password, ctx) {
        AuthService_1.assertString(identifier, 'identifier');
        AuthService_1.assertString(password, 'password');
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
        const u = await this.userModel.findOne(query);
        if (!u || !u.password_hash)
            throw new common_1.UnauthorizedException('Invalid credentials');
        const ok = await bcrypt.compare(password, u.password_hash);
        if (!ok)
            throw new common_1.UnauthorizedException('Invalid credentials');
        if (u.active === false)
            throw new common_1.UnauthorizedException('Account disabled');
        if (u.role === enums_1.UserRole.SUPER_ADMIN || u.role === enums_1.UserRole.ADMIN) {
            if (this.deviceTrust && ctx?.deviceToken) {
                const trusted = await this.deviceTrust.validate(u.id, ctx.deviceToken, ctx.ip);
                if (trusted) {
                    u.last_login_at = new Date();
                    await u.save();
                    this.events.emit(events_1.EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role, method: 'trusted_device' });
                    return {
                        user: this.publicUser(u),
                        token: this.signToken(u),
                        trusted_device: true,
                        device_name: trusted.name,
                    };
                }
            }
            const passkeyEnforced = process.env.ADMIN_PASSKEY_ENFORCED === 'true';
            const designated = passkeyEnforced ? this.passkeys?.designatedEmail : undefined;
            if (designated && (u.email || '').trim().toLowerCase() === designated) {
                const keyCount = await this.passkeys.countCredentials(u.id);
                if (keyCount > 0) {
                    const options = await this.passkeys.startLogin(u);
                    return {
                        requires_passkey: true,
                        identifier: u.email,
                        passkey_options: options,
                        message: 'Passkey verification required.',
                    };
                }
            }
            const contact = this.otpContact(u, identifier);
            await this.sendOtp(contact);
            return {
                requires_2fa: true,
                identifier: contact,
                message: 'OTP sent to your registered contact.'
            };
        }
        u.last_login_at = new Date();
        await u.save();
        this.events.emit(events_1.EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
        return { user: this.publicUser(u), token: this.signToken(u) };
    }
    async verify2fa(identifier, code, ctx) {
        AuthService_1.assertString(identifier, 'identifier');
        AuthService_1.assertString(code, 'code');
        const isEmail = identifier.includes('@');
        const query = isEmail ? { email: identifier.trim().toLowerCase() } : { phone: identifier };
        const u = await this.userModel.findOne(query);
        if (!u)
            throw new common_1.UnauthorizedException('User not found');
        await this.verifyOtp(this.otpContact(u, identifier), code);
        u.last_login_at = new Date();
        await u.save();
        this.events.emit(events_1.EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
        const result = { user: this.publicUser(u), token: this.signToken(u) };
        if (this.deviceTrust && (u.role === enums_1.UserRole.SUPER_ADMIN || u.role === enums_1.UserRole.ADMIN)) {
            const { token, device } = await this.deviceTrust.issue(u.id, ctx?.ua, ctx?.ip);
            result.device_token = token;
            result.device = { id: device.id, name: device.name };
            await this.sendNewDeviceAlert(u, device, ctx?.ip);
        }
        return result;
    }
    async completePasskeyLogin(identifier, response, ctx) {
        AuthService_1.assertString(identifier, 'identifier');
        if (!this.passkeys)
            throw new common_1.UnauthorizedException('passkey_not_available');
        if ((identifier || '').trim().toLowerCase() !== this.passkeys.designatedEmail) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const u = await this.userModel.findOne({ email: identifier.trim().toLowerCase() });
        if (!u || (u.role !== enums_1.UserRole.SUPER_ADMIN && u.role !== enums_1.UserRole.ADMIN)) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (u.active === false)
            throw new common_1.UnauthorizedException('Account disabled');
        const ownerId = await this.passkeys.finishLogin(response);
        if (ownerId !== u.id)
            throw new common_1.UnauthorizedException('Invalid credentials');
        u.last_login_at = new Date();
        await u.save();
        this.events.emit(events_1.EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role, method: 'passkey' });
        const result = { user: this.publicUser(u), token: this.signToken(u) };
        if (this.deviceTrust) {
            const { token, device } = await this.deviceTrust.issue(u.id, ctx?.ua, ctx?.ip);
            result.device_token = token;
            result.device = { id: device.id, name: device.name };
            await this.sendNewDeviceAlert(u, device, ctx?.ip);
        }
        return result;
    }
    async sendNewDeviceAlert(u, device, ip) {
        try {
            const to = (u.email || '').trim();
            if (!to || !this.mail)
                return;
            const when = new Date().toLocaleString('ar-SA', { timeZone: 'Asia/Riyadh' });
            await this.mail.send(to, 'تنبيه أمني: تسجيل دخول من جهاز جديد — نَبْض', `<div dir="rtl" style="font-family:Tahoma,Arial,sans-serif;line-height:1.9">
          <h2 style="color:#0E8FA3">تنبيه أمني — لوحة تحكم نبض</h2>
          <p>تم تسجيل الدخول إلى حساب الأدمن واعتماد جهاز جديد:</p>
          <ul>
            <li><b>الجهاز:</b> ${device?.name || 'غير معروف'}</li>
            <li><b>المتصفح/النظام:</b> ${device?.user_agent || '-'}</li>
            <li><b>عنوان IP:</b> ${ip || '-'}</li>
            <li><b>الوقت:</b> ${when}</li>
          </ul>
          <p>إذا لم يكن هذا أنت، ادخل فورًا إلى <b>الأمان ومفاتيح الدخول</b> واحذف الجهاز وغيّر كلمة المرور.</p>
        </div>`);
        }
        catch (e) {
        }
    }
    async listTrustedDevices(userId) {
        if (!this.deviceTrust)
            return [];
        return this.deviceTrust.list(userId);
    }
    async revokeTrustedDevice(userId, deviceId) {
        if (!this.deviceTrust)
            throw new common_1.BadRequestException('device_trust_unavailable');
        return this.deviceTrust.revoke(userId, deviceId);
    }
    async deviceHeartbeat(userId, deviceToken, ua, ip) {
        if (!this.deviceTrust)
            return { ok: false };
        return this.deviceTrust.heartbeat(userId, deviceToken, ua, ip);
    }
    async onlineDevices(userId) {
        if (!this.deviceTrust)
            return [];
        return this.deviceTrust.onlineSessions(userId);
    }
    async guest(phone, deviceId) {
        const client = this.redisService.getClient?.();
        if (deviceId && client) {
            const existingId = await client.get(`guest_device:${deviceId}`);
            if (existingId) {
                const existing = await this.userModel.findOne({ id: existingId });
                if (existing) {
                    return { user: this.publicUser(existing), token: this.signToken(existing, deviceId) };
                }
            }
        }
        const guestPhone = phone || `guest-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        let u = await this.userModel.findOne({ phone: guestPhone });
        if (!u) {
            u = await this.userModel.create({
                full_name: 'Guest',
                phone: guestPhone,
                is_guest: true,
                role: enums_1.UserRole.PATIENT,
            });
            await this.patientModel.create({ user_id: u.id });
        }
        if (deviceId && client) {
            await client.set(`guest_device:${deviceId}`, u.id, 'EX', 90 * 24 * 3600);
        }
        return { user: this.publicUser(u), token: this.signToken(u, deviceId) };
    }
    async migrateGuestData(fromUserId, toUserId) {
        const collections = [
            { name: 'orders', fields: ['patient_id', 'user_id'] },
            { name: 'carts', fields: ['user_id', 'patient_id'] },
            { name: 'appointments', fields: ['patient_id', 'patient_account_id'] },
            { name: 'pushtokens', fields: ['user_id'] },
            { name: 'pushengagements', fields: ['user_id'] },
            { name: 'notifications', fields: ['user_id'] },
            { name: 'search_queries', fields: ['user_id'] },
            { name: 'product_views', fields: ['user_id'] },
            { name: 'storage_objects', fields: ['owner_account_id'] },
        ];
        for (const c of collections) {
            for (const f of c.fields) {
                try {
                    await this.userModel.db.collection(c.name).updateMany({ [f]: fromUserId }, { $set: { [f]: toUserId } });
                }
                catch { }
            }
        }
        try {
            await this.patientModel.findOneAndUpdate({ user_id: fromUserId }, { $set: { user_id: toUserId } });
        }
        catch { }
    }
    async convertGuest(guestUserId, data) {
        const guestUser = await this.userModel.findOne({ id: guestUserId });
        if (!guestUser) {
            throw new common_1.BadRequestException('Guest user not found');
        }
        if (!guestUser.is_guest) {
            throw new common_1.BadRequestException('User is already fully registered');
        }
        const existsPhone = await this.userModel.findOne({ phone: data.phone });
        if (existsPhone && existsPhone.id !== guestUserId) {
            throw new common_1.ConflictException('Phone already registered');
        }
        let existingUser = guestUser;
        if (data.email) {
            const existsEmail = await this.userModel.findOne({ email: data.email });
            if (existsEmail) {
                if (existsEmail.id !== guestUserId) {
                    await this.migrateGuestData(guestUserId, existsEmail.id);
                    try {
                        await this.patientModel.findOneAndUpdate({ user_id: existsEmail.id }, { $set: { phone: data.phone, full_name: data.full_name } });
                    }
                    catch (err) {
                    }
                    this.events.emit(events_1.EVENTS.USER_GUEST_CONVERTED, { old_id: guestUserId, new_id: existsEmail.id });
                    await this.userModel.deleteOne({ id: guestUserId });
                    existingUser = existsEmail;
                }
            }
        }
        if (existingUser.id === guestUserId) {
            const hash = await bcrypt.hash(data.password, 12);
            existingUser.full_name = data.full_name;
            existingUser.phone = data.phone;
            existingUser.email = data.email;
            existingUser.password_hash = hash;
            existingUser.is_guest = false;
            await existingUser.save();
            this.events.emit(events_1.EVENTS.USER_GUEST_CONVERTED, { user_id: existingUser.id });
        }
        return { user: this.publicUser(existingUser), token: this.signToken(existingUser) };
    }
    async me(userId) {
        const u = await this.userModel.findOne({ id: userId });
        if (!u)
            throw new common_1.UnauthorizedException('User not found');
        return this.publicUser(u);
    }
    publicUser(u) {
        return {
            id: u.id,
            full_name: u.full_name,
            phone: u.phone,
            email: u.email,
            role: u.role,
            avatar_url: u.avatar_url,
            is_guest: u.is_guest,
        };
    }
    async sendOtp(identifier) {
        AuthService_1.assertString(identifier, 'identifier');
        const normalized = this.normalizeOtpIdentifier(identifier);
        const rateLimitKey = this.otpIssueRateKey(normalized);
        const maxAttempts = Number(process.env.OTP_ISSUE_LIMIT || 3);
        const windowSeconds = Number(process.env.OTP_ISSUE_WINDOW_SECONDS || 3600);
        const { allowed } = await this.redisService.checkRateLimit(rateLimitKey, maxAttempts, windowSeconds);
        if (!allowed) {
            throw new common_1.HttpException('Too many OTP requests. Please try again after 1 hour.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const isEmail = normalized.includes('@');
        const u = await this.userModel.findOne(isEmail ? { email: normalized } : { phone: normalized });
        if (!u)
            throw new common_1.UnauthorizedException('User not found');
        const code = require('crypto').randomInt(100000, 1000000).toString();
        await this.redisService.setJson(this.otpKey(normalized), { code_hash: await bcrypt.hash(code, 12), user_id: u.id, attempts: 0 }, this.OTP_TTL_SECONDS);
        try {
            try {
                await this.push?.sendToUser(u.id, 'رمز التحقق — نَبْض', `رمز التحقق الخاص بك: ${code} — صالح لمدة 10 دقائق. لا تشاركه مع أحد.`, { kind: 'otp' });
            }
            catch { }
            if (isEmail) {
                await this.mail?.sendOtp(normalized, code);
            }
            else {
                const smsOn = await this.sms?.isEnabled();
                if (smsOn && process.env.INFOBIP_API_KEY) {
                    await fetch(`https://${process.env.INFOBIP_BASE_URL}/sms/2/text/advanced`, {
                        method: 'POST',
                        headers: {
                            'Authorization': `App ${process.env.INFOBIP_API_KEY}`,
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            messages: [{
                                    destinations: [{ to: normalized }],
                                    from: 'NabdahPlus',
                                    text: `Your Nabdah Plus OTP is ${code}. Expires in 10 mins.`,
                                }]
                        }),
                    });
                }
            }
            if (process.env.NODE_ENV !== 'production' &&
                !process.env.SMTP_HOST &&
                !process.env.INFOBIP_API_KEY) {
                console.warn('No OTP delivery channel configured; OTP was not logged.');
            }
            return { ok: true };
        }
        catch (err) {
            console.error('Failed to send verification code:', err);
            return { ok: false, error: err.message };
        }
    }
    async verifyOtp(identifier, code) {
        AuthService_1.assertString(identifier, 'identifier');
        AuthService_1.assertString(code, 'code');
        const normalized = this.normalizeOtpIdentifier(identifier);
        const verifyRate = await this.redisService.checkRateLimit(this.otpVerifyRateKey(normalized), Number(process.env.OTP_VERIFY_LIMIT || this.OTP_MAX_VERIFY_ATTEMPTS), Number(process.env.OTP_VERIFY_WINDOW_SECONDS || this.OTP_TTL_SECONDS));
        if (!verifyRate.allowed) {
            throw new common_1.HttpException('Too many OTP verification attempts. Please request a new code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        const key = this.otpKey(normalized);
        const entry = await this.redisService.getJson(key);
        if (!entry?.code_hash) {
            if (entry)
                await this.redisService.del(key);
            throw new common_1.BadRequestException('OTP expired or not requested');
        }
        if (entry.attempts >= this.OTP_MAX_VERIFY_ATTEMPTS) {
            await this.redisService.del(key);
            throw new common_1.HttpException('Too many invalid attempts. Please request a new code.', common_1.HttpStatus.TOO_MANY_REQUESTS);
        }
        if (!(await bcrypt.compare(code, entry.code_hash))) {
            const ttl = await this.redisService.ttl(key);
            await this.redisService.setJson(key, { ...entry, attempts: entry.attempts + 1 }, ttl > 0 ? ttl : this.OTP_TTL_SECONDS);
            throw new common_1.BadRequestException('Invalid OTP code');
        }
        await this.redisService.del(key);
        await this.redisService.del(`ratelimit:${this.otpVerifyRateKey(normalized)}`);
        const isEmail = identifier.includes('@');
        await this.userModel.findOneAndUpdate(isEmail ? { email: normalized } : { phone: normalized }, { active: true });
        return { ok: true };
    }
    async resetPassword(identifier, newPassword, code) {
        AuthService_1.assertString(identifier, 'identifier');
        AuthService_1.assertString(newPassword, 'password');
        AuthService_1.assertString(code, 'code');
        const isEmail = identifier.includes('@');
        const u = await this.userModel.findOne(isEmail ? { email: identifier } : { phone: identifier });
        if (!u)
            throw new common_1.UnauthorizedException('User not found');
        await this.verifyOtp(this.otpContact(u, identifier), code);
        const hash = await bcrypt.hash(newPassword, 12);
        u.password_hash = hash;
        await u.save();
        return { ok: true };
    }
    otpContact(u, identifier) {
        if (identifier?.includes('@') && u?.email)
            return u.email;
        return u?.phone || u?.email || identifier;
    }
    async socialLogin(dto) {
        let email = dto.email;
        let name = dto.name || 'Social User';
        if (dto.provider === 'google') {
            const googleInfo = await this.verifyGoogleToken(dto.token);
            if (!googleInfo)
                throw new common_1.UnauthorizedException('Invalid Google token');
            email = googleInfo.email;
            name = googleInfo.full_name || name;
        }
        else if (dto.provider === 'apple') {
            const appleInfo = await this.verifyAppleToken(dto.token);
            if (!appleInfo)
                throw new common_1.UnauthorizedException('Invalid Apple token');
            email = appleInfo.email;
            name = appleInfo.full_name || name;
        }
        else if (dto.provider === 'x') {
            const xInfo = await this.verifyXToken(dto.token);
            if (!xInfo)
                throw new common_1.UnauthorizedException('Invalid X token');
            email = xInfo.email;
            name = xInfo.full_name || name;
        }
        else if (dto.provider === 'snapchat') {
            const snapchatInfo = await this.verifySnapchatToken(dto.token);
            if (!snapchatInfo)
                throw new common_1.UnauthorizedException('Invalid Snapchat token');
            email = snapchatInfo.email;
            name = snapchatInfo.full_name || name;
        }
        if (!email) {
            throw new common_1.BadRequestException('Email not provided by social provider');
        }
        let u = await this.userModel.findOne({ email });
        if (!u) {
            u = await this.userModel.create({
                full_name: name,
                email: email,
                phone: '',
                password_hash: '',
                role: enums_1.UserRole.PATIENT,
                active: true,
            });
            await this.patientModel.create({ user_id: u.id });
            this.events.emit(events_1.EVENTS.USER_REGISTERED, { user_id: u.id, role: u.role });
        }
        u.last_login_at = new Date();
        await u.save();
        this.events.emit(events_1.EVENTS.USER_LOGGED_IN, { user_id: u.id, role: u.role });
        return { user: this.publicUser(u), token: this.signToken(u) };
    }
    async verifyGoogleToken(token) {
        try {
            const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (response.ok) {
                const payload = await response.json();
                return {
                    email: payload.email,
                    full_name: payload.name || `${payload.given_name || ''} ${payload.family_name || ''}`.trim(),
                };
            }
            return null;
        }
        catch (err) {
            return null;
        }
    }
    async verifyAppleToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                return {
                    email: payload.email,
                    full_name: payload.name ? `${payload.name.firstName || ''} ${payload.name.lastName || ''}`.trim() : 'Apple User',
                };
            }
            return null;
        }
        catch (err) {
            return null;
        }
    }
    async verifyXToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                return {
                    email: payload.email || `${payload.username || 'x_user'}@twitter.com`,
                    full_name: payload.name || 'X User',
                };
            }
            return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
        }
        catch (e) {
            return { email: `x_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'X User' };
        }
    }
    async verifySnapchatToken(token) {
        try {
            const parts = token.split('.');
            if (parts.length === 3) {
                const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
                return {
                    email: payload.email || `${payload.username || 'snap_user'}@snapchat.com`,
                    full_name: payload.name || 'Snapchat User',
                };
            }
            return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
        }
        catch (e) {
            return { email: `snapchat_user_${Date.now().toString().slice(-4)}@nabd.app`, full_name: 'Snapchat User' };
        }
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('UserRepository')),
    __param(1, (0, common_1.Inject)('PatientProfileRepository')),
    __param(5, (0, common_2.Optional)()),
    __param(6, (0, common_2.Optional)()),
    __param(7, (0, common_2.Optional)()),
    __param(8, (0, common_2.Optional)()),
    __param(9, (0, common_2.Optional)()),
    __metadata("design:paramtypes", [user_repository_1.UserRepository,
        patientprofile_repository_1.PatientProfileRepository,
        jwt_1.JwtService,
        event_emitter_1.EventEmitter2,
        redis_service_1.RedisService,
        passkey_service_1.PasskeyService,
        device_trust_service_1.DeviceTrustService,
        push_module_1.PushService,
        mail_module_1.MailService,
        sms_service_1.SmsService])
], AuthService);
//# sourceMappingURL=auth.service.js.map