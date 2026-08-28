import { BadRequestException, Body, Controller, Delete, ForbiddenException, Get, NotFoundException, Param, Patch, Post, Query, UseGuards, ConflictException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import {
  Permission, ROLE_PERMISSIONS, RequirePermissions,
  PERMISSION_LABELS_AR,
} from '../../common/permissions';
import { UserRole } from '../../common/enums';
import {
  CUSTOM_ROLE_KEY_RE, mergePermissions, roleSatisfies, sanitizePermissions, validateReason,
} from '../../common/rbac';
import { invalidateDynamicRoleCache } from '../../common/auth.guard';
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

  @Get('session')
  @RequirePermissions(Permission.USER_READ)
  async session(@CurrentUser() me: any) {
    const dbUser: any = await this.conn.collection('users').findOne(
      { id: me.id },
      { projection: { id: 1, full_name: 1, email: 1, phone: 1, role: 1, permissions: 1, custom_role_keys: 1 } },
    );
    if (!dbUser) throw new NotFoundException('admin_user_not_found');
    const staticPerms = mergePermissions(
      ...[me.role].map((r) => ROLE_PERMISSIONS[r as UserRole] || []),
      dbUser.permissions || [],
    );
    let customPerms: string[] = [];
    const keys = dbUser.custom_role_keys || [];
    if (keys.length) {
      const docs = await this.conn.collection('admin_custom_roles').find({ key: { $in: keys } }).toArray().catch(() => []);
      customPerms = mergePermissions(...docs.map((d) => d?.permissions || []));
    }
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
      is_super_admin: roleSatisfies('super_admin', [dbUser.role]),
      permissions: mergePermissions(staticPerms, customPerms),
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
  async createRole(@Body() b: any, @CurrentUser() me: any) {
    const reason = validateReason(b?.reason); // fail fast BEFORE any write
    const key = String(b?.key || '').trim();
    if (!CUSTOM_ROLE_KEY_RE.test(key)) throw new BadRequestException('invalid_role_key_format');
    const nameAr = String(b?.name_ar || '').trim();
    if (!nameAr) throw new BadRequestException('name_ar_required');
    const exists = await this.conn.collection('admin_custom_roles').findOne({ key });
    if (exists) throw new ConflictException('role_key_exists');
    if ((b.system_protected_keys || []).includes?.(key)) throw new ConflictException('reserved_key');

    const permissions = sanitizePermissions(b?.permissions, CATALOG);
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
  async updateRole(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    const reason = validateReason(b?.reason);
    const before: any = await this.conn.collection('admin_custom_roles').findOne({ id });
    if (!before) throw new NotFoundException('role_not_found');
    if (before.is_system) throw new ForbiddenException('system_roles_immutable');
    const $set: any = { updatedAt: new Date(), updated_by: me.id };
    if (b?.name_ar !== undefined) $set.name_ar = String(b.name_ar).trim();
    if (b?.description_ar !== undefined) $set.description_ar = String(b.description_ar).trim() || null;
    if (b?.permissions !== undefined) $set.permissions = sanitizePermissions(b.permissions, CATALOG);
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
  async deleteRole(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
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
  async assignUserRoles(@Param('userId') userId: string, @Body() b: any, @CurrentUser() me: any) {
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

    const nextKeys = [...new Set(requestedKeys)].sort();
    await this.conn.collection('users').updateOne({ id: userId }, { $set: { custom_role_keys: nextKeys } });
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
