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
exports.AdminSecurityController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const auth_guard_2 = require("../../common/auth.guard");
const audit_service_1 = require("./audit.service");
const CATALOG = Object.values(permissions_1.Permission);
let AdminSecurityController = class AdminSecurityController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    auditLog(action, adminId, targetType, targetId, from, to, page = '1', limit = '50') {
        return this.audit.list({ action, admin_id: adminId, target_type: targetType, target_id: targetId, from, to }, parseInt(page, 10) || 1, parseInt(limit, 10) || 50);
    }
    async session(me) {
        const dbUser = await this.conn.collection('users').findOne({ id: me.id }, { projection: { id: 1, full_name: 1, email: 1, phone: 1, role: 1, permissions: 1, custom_role_keys: 1 } });
        if (!dbUser)
            throw new common_1.NotFoundException('admin_user_not_found');
        const staticPerms = (0, rbac_1.mergePermissions)(...[me.role].map((r) => permissions_1.ROLE_PERMISSIONS[r] || []), dbUser.permissions || []);
        let customPerms = [];
        const keys = dbUser.custom_role_keys || [];
        if (keys.length) {
            const docs = await this.conn.collection('admin_custom_roles').find({ key: { $in: keys } }).toArray().catch(() => []);
            customPerms = (0, rbac_1.mergePermissions)(...docs.map((d) => d?.permissions || []));
        }
        return {
            user: {
                id: dbUser.id,
                full_name: dbUser.full_name || null,
                email: dbUser.email || null,
                phone: dbUser.phone || null,
                role: dbUser.role,
                impersonator: me.impersonator
                    ? { id: me.impersonator.id, full_name: me.impersonator.full_name }
                    : null,
            },
            custom_role_keys: keys,
            is_super_admin: (0, rbac_1.roleSatisfies)('super_admin', [dbUser.role]),
            permissions: (0, rbac_1.mergePermissions)(staticPerms, customPerms),
        };
    }
    catalog() {
        const systemRoles = Object.entries(permissions_1.ROLE_PERMISSIONS).map(([role, perms]) => ({
            key: role,
            label_ar: role === 'super_admin' ? 'المالك الأعلى' : role === 'admin' ? 'مدير منصة' : role,
            permission_count: perms.length,
            is_system: true,
        }));
        return {
            permissions: CATALOG.map((key) => ({ key, label_ar: permissions_1.PERMISSION_LABELS_AR[key] || key })),
            system_roles: systemRoles,
        };
    }
    async listRoles() {
        const docs = await this.conn.collection('admin_custom_roles').find({}).sort({ createdAt: -1 }).toArray();
        const usage = await this.conn.collection('users').aggregate([
            { $match: { custom_role_keys: { $exists: true, $ne: [] } } },
            { $unwind: '$custom_role_keys' },
            { $group: { _id: '$custom_role_keys', users: { $sum: 1 } } },
        ]).toArray();
        const usageMap = new Map(usage.map((u) => [u._id, u.users]));
        return docs.map(({ _id, ...r }) => ({ ...r, assigned_users: usageMap.get(r.key) || 0 }));
    }
    async createRole(b, me) {
        const reason = (0, rbac_1.validateReason)(b?.reason);
        const key = String(b?.key || '').trim();
        if (!rbac_1.CUSTOM_ROLE_KEY_RE.test(key))
            throw new common_1.BadRequestException('invalid_role_key_format');
        const nameAr = String(b?.name_ar || '').trim();
        if (!nameAr)
            throw new common_1.BadRequestException('name_ar_required');
        const exists = await this.conn.collection('admin_custom_roles').findOne({ key });
        if (exists)
            throw new common_1.ConflictException('role_key_exists');
        if ((b.system_protected_keys || []).includes?.(key))
            throw new common_1.ConflictException('reserved_key');
        const permissions = (0, rbac_1.sanitizePermissions)(b?.permissions, CATALOG);
        const doc = {
            id: `acr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
            key,
            name_ar: nameAr,
            description_ar: String(b?.description_ar || '').trim() || null,
            permissions,
            is_system: false,
            created_by: me.id,
            updated_by: me.id,
            createdAt: new Date(),
            updatedAt: new Date(),
        };
        await this.conn.collection('admin_custom_roles').insertOne(doc);
        (0, auth_guard_2.invalidateDynamicRoleCache)();
        await this.audit.write({
            action: 'rbac_role_create', actor: me, target_type: 'admin_custom_role', target_id: doc.id,
            after: { key, name_ar: nameAr, permission_count: permissions.length },
            reason,
        });
        const { _id, ...clean } = doc;
        return clean;
    }
    async updateRole(id, b, me) {
        const reason = (0, rbac_1.validateReason)(b?.reason);
        const before = await this.conn.collection('admin_custom_roles').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('role_not_found');
        if (before.is_system)
            throw new common_1.ForbiddenException('system_roles_immutable');
        const $set = { updatedAt: new Date(), updated_by: me.id };
        if (b?.name_ar !== undefined)
            $set.name_ar = String(b.name_ar).trim();
        if (b?.description_ar !== undefined)
            $set.description_ar = String(b.description_ar).trim() || null;
        if (b?.permissions !== undefined)
            $set.permissions = (0, rbac_1.sanitizePermissions)(b.permissions, CATALOG);
        await this.conn.collection('admin_custom_roles').updateOne({ id }, { $set });
        (0, auth_guard_2.invalidateDynamicRoleCache)();
        await this.audit.write({
            action: 'rbac_role_update', actor: me, target_type: 'admin_custom_role', target_id: id,
            reason,
            before: { name_ar: before.name_ar, permissions: before.permissions },
            after: { name_ar: $set.name_ar ?? before.name_ar, permissions: $set.permissions ?? before.permissions },
        });
        const after = await this.conn.collection('admin_custom_roles').findOne({ id }, { projection: { _id: 0 } });
        return after;
    }
    async deleteRole(id, b, me) {
        const reason = (0, rbac_1.validateReason)(b?.reason);
        const before = await this.conn.collection('admin_custom_roles').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('role_not_found');
        if (before.is_system)
            throw new common_1.ForbiddenException('system_roles_immutable');
        const assigned = await this.conn.collection('users').countDocuments({ custom_role_keys: before.key });
        if (assigned > 0)
            throw new common_1.ConflictException(`role_assigned_to_${assigned}_users_unassign_first`);
        await this.conn.collection('admin_custom_roles').deleteOne({ id });
        (0, auth_guard_2.invalidateDynamicRoleCache)();
        await this.audit.write({
            action: 'rbac_role_delete', actor: me, target_type: 'admin_custom_role', target_id: id,
            reason, before: { key: before.key, permissions: before.permissions },
        });
        return { ok: true, deleted: id };
    }
    async assignUserRoles(userId, b, me) {
        const target = await this.conn.collection('users').findOne({ id: userId }, { projection: { id: 1, role: 1, full_name: 1, email: 1, custom_role_keys: 1 } });
        if (!target)
            throw new common_1.NotFoundException('user_not_found');
        if (!['admin', 'super_admin', 'support_agent'].includes(String(target.role))) {
            throw new common_1.ForbiddenException('custom_roles_apply_to_staff_only');
        }
        const requestedKeys = Array.isArray(b?.custom_role_keys) ? b.custom_role_keys.map(String) : [];
        const knownDocs = requestedKeys.length
            ? await this.conn.collection('admin_custom_roles').find({ key: { $in: requestedKeys } }).toArray()
            : [];
        const known = new Set(knownDocs.map((d) => d.key));
        const unknown = requestedKeys.filter((k) => !known.has(k));
        if (unknown.length)
            throw new common_1.BadRequestException(`unknown_role_keys:${unknown.join(',')}`);
        const nextKeys = [...new Set(requestedKeys)].sort();
        await this.conn.collection('users').updateOne({ id: userId }, { $set: { custom_role_keys: nextKeys } });
        (0, auth_guard_2.invalidateDynamicRoleCache)();
        await this.audit.write({
            action: 'rbac_user_roles_assign', actor: me, target_type: 'user', target_id: userId,
            reason: (0, rbac_1.validateReason)(b?.reason),
            before: { custom_role_keys: target.custom_role_keys || [] },
            after: { custom_role_keys: nextKeys },
        });
        return { ok: true, user_id: userId, custom_role_keys: nextKeys };
    }
};
exports.AdminSecurityController = AdminSecurityController;
__decorate([
    (0, common_1.Get)('audit'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.DATA_EXPORT),
    __param(0, (0, common_1.Query)('action')),
    __param(1, (0, common_1.Query)('admin_id')),
    __param(2, (0, common_1.Query)('target_type')),
    __param(3, (0, common_1.Query)('target_id')),
    __param(4, (0, common_1.Query)('from')),
    __param(5, (0, common_1.Query)('to')),
    __param(6, (0, common_1.Query)('page')),
    __param(7, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminSecurityController.prototype, "auditLog", null);
__decorate([
    (0, common_1.Get)('session'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_READ),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "session", null);
__decorate([
    (0, common_1.Get)('rbac/catalog'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.RBAC_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], AdminSecurityController.prototype, "catalog", null);
__decorate([
    (0, common_1.Get)('rbac/roles'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.RBAC_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "listRoles", null);
__decorate([
    (0, common_1.Post)('rbac/roles'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.RBAC_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "createRole", null);
__decorate([
    (0, common_1.Patch)('rbac/roles/:id'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.RBAC_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "updateRole", null);
__decorate([
    (0, common_1.Delete)('rbac/roles/:id'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.RBAC_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "deleteRole", null);
__decorate([
    (0, common_1.Post)('rbac/users/:userId/roles'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.USER_EDIT, permissions_1.Permission.RBAC_MANAGE),
    __param(0, (0, common_1.Param)('userId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminSecurityController.prototype, "assignUserRoles", null);
exports.AdminSecurityController = AdminSecurityController = __decorate([
    (0, common_1.Controller)('admin'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminSecurityController);
//# sourceMappingURL=admin-security.controller.js.map