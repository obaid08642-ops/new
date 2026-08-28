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
exports.NoGuestsGuard = exports.CurrentUser = exports.JwtAuthGuard = exports.Roles = exports.ROLES_KEY = exports.Public = exports.PUBLIC_KEY = void 0;
exports.invalidateDynamicRoleCache = invalidateDynamicRoleCache;
exports.normalizeEffectiveRole = normalizeEffectiveRole;
exports.getEffectiveRoles = getEffectiveRoles;
const common_1 = require("@nestjs/common");
const jwt_1 = require("@nestjs/jwt");
const core_1 = require("@nestjs/core");
const common_2 = require("@nestjs/common");
const enums_1 = require("./enums");
const permissions_1 = require("./permissions");
const rbac_1 = require("./rbac");
const impersonation_session_service_1 = require("./impersonation-session.service");
const effective_permissions_1 = require("./effective-permissions");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
function invalidateDynamicRoleCache() { }
exports.PUBLIC_KEY = 'isPublic';
const Public = () => (0, common_2.SetMetadata)(exports.PUBLIC_KEY, true);
exports.Public = Public;
exports.ROLES_KEY = 'roles';
const Roles = (...roles) => (0, common_2.SetMetadata)(exports.ROLES_KEY, roles);
exports.Roles = Roles;
const PENDING_PROVIDER_ONBOARDING_PATH = /^\/api\/v1\/provider-onboarding\/(my-profile|step2|step3|submit|progress|contract)$/;
function normalizeEffectiveRole(value) {
    const role = String(value || '').trim().toLowerCase();
    const aliases = {
        laboratory: enums_1.UserRole.LAB,
        lab: enums_1.UserRole.LAB,
        radiology_center: enums_1.UserRole.RADIOLOGY,
        radiology: enums_1.UserRole.RADIOLOGY,
        hospital: enums_1.UserRole.HOSPITAL,
        hospital_admin: enums_1.UserRole.HOSPITAL_ADMIN,
        pharmacy: enums_1.UserRole.PHARMACY,
        pharmacist: enums_1.UserRole.PHARMACIST,
        homecare: enums_1.UserRole.HOME_CARE,
        home_care: enums_1.UserRole.HOME_CARE,
        nursing: enums_1.UserRole.NURSING,
        nurse: enums_1.UserRole.NURSE,
    };
    return aliases[role] || role;
}
function getEffectiveRoles(user) {
    return Array.from(new Set([
        normalizeEffectiveRole(user?.role),
        normalizeEffectiveRole(user?.provider_type),
        normalizeEffectiveRole(user?.providerType),
    ].filter(Boolean)));
}
let JwtAuthGuard = class JwtAuthGuard {
    constructor(jwt, reflector, connection, impersonationSessions) {
        this.jwt = jwt;
        this.reflector = reflector;
        this.connection = connection;
        this.impersonationSessions = impersonationSessions;
    }
    async canActivate(ctx) {
        const isPublic = this.reflector.getAllAndOverride(exports.PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
        const req = ctx.switchToHttp().getRequest();
        const ip = req.ip || req.socket.remoteAddress || '';
        const userAgent = req.headers['user-agent'] || '';
        req.auditInfo = { ip, userAgent };
        const auth = req.headers.authorization || '';
        let token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
        if (!token) {
            if (isPublic)
                return true;
            throw new common_1.UnauthorizedException('Missing token');
        }
        let payload;
        try {
            const secret = process.env.JWT_SECRET;
            if (!secret && process.env.NODE_ENV === 'production')
                throw new common_1.UnauthorizedException('JWT secret is not configured');
            payload = secret ? await this.jwt.verifyAsync(token, { secret }) : await this.jwt.verifyAsync(token);
        }
        catch (e) {
            if (isPublic)
                return true;
            throw new common_1.UnauthorizedException('Invalid token');
        }
        req.user = payload;
        if (payload?.scope === 'impersonation') {
            const context = await this.impersonationSessions.validate(payload);
            req.impersonator = context.impersonator;
            req.impersonationSession = context.session;
            req.auditInfo = { ...req.auditInfo, impersonator_id: context.impersonator.id, impersonation_session_id: context.session.id, target_user_id: payload.id || payload.sub };
        }
        if (payload?.scope === 'provider') {
            const account = await this.connection.collection('provider_accounts').findOne({ id: payload.id }, { projection: { status: 1 } });
            if (!account)
                throw new common_1.UnauthorizedException('provider_account_not_found');
            const path = String(req.path || req.originalUrl || req.url || '').split('?')[0];
            if (String(account.status || '').toLowerCase() !== 'approved' && !PENDING_PROVIDER_ONBOARDING_PATH.test(path)) {
                throw new common_1.ForbiddenException('provider_approval_required');
            }
        }
        const impersonateUserId = req.headers['x-impersonate-user-id'];
        if (impersonateUserId) {
            throw new common_1.ForbiddenException('impersonation_session_required');
        }
        const effectiveRoles = getEffectiveRoles(payload);
        const roles = this.reflector.getAllAndOverride(exports.ROLES_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (roles && roles.length && !roles.some(required => (0, rbac_1.roleSatisfies)(normalizeEffectiveRole(String(required)), effectiveRoles))) {
            throw new common_1.ForbiddenException('Insufficient role');
        }
        const requiredPermissions = this.reflector.getAllAndOverride(permissions_1.PERMISSIONS_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (requiredPermissions && requiredPermissions.length) {
            const userPermissions = await (0, effective_permissions_1.resolveEffectivePermissions)(this.connection, payload);
            const hasPermission = requiredPermissions.every(p => userPermissions.includes(p));
            if (!hasPermission) {
                throw new common_1.ForbiddenException('Insufficient permissions');
            }
        }
        const ownershipOptions = this.reflector.getAllAndOverride(permissions_1.CHECK_OWNERSHIP_KEY, [ctx.getHandler(), ctx.getClass()]);
        if (ownershipOptions && payload.role !== enums_1.UserRole.SUPER_ADMIN && payload.role !== enums_1.UserRole.ADMIN) {
            const resourceId = req.params[ownershipOptions.paramName || 'id'] ||
                req.query[ownershipOptions.paramName || 'id'] ||
                req.body[ownershipOptions.paramName || 'id'];
            if (resourceId) {
                const modelName = ownershipOptions.model;
                const model = this.connection.model(modelName);
                if (model) {
                    const query = { id: resourceId };
                    const resource = (await model.findOne(query).lean());
                    if (!resource) {
                        throw new common_1.NotFoundException(`Resource ${modelName} not found`);
                    }
                    const userId = payload.id;
                    const facilityId = payload.facility_id || payload.parent_provider_account_id;
                    const isOwner = resource[ownershipOptions.ownerField] === userId;
                    let isProvider = false;
                    if (ownershipOptions.providerField) {
                        const pField = resource[ownershipOptions.providerField];
                        isProvider = pField === userId || (facilityId && pField === facilityId);
                    }
                    if (!isOwner && !isProvider) {
                        throw new common_1.ForbiddenException('Access denied: You do not own this resource');
                    }
                }
            }
        }
        return true;
    }
};
exports.JwtAuthGuard = JwtAuthGuard;
exports.JwtAuthGuard = JwtAuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [jwt_1.JwtService,
        core_1.Reflector,
        mongoose_2.Connection,
        impersonation_session_service_1.ImpersonationSessionService])
], JwtAuthGuard);
const common_3 = require("@nestjs/common");
exports.CurrentUser = (0, common_3.createParamDecorator)((data, ctx) => {
    const req = ctx.switchToHttp().getRequest();
    return data ? req.user?.[data] : req.user;
});
let NoGuestsGuard = class NoGuestsGuard {
    canActivate(ctx) {
        const req = ctx.switchToHttp().getRequest();
        if (req.user?.is_guest || req.user?.role === 'guest') {
            throw new common_1.ForbiddenException('هذه الميزة تتطلب إنشاء حساب — Registration required');
        }
        return true;
    }
};
exports.NoGuestsGuard = NoGuestsGuard;
exports.NoGuestsGuard = NoGuestsGuard = __decorate([
    (0, common_1.Injectable)()
], NoGuestsGuard);
//# sourceMappingURL=auth.guard.js.map