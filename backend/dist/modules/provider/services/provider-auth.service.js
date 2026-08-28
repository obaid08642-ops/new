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
exports.ProviderAuthService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const jwt_1 = require("@nestjs/jwt");
const provider_enums_1 = require("../provider.enums");
const provider_otp_service_1 = require("./provider-otp.service");
const schemas_1 = require("../schemas");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
const providersession_repository_1 = require("./repositories/providersession.repository");
const crypto = __importStar(require("crypto"));
let ProviderAuthService = class ProviderAuthService {
    constructor(accounts, profiles, audit, sessions, otp, jwt) {
        this.accounts = accounts;
        this.profiles = profiles;
        this.audit = audit;
        this.sessions = sessions;
        this.otp = otp;
        this.jwt = jwt;
        this.logger = new common_1.Logger('ProviderAuth');
    }
    signToken(a) {
        return this.jwt.sign({ sub: a.id, id: a.id, role: 'provider', provider_type: a.provider_type, scope: 'provider' });
    }
    publicAccount(a) {
        return { id: a.id, email: a.email, provider_type: a.provider_type, status: a.status, email_verified: a.email_verified, onboarding_progress: a.onboarding_progress };
    }
    validateEmail(email) {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
            throw new common_1.BadRequestException('invalid email');
    }
    validatePassword(p) {
        if (!p || p.length < 8)
            throw new common_1.BadRequestException('password must be at least 8 characters');
        if (!/[A-Za-z]/.test(p) || !/[0-9]/.test(p))
            throw new common_1.BadRequestException('password must contain letters and numbers');
    }
    async register(input) {
        this.validateEmail(input.email);
        this.validatePassword(input.password);
        if (input.password !== input.confirm_password)
            throw new common_1.BadRequestException('passwords do not match');
        if (!Object.values(provider_enums_1.ProviderType).includes(input.provider_type))
            throw new common_1.BadRequestException('invalid provider_type');
        const email = input.email.toLowerCase().trim();
        const exists = await this.accounts.findOne({ email });
        if (exists)
            throw new common_1.ConflictException('email already registered');
        const password_hash = await bcrypt.hash(input.password, 10);
        const acc = await this.accounts.create({ email, password_hash, provider_type: input.provider_type, status: provider_enums_1.ProviderAccountStatus.EMAIL_UNVERIFIED, status_history: [{ from: '', to: provider_enums_1.ProviderAccountStatus.EMAIL_UNVERIFIED, by_user_id: 'system', by_role: 'system', at: new Date() }] });
        await this.profiles.create({ account_id: acc.id, provider_type: input.provider_type });
        await this.audit.create({ provider_account_id: acc.id, actor_id: acc.id, actor_role: 'provider', action: 'auth.register', target: { collection: 'provider_accounts', id: acc.id } });
        const otpRes = await this.otp.issue(email, schemas_1.OtpPurpose.EMAIL_VERIFICATION, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: acc.id });
        return { account: this.publicAccount(acc), otp: otpRes, required_documents: provider_enums_1.REQUIRED_DOCS_BY_PROVIDER_TYPE[input.provider_type] };
    }
    async login(input) {
        const email = (input.email || '').toLowerCase().trim();
        const a = await this.accounts.findOne({ email });
        if (!a)
            throw new common_1.UnauthorizedException('invalid credentials');
        if (a.locked_until && a.locked_until.getTime() > Date.now())
            throw new common_1.UnauthorizedException('account temporarily locked — too many failed attempts');
        const ok = await bcrypt.compare(input.password, a.password_hash);
        if (!ok) {
            a.failed_login_attempts = (a.failed_login_attempts || 0) + 1;
            if (a.failed_login_attempts >= 5) {
                a.locked_until = new Date(Date.now() + 15 * 60 * 1000);
                a.failed_login_attempts = 0;
            }
            await a.save();
            throw new common_1.UnauthorizedException('invalid credentials');
        }
        a.failed_login_attempts = 0;
        a.locked_until = undefined;
        a.last_login_at = new Date();
        await a.save();
        await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.login', meta: { ip: input.meta?.ip, device: input.meta?.device_identifier } });
        const refresh_token = crypto.randomBytes(40).toString('hex');
        const refresh_token_hash = await bcrypt.hash(refresh_token, 10);
        const session = await this.sessions.create({
            provider_account_id: a.id,
            device_identifier: input.meta?.device_identifier || 'unknown',
            refresh_token_hash,
            status: 'active',
            expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        });
        const p = await this.profiles.findOne({ account_id: a.id });
        const profileData = p ? p.toObject() : null;
        return {
            access_token: this.signToken(a),
            refresh_token,
            session_id: session.id,
            provider_id: a.id,
            provider_type: a.provider_type,
            role: 'provider',
            permissions: ['*'],
            profile_status: a.status,
            account: this.publicAccount(a),
            profile: profileData
        };
    }
    async refresh(input) {
        const session = await this.sessions.findOne({ id: input.session_id, status: 'active' });
        if (!session) {
            this.logger.warn(`Refresh failed: Session ${input.session_id} not found or revoked`);
            throw new common_1.UnauthorizedException('invalid session');
        }
        if (session.device_identifier !== input.device_identifier) {
            await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
            await this.audit.create({ provider_account_id: session.provider_account_id, actor_id: 'system', actor_role: 'system', action: 'auth.session_revoked', meta: { reason: 'device_mismatch' } });
            throw new common_1.UnauthorizedException('device mismatch');
        }
        if (new Date() > session.expires_at) {
            await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
            throw new common_1.UnauthorizedException('session expired');
        }
        const ok = await bcrypt.compare(input.refresh_token, session.refresh_token_hash);
        if (!ok) {
            await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
            throw new common_1.UnauthorizedException('invalid refresh token');
        }
        const a = await this.accounts.findOne({ id: session.provider_account_id });
        if (!a)
            throw new common_1.UnauthorizedException('account not found');
        if (a.locked_until && a.locked_until.getTime() > Date.now())
            throw new common_1.UnauthorizedException('account locked');
        const invalidStatuses = [provider_enums_1.ProviderAccountStatus.SUSPENDED, provider_enums_1.ProviderAccountStatus.REJECTED];
        if (invalidStatuses.includes(a.status))
            throw new common_1.UnauthorizedException(`account ${a.status.toLowerCase()}`);
        const new_refresh_token = crypto.randomBytes(40).toString('hex');
        session.refresh_token_hash = await bcrypt.hash(new_refresh_token, 10);
        session.expires_at = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        await session.save();
        await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.refresh', meta: { ip: input.meta?.ip, device: input.device_identifier } });
        const p = await this.profiles.findOne({ account_id: a.id });
        const profileData = p ? p.toObject() : null;
        return {
            access_token: this.signToken(a),
            refresh_token: new_refresh_token,
            provider_id: a.id,
            provider_type: a.provider_type,
            role: 'provider',
            permissions: ['*'],
            profile_status: a.status,
            account: this.publicAccount(a),
            profile: profileData
        };
    }
    async logout(input) {
        await this.sessions.model.updateOne({ id: input.session_id }, { status: 'revoked' });
        const session = await this.sessions.findOne({ id: input.session_id });
        if (session) {
            await this.audit.create({ provider_account_id: session.provider_account_id, actor_id: session.provider_account_id, actor_role: 'provider', action: 'auth.logout', meta: { ip: input.meta?.ip } });
        }
        return { ok: true };
    }
    async sendOtp(input) {
        return this.otp.issue(input.email, input.purpose, { ip: input.meta?.ip, ua: input.meta?.ua });
    }
    async verifyEmail(input) {
        const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
        await this.otp.verify(input.email, schemas_1.OtpPurpose.EMAIL_VERIFICATION, input.code, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a?.id });
        if (!a)
            return { ok: true, onboarding: true };
        if (!a.email_verified) {
            a.email_verified = true;
            a.email_verified_at = new Date();
            const allowed = provider_enums_1.PROVIDER_STATUS_TRANSITIONS[a.status] || [];
            if (allowed.includes(provider_enums_1.ProviderAccountStatus.EMAIL_VERIFIED)) {
                a.status_history.push({ from: a.status, to: provider_enums_1.ProviderAccountStatus.EMAIL_VERIFIED, by_user_id: a.id, by_role: 'provider', at: new Date() });
                a.status = provider_enums_1.ProviderAccountStatus.EMAIL_VERIFIED;
            }
            await a.save();
        }
        return { account: this.publicAccount(a), token: this.signToken(a) };
    }
    async forgotPassword(input) {
        const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
        if (!a)
            return { ok: true };
        await this.otp.issue(a.email, schemas_1.OtpPurpose.PASSWORD_RESET, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
        return { ok: true };
    }
    async verifyResetCode(input) {
        const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
        if (!a)
            throw new common_1.BadRequestException('no active code — please request a new one');
        return this.otp.check(input.email, schemas_1.OtpPurpose.PASSWORD_RESET, input.code, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
    }
    async resetPassword(input) {
        this.validatePassword(input.new_password);
        const a = await this.accounts.findOne({ email: input.email.toLowerCase().trim() });
        if (!a)
            throw new common_1.NotFoundException();
        await this.otp.verify(input.email, schemas_1.OtpPurpose.PASSWORD_RESET, input.code, { ip: input.meta?.ip, ua: input.meta?.ua, account_id: a.id });
        a.password_hash = await bcrypt.hash(input.new_password, 10);
        a.failed_login_attempts = 0;
        a.locked_until = undefined;
        await a.save();
        await this.audit.create({ provider_account_id: a.id, actor_id: a.id, actor_role: 'provider', action: 'auth.password_reset' });
        return { account: this.publicAccount(a), token: this.signToken(a) };
    }
    async me(user) {
        const a = await this.accounts.findOne({ id: user.id });
        if (!a)
            throw new common_1.NotFoundException();
        const p = await this.profiles.findOne({ account_id: a.id });
        return { account: this.publicAccount(a), profile: p?.toObject(), required_documents: provider_enums_1.REQUIRED_DOCS_BY_PROVIDER_TYPE[a.provider_type] };
    }
};
exports.ProviderAuthService = ProviderAuthService;
exports.ProviderAuthService = ProviderAuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(1, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(2, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __param(3, (0, common_1.Inject)('ProviderSessionRepository')),
    __metadata("design:paramtypes", [provideraccount_repository_1.ProviderAccountRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        providersession_repository_1.ProviderSessionRepository,
        provider_otp_service_1.ProviderOtpService,
        jwt_1.JwtService])
], ProviderAuthService);
//# sourceMappingURL=provider-auth.service.js.map