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
exports.ProviderOtpService = void 0;
const common_1 = require("@nestjs/common");
const crypto = __importStar(require("crypto"));
const schemas_1 = require("../schemas");
const provider_mailer_service_1 = require("./provider-mailer.service");
const providerotpcode_repository_1 = require("./repositories/providerotpcode.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
const OTP_EXP_MIN = 10;
const OTP_RESEND_COOLDOWN_SEC = 60;
const OTP_MAX_ATTEMPTS = 5;
let ProviderOtpService = class ProviderOtpService {
    constructor(otpModel, audit, mailer) {
        this.otpModel = otpModel;
        this.audit = audit;
        this.mailer = mailer;
        this.logger = new common_1.Logger('ProviderOtp');
    }
    hash(code) { return crypto.createHash('sha256').update(code).digest('hex'); }
    generateCode() { return ('' + Math.floor(100000 + Math.random() * 900000)).slice(-6); }
    bodyFor(purpose, code) {
        if (purpose === schemas_1.OtpPurpose.PASSWORD_RESET) {
            return { subject: 'إعادة تعيين كلمة المرور - نبض', text: `رمز إعادة التعيين: ${code}\nصالح لمدة ${OTP_EXP_MIN} دقائق.\nإذا لم تطلب هذا تجاهل الرسالة.` };
        }
        return { subject: 'رمز التحقق - نبض مقدمي الخدمة', text: `أهلاً بك في نبض.\nرمز التحقق الخاص بك: ${code}\nصالح لمدة ${OTP_EXP_MIN} دقائق.` };
    }
    async issue(email, purpose, meta = {}) {
        email = (email || '').toLowerCase().trim();
        if (!email || !email.includes('@'))
            throw new common_1.BadRequestException('invalid email');
        const recent = await this.otpModel.findOne({ email, purpose, status: schemas_1.OtpStatus.ACTIVE }).sort({ createdAt: -1 });
        if (recent?.last_sent_at) {
            const diff = (Date.now() - recent.last_sent_at.getTime()) / 1000;
            if (diff < OTP_RESEND_COOLDOWN_SEC) {
                const wait = Math.ceil(OTP_RESEND_COOLDOWN_SEC - diff);
                throw new common_1.BadRequestException(`Please wait ${wait}s before requesting a new code`);
            }
        }
        await this.otpModel.updateMany({ email, purpose, status: schemas_1.OtpStatus.ACTIVE }, { $set: { status: schemas_1.OtpStatus.INVALIDATED } });
        const code = this.generateCode();
        const doc = await this.otpModel.create({
            email, purpose, code_hash: this.hash(code),
            expires_at: new Date(Date.now() + OTP_EXP_MIN * 60 * 1000),
            last_sent_at: new Date(), ip: meta.ip, user_agent: meta.ua,
        });
        const body = this.bodyFor(purpose, code);
        const send = await this.mailer.send({ to: email, subject: body.subject, text: body.text, tag: purpose });
        await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'system', actor_role: 'system', action: 'otp.issued', target: { collection: 'provider_otp_codes', id: doc.id }, after: { purpose, send_status: send.status }, ip: meta.ip, user_agent: meta.ua });
        if (send.status === 'logged')
            this.logger.warn(`(LOG_ONLY) OTP for ${email} purpose=${purpose} → ${code}`);
        return { sent: send.status !== 'failed', cooldown_seconds: OTP_RESEND_COOLDOWN_SEC, expires_in_seconds: OTP_EXP_MIN * 60, log_only: send.status === 'logged' };
    }
    async verify(email, purpose, code, meta = {}) {
        email = (email || '').toLowerCase().trim();
        if (!code || code.length !== 6)
            throw new common_1.BadRequestException('invalid code');
        const doc = await this.otpModel.findOne({ email, purpose, status: schemas_1.OtpStatus.ACTIVE }).sort({ createdAt: -1 });
        if (!doc)
            throw new common_1.BadRequestException('no active code — please request a new one');
        if (doc.expires_at.getTime() < Date.now()) {
            doc.status = schemas_1.OtpStatus.EXPIRED;
            await doc.save();
            throw new common_1.BadRequestException('code expired');
        }
        if (doc.attempts >= OTP_MAX_ATTEMPTS) {
            doc.status = schemas_1.OtpStatus.INVALIDATED;
            await doc.save();
            throw new common_1.BadRequestException('too many attempts — please request a new code');
        }
        const matches = doc.code_hash === this.hash(code);
        if (!matches) {
            doc.attempts += 1;
            await doc.save();
            await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verify_failed', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
            throw new common_1.BadRequestException(`incorrect code (${OTP_MAX_ATTEMPTS - doc.attempts} attempts left)`);
        }
        doc.status = schemas_1.OtpStatus.USED;
        doc.consumed_at = new Date();
        await doc.save();
        await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verified', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
        return { ok: true };
    }
    async check(email, purpose, code, meta = {}) {
        email = (email || '').toLowerCase().trim();
        if (!code || code.length !== 6)
            throw new common_1.BadRequestException('invalid code');
        const doc = await this.otpModel.findOne({ email, purpose, status: schemas_1.OtpStatus.ACTIVE }).sort({ createdAt: -1 });
        if (!doc)
            throw new common_1.BadRequestException('no active code — please request a new one');
        if (doc.expires_at.getTime() < Date.now()) {
            doc.status = schemas_1.OtpStatus.EXPIRED;
            await doc.save();
            throw new common_1.BadRequestException('code expired');
        }
        if (doc.attempts >= OTP_MAX_ATTEMPTS) {
            doc.status = schemas_1.OtpStatus.INVALIDATED;
            await doc.save();
            throw new common_1.BadRequestException('too many attempts — please request a new code');
        }
        const matches = doc.code_hash === this.hash(code);
        if (!matches) {
            doc.attempts += 1;
            await doc.save();
            await this.audit.create({ provider_account_id: meta.account_id, actor_id: meta.account_id || 'unknown', actor_role: 'provider', action: 'otp.verify_failed', target: { collection: 'provider_otp_codes', id: doc.id }, ip: meta.ip, user_agent: meta.ua });
            throw new common_1.BadRequestException(`incorrect code (${OTP_MAX_ATTEMPTS - doc.attempts} attempts left)`);
        }
        return { ok: true };
    }
};
exports.ProviderOtpService = ProviderOtpService;
exports.ProviderOtpService = ProviderOtpService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderOtpCodeRepository')),
    __param(1, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __metadata("design:paramtypes", [providerotpcode_repository_1.ProviderOtpCodeRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        provider_mailer_service_1.ProviderMailerService])
], ProviderOtpService);
//# sourceMappingURL=provider-otp.service.js.map