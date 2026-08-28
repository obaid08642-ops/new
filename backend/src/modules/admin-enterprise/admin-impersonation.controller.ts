import { BadRequestException, Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { InjectConnection } from '@nestjs/mongoose';
import { JwtService } from '@nestjs/jwt';
import { Connection } from 'mongoose';
import { JwtAuthGuard, CurrentUser, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason } from '../../common/rbac';
import { AdminAuditService } from './audit.service';

@Controller('admin/impersonation')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminImpersonationController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly jwt: JwtService,
    private readonly audit: AdminAuditService,
  ) {}

  @Post('start')
  @RequirePermissions(Permission.USER_IMPERSONATE)
  async start(@Body() body: any, @CurrentUser() me: any, @Req() req: any) {
    const reason = validateReason(body?.reason);
    const targetId = String(body?.user_id || '').trim();
    const requestedMinutes = Number(body?.minutes || 15);
    const minutes = Number.isFinite(requestedMinutes) ? Math.max(1, Math.min(15, Math.floor(requestedMinutes))) : 15;
    if (!targetId || targetId === me.id) throw new BadRequestException('valid_different_target_required');
    const target: any = await this.conn.collection('users').findOne({ id: targetId }, { projection: { _id: 0, id: 1, role: 1, full_name: 1, email: 1, active: 1, suspended: 1 } });
    if (!target) throw new BadRequestException('impersonation_target_not_found');
    if (['admin', 'super_admin', 'support_agent'].includes(String(target.role))) throw new BadRequestException('staff_impersonation_forbidden');
    if (target.active === false || target.suspended === true) throw new BadRequestException('suspended_target_forbidden');
    const sessionId = `imp_${randomUUID()}`;
    const expiresAt = new Date(Date.now() + minutes * 60_000);
    await this.conn.collection('impersonation_sessions').insertOne({ id: sessionId, target_user_id: target.id, target_role: target.role, impersonator_id: me.id, reason, status: 'active', expiresAt, ip: req.auditInfo?.ip || null, user_agent: req.auditInfo?.userAgent || null, createdAt: new Date(), updatedAt: new Date() });
    const token = await this.jwt.signAsync({ id: target.id, sub: target.id, role: target.role, scope: 'impersonation', impersonation_session_id: sessionId, impersonator: { id: me.id, full_name: me.full_name || me.email || me.id }, permissions: [] }, { expiresIn: `${minutes}m` });
    await this.audit.write({ action: 'impersonation_start', actor: me, target_type: 'user', target_id: target.id, reason, after: { session_id: sessionId, expires_at: expiresAt, target_role: target.role } });
    const safe = { session_id: sessionId, target: { id: target.id, role: target.role, full_name: target.full_name || null }, expires_at: expiresAt.toISOString(), warning: 'هذه جلسة دعم قصيرة العمر ومقيدة بالمستخدم الهدف.' };
    return req.headers['x-admin-bff'] === 'support-session' ? { ...safe, token } : safe;
  }

  @Post(':id/revoke')
  @RequirePermissions(Permission.USER_IMPERSONATE)
  async revoke(@Param('id') id: string, @CurrentUser() me: any, @Body() body: any) {
    const reason = validateReason(body?.reason);
    const existing: any = await this.conn.collection('impersonation_sessions').findOne({ id });
    if (!existing) throw new BadRequestException('impersonation_session_not_found');
    if (existing.status !== 'active') return { ok: true, status: existing.status };
    await this.conn.collection('impersonation_sessions').updateOne({ id, status: 'active' }, { $set: { status: 'revoked', revoked_by: me.id, revoked_at: new Date(), updatedAt: new Date() } });
    await this.audit.write({ action: 'impersonation_revoke', actor: me, target_type: 'user', target_id: existing.target_user_id, reason, before: { session_id: id, status: 'active' }, after: { status: 'revoked' } });
    return { ok: true, status: 'revoked', session_id: id };
  }

  @Get()
  @RequirePermissions(Permission.USER_IMPERSONATE)
  async list(@CurrentUser() me: any): Promise<{ data: any[] }> {
    const data = await this.conn.collection('impersonation_sessions').find({ impersonator_id: me.id }, { projection: { _id: 0, token: 0 } }).sort({ createdAt: -1 }).limit(100).toArray();
    return { data };
  }
}
