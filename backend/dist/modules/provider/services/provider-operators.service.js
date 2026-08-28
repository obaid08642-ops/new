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
exports.ProviderOperatorsService = void 0;
const common_1 = require("@nestjs/common");
const bcrypt = __importStar(require("bcryptjs"));
const crypto = __importStar(require("crypto"));
const schemas_1 = require("../schemas");
const provider_enums_1 = require("../provider.enums");
const provider_mailer_service_1 = require("./provider-mailer.service");
const provideroperator_repository_1 = require("./repositories/provideroperator.repository");
const provideraccount_repository_1 = require("./repositories/provideraccount.repository");
const providerauditlog_repository_1 = require("./repositories/providerauditlog.repository");
let ProviderOperatorsService = class ProviderOperatorsService {
    constructor(ops, accounts, audit, mailer) {
        this.ops = ops;
        this.accounts = accounts;
        this.audit = audit;
        this.mailer = mailer;
    }
    async list(user) {
        return this.ops.find({ provider_account_id: user.id }, { password_hash: 0, invite_token: 0 }).sort({ createdAt: -1 });
    }
    async invite(user, body) {
        const email = (body.email || '').toLowerCase().trim();
        if (!email || !email.includes('@'))
            throw new common_1.BadRequestException('invalid email');
        if (!Object.values(provider_enums_1.OperatorRole).includes(body.role))
            throw new common_1.BadRequestException('invalid role');
        if (body.role === provider_enums_1.OperatorRole.OWNER)
            throw new common_1.BadRequestException('cannot invite as OWNER');
        const existing = await this.ops.findOne({ provider_account_id: user.id, email });
        if (existing)
            throw new common_1.ConflictException('operator with this email already exists');
        const token = crypto.randomBytes(32).toString('hex');
        const perms = Array.isArray(body.permissions) && body.permissions.length ? body.permissions.filter((p) => Object.values(provider_enums_1.OperatorPermission).includes(p)) : provider_enums_1.DEFAULT_PERMISSIONS_BY_ROLE[body.role];
        const op = await this.ops.create({ provider_account_id: user.id, email, full_name: body.full_name, phone: body.phone, role: body.role, permissions: perms, status: schemas_1.OperatorStatus.INVITED, invite_token: token, invite_token_expires_at: new Date(Date.now() + 72 * 60 * 60 * 1000) });
        const acceptUrl = `${process.env.PROVIDER_APP_BASE_URL || 'https://nabd.app/provider'}/operators/accept?token=${token}&email=${encodeURIComponent(email)}`;
        await this.mailer.send({ to: email, subject: 'دعوة للانضمام إلى فريق مقدم الخدمة على نبض', text: `لقد تمت دعوتك للانضمام إلى فريق مقدم خدمة على نبض.\nالدور: ${body.role}\n\nاضغط الرابط التالي لإتمام إنشاء حسابك:\n${acceptUrl}\n\n(الرابط صالح لمدة 72 ساعة)`, tag: 'operator_invite' });
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.invited', target: { collection: 'provider_operators', id: op.id }, after: { email, role: op.role } });
        return { id: op.id, email: op.email, role: op.role, status: op.status, permissions: op.permissions };
    }
    async acceptInvite(body) {
        if (!body.token || !body.email || !body.password)
            throw new common_1.BadRequestException('token/email/password required');
        if (body.password.length < 8)
            throw new common_1.BadRequestException('password too short');
        const op = await this.ops.findOne({ email: body.email.toLowerCase().trim(), invite_token: body.token, status: schemas_1.OperatorStatus.INVITED });
        if (!op)
            throw new common_1.NotFoundException('invalid or expired invite');
        if (op.invite_token_expires_at && op.invite_token_expires_at.getTime() < Date.now())
            throw new common_1.BadRequestException('invite expired');
        op.password_hash = await bcrypt.hash(body.password, 10);
        op.full_name = body.full_name || op.full_name;
        op.phone = body.phone || op.phone;
        op.status = schemas_1.OperatorStatus.ACTIVE;
        op.accepted_at = new Date();
        op.invite_token = undefined;
        op.invite_token_expires_at = undefined;
        await op.save();
        await this.audit.create({ provider_account_id: op.provider_account_id, actor_id: op.id, actor_role: 'operator', action: 'operator.accepted', target: { collection: 'provider_operators', id: op.id } });
        return { id: op.id, status: op.status, role: op.role };
    }
    async update(user, id, patch) {
        const op = await this.ops.findOne({ id, provider_account_id: user.id });
        if (!op)
            throw new common_1.NotFoundException();
        if (op.role === provider_enums_1.OperatorRole.OWNER)
            throw new common_1.ForbiddenException('cannot modify OWNER');
        if (patch.role && Object.values(provider_enums_1.OperatorRole).includes(patch.role) && patch.role !== provider_enums_1.OperatorRole.OWNER) {
            op.role = patch.role;
            op.permissions = provider_enums_1.DEFAULT_PERMISSIONS_BY_ROLE[patch.role];
        }
        if (Array.isArray(patch.permissions))
            op.permissions = patch.permissions.filter((p) => Object.values(provider_enums_1.OperatorPermission).includes(p));
        if (patch.full_name !== undefined)
            op.full_name = patch.full_name;
        if (patch.phone !== undefined)
            op.phone = patch.phone;
        await op.save();
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.updated', target: { collection: 'provider_operators', id: op.id }, after: { role: op.role } });
        return op;
    }
    async disable(user, id, reason) {
        const op = await this.ops.findOne({ id, provider_account_id: user.id });
        if (!op)
            throw new common_1.NotFoundException();
        if (op.role === provider_enums_1.OperatorRole.OWNER)
            throw new common_1.ForbiddenException('cannot disable OWNER');
        op.status = schemas_1.OperatorStatus.DISABLED;
        op.disabled_at = new Date();
        op.disabled_by = user.id;
        op.disabled_reason = reason;
        await op.save();
        await this.audit.create({ provider_account_id: user.id, actor_id: user.id, actor_role: 'provider', action: 'operator.disabled', target: { collection: 'provider_operators', id: op.id } });
        return op;
    }
    async enable(user, id) {
        const op = await this.ops.findOne({ id, provider_account_id: user.id });
        if (!op)
            throw new common_1.NotFoundException();
        op.status = schemas_1.OperatorStatus.ACTIVE;
        op.disabled_at = undefined;
        op.disabled_by = undefined;
        op.disabled_reason = undefined;
        await op.save();
        return op;
    }
    async revoke(user, id) {
        const op = await this.ops.findOne({ id, provider_account_id: user.id });
        if (!op)
            throw new common_1.NotFoundException();
        if (op.role === provider_enums_1.OperatorRole.OWNER)
            throw new common_1.ForbiddenException('cannot revoke OWNER');
        op.status = schemas_1.OperatorStatus.REVOKED;
        await op.save();
        return { ok: true };
    }
};
exports.ProviderOperatorsService = ProviderOperatorsService;
exports.ProviderOperatorsService = ProviderOperatorsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('ProviderOperatorRepository')),
    __param(1, (0, common_1.Inject)('ProviderAccountRepository')),
    __param(2, (0, common_1.Inject)('ProviderAuditLogRepository')),
    __metadata("design:paramtypes", [provideroperator_repository_1.ProviderOperatorRepository,
        provideraccount_repository_1.ProviderAccountRepository,
        providerauditlog_repository_1.ProviderAuditLogRepository,
        provider_mailer_service_1.ProviderMailerService])
], ProviderOperatorsService);
//# sourceMappingURL=provider-operators.service.js.map