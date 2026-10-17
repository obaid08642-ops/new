import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards, ConflictException } from '@nestjs/common';
import { CreateRoleDto, UpdateRoleDto, DeleteRoleDto, AssignUserRolesDto } from './admin-security.dto';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../../common/auth.guard';
import {
  Permission, ROLE_PERMISSIONS, RequirePermissions,
  PERMISSION_LABELS_AR,
} from '../../../common/permissions';
import { UserRole } from '../../../common/enums';
import {
  CUSTOM_ROLE_KEY_RE, sanitizePermissions, validateReason,
} from '../../../common/rbac';
import { invalidateDynamicRoleCache } from '../../../common/auth.guard';
import { resolveStaffAccess } from '../../../common/effective-permissions';
import { AdminAuditService } from './audit.service';

const CATALOG = Object.values(Permission) as string[];

/**
 * A1 — server-side identity + dynamic RBAC.
 *
 * `GET /admin/session` is the single source of truth the admin panel boots
 * from (replaces localStorage role/token reads entirely): HttpOnly cookie →
 * JwtAuthGuard → effective permission set (static matrix ∪ JWT grants ∪
 * custom roles).
 */
@Controller('admin')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminSecurityController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  /**
   * Owner decision 29: roles are restrictive, so a staff member who may manage roles must not grant more than they
   * hold. Only the owner grants a permission they have not been given, or changes their own roles.
   */
  private async assertCanGrant(me: any, permissions: string[]) {
    const access = await resolveStaffAccess(this.conn, me);
    if (access.is_owner) return;
    const held = new Set(access.permissions);
    const beyond = permissions.filter((p) => !held.has(p));
    if (beyond.length) throw new ForbiddenException(`cannot_grant_unheld_permissions:${beyond.join(',')}`);
  }

  // ── Identity ─────────────────────────────────────────────────

  /** Paginated, filterable read of the immutable admin_actions_log. */
  @Get('audit')
  @RequirePermissions(Permission.DATA_EXPORT)
  auditLog(
    @Query('action') action?: string,
    @Query('admin_id') adminId?: string,
    @Query('target_type') targetType?: string,
    @Query('target_id') targetId?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    return this.audit.list(
      { action, admin_id: adminId, target_type: targetType, target_id: targetId, from, to },
      parseInt(page, 10) || 1,
      parseInt(limit, 10) || 50,
    );
  }

  // Every admin reads their own session (the panel boots from it); it needs no permission beyond the admin role,
  // otherwise a role without user.read could not open any page.
  @Get('session')
  async session(@CurrentUser() me: any) {
    const dbUser: any = await this.conn.collection('users').findOne(
      { id: me.id },
      { projection: { id: 1, full_name: 1, email: 1, phone: 1, role: 1, permissions: 1, custom_role_keys: 1 } },
    );
    if (!dbUser) throw new NotFoundException('admin_user_not_found');
    // The same resolver as the guard, so the panel shows exactly what the backend allows (owner decision 29).
    const access = await resolveStaffAccess(this.conn, me);
    const keys = dbUser.custom_role_keys || [];
    return {
      user: {
        id: dbUser.id,
        full_name: dbUser.full_name || null,
        email: dbUser.email || null,
        phone: dbUser.phone || null,
        role: dbUser.role,
        // Present when this session token was minted via audited impersonation
        impersonator: (me as any).impersonator
          ? { id: (me as any).impersonator.id, full_name: (me as any).impersonator.full_name }
          : null,
      },
      custom_role_keys: keys,
      is_super_admin: access.is_owner,
      permissions: access.permissions,
    };
  }

  // ── RBAC catalog ─────────────────────────────────────────────

  /** Full permission catalog with Arabic labels + per-system-role defaults. */
  @Get('rbac/catalog')
  @RequirePermissions(Permission.RBAC_MANAGE)
  catalog() {
    const systemRoles = Object.entries(ROLE_PERMISSIONS).map(([role, perms]) => ({
      key: role,
      label_ar: role === 'super_admin' ? 'المالك الأعلى' : role === 'admin' ? 'مدير منصة' : role,
      permission_count: (perms as string[]).length,
      is_system: true,
    }));
    return {
      permissions: CATALOG.map((key) => ({ key, label_ar: PERMISSION_LABELS_AR[key] || key })),
      system_roles: systemRoles,
    };
  }

  @Get('rbac/roles')
  @RequirePermissions(Permission.RBAC_MANAGE)
  async listRoles() {
    const docs = await this.conn.collection('admin_custom_roles').find({}).sort({ createdAt: -1 }).toArray();
    const usage = await this.conn.collection('users').aggregate([
      { $match: { custom_role_keys: { $exists: true, $ne: [] } } },
      { $unwind: '$custom_role_keys' },
      { $group: { _id: '$custom_role_keys', users: { $sum: 1 } } },
    ]).toArray();
    const usageMap = new Map((usage as any[]).map((u) => [u._id, u.users]));
    return docs.map(({ _id, ...r }: any) => ({ ...r, assigned_users: usageMap.get(r.key) || 0 }));
  }

  @Post('rbac/roles')
  @RequirePermissions(Permission.RBAC_MANAGE)
  async createRole(@Body() b: CreateRoleDto, @CurrentUser() me: any) {
    const reason = validateReason(b?.reason); // fail fast BEFORE any write
    const key = String(b?.key || '').trim();
    if (!CUSTOM_ROLE_KEY_RE.test(key)) throw new BadRequestException('invalid_role_key_format');
    const nameAr = String(b?.name_ar || '').trim();
    if (!nameAr) throw new BadRequestException('name_ar_required');
    const exists = await this.conn.collection('admin_custom_roles').findOne({ key });
    if (exists) throw new ConflictException('role_key_exists');
    if ((b.system_protected_keys || []).includes?.(key)) throw new ConflictException('reserved_key');

    const permissions = sanitizePermissions(b?.permissions, CATALOG);
    await this.assertCanGrant(me, permissions);
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
    await this.conn.collection('admin_custom_roles').insertOne(doc as any);
    invalidateDynamicRoleCache();
    await this.audit.write({
      action: 'rbac_role_create', actor: me, target_type: 'admin_custom_role', target_id: doc.id,
      after: { key, name_ar: nameAr, permission_count: permissions.length },
      reason,
    });
    const { _id, ...clean } = doc as any;
    return clean;
  }

  @Patch('rbac/roles/:id')
  @RequirePermissions(Permission.RBAC_MANAGE)
  async updateRole(@Param('id') id: string, @Body() b: UpdateRoleDto, @CurrentUser() me: any) {
    const reason = validateReason(b?.reason);
    const before: any = await this.conn.collection('admin_custom_roles').findOne({ id });
    if (!before) throw new NotFoundException('role_not_found');
    if (before.is_system) throw new ForbiddenException('system_roles_immutable');
    const $set: any = { updatedAt: new Date(), updated_by: me.id };
    if (b?.name_ar !== undefined) $set.name_ar = String(b.name_ar).trim();
    if (b?.description_ar !== undefined) $set.description_ar = String(b.description_ar).trim() || null;
    if (b?.permissions !== undefined) {
      $set.permissions = sanitizePermissions(b.permissions, CATALOG);
      await this.assertCanGrant(me, $set.permissions);
    }
    await this.conn.collection('admin_custom_roles').updateOne({ id }, { $set });
    invalidateDynamicRoleCache();

    await this.audit.write({
      action: 'rbac_role_update', actor: me, target_type: 'admin_custom_role', target_id: id,
      reason,
      before: { name_ar: before.name_ar, permissions: before.permissions },
      after: { name_ar: $set.name_ar ?? before.name_ar, permissions: $set.permissions ?? before.permissions },
    });
    const after: any = await this.conn.collection('admin_custom_roles').findOne({ id }, { projection: { _id: 0 } });
    return after;
  }

  @Delete('rbac/roles/:id')
  @RequirePermissions(Permission.RBAC_MANAGE)
  async deleteRole(@Param('id') id: string, @Body() b: DeleteRoleDto, @CurrentUser() me: any) {
    const reason = validateReason(b?.reason);
    const before: any = await this.conn.collection('admin_custom_roles').findOne({ id });
    if (!before) throw new NotFoundException('role_not_found');
    if (before.is_system) throw new ForbiddenException('system_roles_immutable');
    const assigned = await this.conn.collection('users').countDocuments({ custom_role_keys: before.key });
    if (assigned > 0) throw new ConflictException(`role_assigned_to_${assigned}_users_unassign_first`);
    await this.conn.collection('admin_custom_roles').deleteOne({ id });
    invalidateDynamicRoleCache();
    await this.audit.write({
      action: 'rbac_role_delete', actor: me, target_type: 'admin_custom_role', target_id: id,
      reason, before: { key: before.key, permissions: before.permissions },
    });
    return { ok: true, deleted: id };
  }

  /** Assign/unassign custom roles to an admin account. */
  @Post('rbac/users/:userId/roles')
  @RequirePermissions(Permission.USER_EDIT, Permission.RBAC_MANAGE)
  async assignUserRoles(@Param('userId') userId: string, @Body() b: AssignUserRolesDto, @CurrentUser() me: any) {
    const target: any = await this.conn.collection('users').findOne({ id: userId }, { projection: { id: 1, role: 1, full_name: 1, email: 1, custom_role_keys: 1 } });
    if (!target) throw new NotFoundException('user_not_found');
    if (!['admin', 'super_admin', 'support_agent'].includes(String(target.role))) {
      throw new ForbiddenException('custom_roles_apply_to_staff_only');
    }
    const requestedKeys: string[] = Array.isArray(b?.custom_role_keys) ? b.custom_role_keys.map(String) : [];
    const knownDocs = requestedKeys.length
      ? await this.conn.collection('admin_custom_roles').find({ key: { $in: requestedKeys } }).toArray()
      : [];
    const known = new Set((knownDocs as any[]).map((d) => d.key));
    const unknown = requestedKeys.filter((k) => !known.has(k));
    if (unknown.length) throw new BadRequestException(`unknown_role_keys:${unknown.join(',')}`);

    if (String(userId) === String(me?.id) && !(await resolveStaffAccess(this.conn, me)).is_owner) {
      throw new ForbiddenException('cannot_change_own_roles');
    }
    await this.assertCanGrant(me, (knownDocs as any[]).flatMap((d) => (Array.isArray(d?.permissions) ? d.permissions.map(String) : [])));
    const nextKeys = [...new Set(requestedKeys)].sort();
    // F09: role change revokes the staffer's sessions — they re-login with new permissions.
    await this.conn.collection('users').updateOne({ id: userId }, { $set: { custom_role_keys: nextKeys }, $inc: { token_version: 1 } });
    invalidateDynamicRoleCache();
    await this.audit.write({
      action: 'rbac_user_roles_assign', actor: me, target_type: 'user', target_id: userId,
      reason: validateReason(b?.reason),
      before: { custom_role_keys: target.custom_role_keys || [] },
      after: { custom_role_keys: nextKeys },
    });
    return { ok: true, user_id: userId, custom_role_keys: nextKeys };
  }
}
