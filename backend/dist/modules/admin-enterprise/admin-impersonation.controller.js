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
exports.AdminImpersonationController = void 0;
const common_1 = require("@nestjs/common");
const node_crypto_1 = require("node:crypto");
const mongoose_1 = require("@nestjs/mongoose");
const jwt_1 = require("@nestjs/jwt");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
let AdminImpersonationController = class AdminImpersonationController {
    constructor(conn, jwt, audit) {
        this.conn = conn;
        this.jwt = jwt;
        this.audit = audit;
    }
    async start(body, me, req) {
        const reason = (0, rbac_1.validateReason)(body?.reason);
        const targetId = String(body?.user_id || '').trim();
        const requestedMinutes = Number(body?.minutes || 15);
        const minutes = Number.isFinite(requestedMinutes) ? Math.max(1, Math.min(15, Math.floor(requestedMinutes))) : 15;
        if (!targetId || targetId === me.id)
            throw new common_1.BadRequestException('valid_different_target_required');
        const target = await this.conn.collection('users').findOne({ id: targetId }, { projection: { _id: 0, id: 1, role: 1, full_name: 1, email: 1, active: 1, suspended: 1 } });
        if (!target)
            throw new common_1.BadRequestException('impersonation_target_not_found');
        if (['admin', 'super_admin', 'support_agent'].includes(String(target.role)))
            throw new common_1.BadRequestException('staff_impersonation_forbidden');
        if (target.active === false || target.suspended === true)
            throw new common_1.BadRequestException('suspended_target_forbidden');
        const sessionId = `imp_${(0, node_crypto_1.randomUUID)()}`;
        const expiresAt = new Date(Date.now() + minutes * 60_000);
        await this.conn.collection('impersonation_sessions').insertOne({ id: sessionId, target_user_id: target.id, target_role: target.role, impersonator_id: me.id, reason, status: 'active', expiresAt, ip: req.auditInfo?.ip || null, user_agent: req.auditInfo?.userAgent || null, createdAt: new Date(), updatedAt: new Date() });
        const token = await this.jwt.signAsync({ id: target.id, sub: target.id, role: target.role, scope: 'impersonation', impersonation_session_id: sessionId, impersonator: { id: me.id, full_name: me.full_name || me.email || me.id }, permissions: [] }, { expiresIn: `${minutes}m` });
        await this.audit.write({ action: 'impersonation_start', actor: me, target_type: 'user', target_id: target.id, reason, after: { session_id: sessionId, expires_at: expiresAt, target_role: target.role } });
        const safe = { session_id: sessionId, target: { id: target.id, role: target.role, full_name: target.full_name || null }, expires_at: expiresAt.toISOString(), warning: 'هذه جلسة دعم قصيرة العمر ومقيدة بالمستخدم الهدف.' };
        return req.headers['x-admin-bff'] === 'support-session' ? { ...safe, token } : safe;
    }
    async revoke(id, me, body) {
        const reason = (0, rbac_1.validateReason)(body?.reason);
        const existing = await this.conn.collection('impersonation_sessions').findOne({ id });
        if (!existing)
            throw new common_1.BadRequestException('impersonation_session_not_found');
        if (existing.status !== 'active')
            return { ok: true, status: existing.status };
        await this.conn.collection('impersonation_sessions').updateOne({ id, status: 'active' }, { $set: { status: 'revoked', revoked_by: me.id, revoked_at: new Date(), updatedAt: new Date() } });
        await this.audit.write({ action: 'impersonation_revoke', actor: me, target_type: 'user', target_id: existing.target_user_id, reason, before: { session_id: id, status: 'active' }, after: { status: 'revoked' } });
        return { ok: true, status: 'revoked', session_id: id };
    }
    async list(me) {
        const data = await this.conn.collection('impersonation_sessions').find({ impersonator_id: me.id }, { projection: { _id: 0, token: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
        return { data };
    }
};
exports.AdminImpersonationController = AdminImpersonationController;
__decorate([
    (0, common_1.Post)('start'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_IMPERSONATE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminImpersonationController.prototype, "start", null);
__decorate([
    (0, common_1.Post)(':id/revoke'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_IMPERSONATE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminImpersonationController.prototype, "revoke", null);
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_IMPERSONATE),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminImpersonationController.prototype, "list", null);
exports.AdminImpersonationController = AdminImpersonationController = __decorate([
    (0, common_1.Controller)('admin/impersonation'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        jwt_1.JwtService,
        audit_service_1.AdminAuditService])
], AdminImpersonationController);
//# sourceMappingURL=admin-impersonation.controller.js.map