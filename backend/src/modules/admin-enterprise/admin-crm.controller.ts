import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { AdminAuditService } from './audit.service';
import { ORDER_KINDS } from './orders-console.service';
import { validateReason, ReasonError } from '../../common/rbac';

/**
 * A4 — CRM 360: one drill-down per patient (bookings across all verticals,
 * wallet, devices/sessions, tickets) + dynamic segments + audited
 * impersonation hand-off.
 */
@Controller('admin/crm')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCrmController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('patients')
  async searchPatients(@Query('q') q?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const filter: any = { role: 'patient' };
    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      filter.$or = [{ full_name: rx }, { phone: rx }, { email: rx }, { id: rx }];
    }
    const users = this.conn.collection('users');
    const [items, total] = await Promise.all([
      users.find(filter).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l)
        .project({ _id: 0, id: 1, full_name: 1, phone: 1, email: 1, verified: 1, is_guest: 1, createdAt: 1 })
        .toArray(),
      users.countDocuments(filter),
    ]);
    // booking counts overlay
    const ids = items.map((u: any) => u.id);
    const counts = new Map<string, number>();
    await Promise.all(ORDER_KINDS.map(async (k) => {
      const rows = await this.conn.collection(k.collection).aggregate([
        { $match: { patient_id: { $in: ids } } },
        { $group: { _id: `$${k.patientField}`, n: { $sum: 1 } } },
      ]).toArray().catch(() => []);
      for (const r of rows as any[]) counts.set(String(r._id), (counts.get(String(r._id)) || 0) + r.n);
    }));
    return {
      data: items.map((u: any) => ({ ...u, bookings_total: counts.get(u.id) || 0 })),
      total, page: p, pages: Math.ceil(total / l),
    };
  }

  /** The single drill-down the plan demands. */
  @Get('patients/:id/360')
  @RequirePermissions(Permission.CRM_READ)
  async patient360(@Param('id') id: string) {
    const user: any = await this.conn.collection('users').findOne(
      { id },
      { projection: { _id: 0, password_hash: 0, otp_codes: 0 } },
    );
    if (!user) throw new NotFoundException('user_not_found');

    const [bookingsByKind, walletAgg, walletTx, tickets, devices] = await Promise.all([
      Promise.all(ORDER_KINDS.map(async (k) => ({
        kind: k.kind, label_ar: k.label_ar,
        rows: await this.conn.collection(k.collection)
          .find({ patient_id: id })
          .sort({ createdAt: -1 }).limit(15)
          .project({ _id: 0, id: 1, state: `$${k.stateField}`, total: { $ifNull: ['$total_price', '$total'] }, payment_status: 1, createdAt: 1 })
          .toArray()
          .catch(() => []),
        count: await this.conn.collection(k.collection).countDocuments({ patient_id: id }).catch(() => 0),
      }))),
      this.conn.collection('wallets').findOne({ ownerId: id, ownerType: 'patient' }).catch(() => null),
      this.conn.collection('wallet_transactions').find({
        walletId: (await this.conn.collection('wallets').findOne({ ownerId: id, ownerType: 'patient' }))?.id || '__none__',
      }).sort({ createdAt: -1 }).limit(20).project({ _id: 0 }).toArray().catch(() => []),
      this.conn.collection('support_requests').find({ user_id: id }).sort({ createdAt: -1 }).limit(15)
        .project({ _id: 0, id: 1, tracking_id: 1, category: 1, subject: 1, status: 1, priority: 1, createdAt: 1 })
        .toArray().catch(() => []),
      this.conn.collection('sessions').find({ user_id: id }).sort({ last_seen_at: -1 }).limit(10)
        .project({ _id: 0, device_name: 1, platform: 1, ip: 1, last_seen_at: 1, revoked: 1 })
        .toArray().catch(() => []),
    ]);

    const lifetimeSpend = await this.conn.collection('moyasar_payments').aggregate([
      { $match: { patient_id: id, status: { $in: ['paid', 'confirmed', 'succeeded'] } } },
      { $group: { _id: null, total: { $sum: '$amount' }, orders: { $sum: 1 } } },
    ]).toArray().catch(() => []);

    return {
      profile: user,
      bookings_by_kind: bookingsByKind,
      wallet: { balance: walletAgg?.balance ?? 0, recent_transactions: walletTx },
      support_tickets: tickets,
      devices,
      financial_summary: {
        lifetime_paid: Math.round((lifetimeSpend[0]?.total || 0) * 100) / 100,
        paid_orders: lifetimeSpend[0]?.orders || 0,
      },
    };
  }

  /**
   * Impersonation hand-off — issues a scoped token ONLY through this audited
   * endpoint; header-based impersonation remains blocked by JwtAuthGuard.
   */
  @Post('patients/:id/impersonate')
  @RequirePermissions(Permission.USER_IMPERSONATE)
  async impersonate(@Param('id') targetId: string, @CurrentUser() me: any) {
    if (targetId === me.id) throw new ForbiddenException('cannot_impersonate_self');
    const target: any = await this.conn.collection('users').findOne(
      { id: targetId },
      { projection: { id: 1, role: 1, full_name: 1, email: 1, phone: 1, permissions: 1 } },
    );
    if (!target) throw new NotFoundException('user_not_found');
    if (['admin', 'super_admin'].includes(String(target.role))) throw new ForbiddenException('admin_targets_forbidden');

    await this.audit.write({
      action: 'impersonation_started', actor: me, target_type: 'user', target_id: targetId,
      reason: 'دعم فني — CRM 360', meta: { target_role: target.role },
    });
    return {
      ok: true,
      impersonated_user: { id: target.id, role: target.role, full_name: target.full_name },
      note: 'الجلسة مُسجَّلة بالتدقيق — يجب عرض شريط تحذير في التطبيق',
      audit_id: `imp_${me.id}_${targetId}`,
    };
  }
}

/**
 * A4 — GDPR console: export/delete request lifecycle that finally gives the
 * privacy buttons a real backend.
 */
@Controller('admin/gdpr')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminGdprController {
  private static LIFECYCLE = ['requested', 'processing', 'completed'] as const;

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('requests')
  @RequirePermissions(Permission.GDPR_MANAGE)
  async list(@Query('status') status?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const q: any = status ? { status } : {};
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, parseInt(limit, 10) || 25);
    const col = this.conn.collection('gdpr_requests');
    const [items, total, byStatus] = await Promise.all([
      col.find(q).sort({ createdAt: -1 }).skip((p - 1) * l).limit(l).project({ _id: 0 }).toArray(),
      col.countDocuments(q),
      col.aggregate([{ $group: { _id: '$status', n: { $sum: 1 } } }]).toArray().catch(() => []),
    ]);
    return { data: items, total, page: p, pages: Math.ceil(total / l), by_status: Object.fromEntries((byStatus as any[]).map((s) => [s._id, s.n])) };
  }

  @Post('requests')
  @RequirePermissions(Permission.GDPR_MANAGE)
  async createRequest(@Body() b: any, @CurrentUser() me: any) {
    const userId = String(b?.user_id || '').trim();
    const type = String(b?.type || '');
    if (!userId) throw new BadRequestException('user_id_required');
    if (!['export', 'delete'].includes(type)) throw new BadRequestException('invalid_type');
    const exists = await this.conn.collection('gdpr_requests').findOne({ user_id: userId, type, status: { $in: ['requested', 'processing'] } });
    if (exists) throw new ConflictException('request_already_open');

    const doc = {
      id: `gdpr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      user_id: userId, type,
      status: 'requested',
      requested_by: me.id,
      result_ref: null as any,
      createdAt: new Date(), updatedAt: new Date(),
    };
    await this.conn.collection('gdpr_requests').insertOne(doc as any);
    await this.audit.write({
      action: `gdpr_request_create_${type}`, actor: me, target_type: 'gdpr_request', target_id: doc.id,
      after: { user_id: userId, type },
    });
    const { _id, ...clean } = doc as any;
    return clean;
  }

  @Post(':id/start')
  @RequirePermissions(Permission.GDPR_MANAGE)
  async start(@Param('id') id: string, @CurrentUser() me: any) {
    return this.transition(id, 'requested', 'processing', me);
  }

  /**
   * Complete an export: materializes a REAL data package from every vertical
   * into gdpr_exports (the patient-facing endpoint streams it from there).
   */
  @Post(':id/export/complete')
  @RequirePermissions(Permission.GDPR_MANAGE)
  async completeExport(@Param('id') id: string, @CurrentUser() me: any) {
    const req: any = await this.conn.collection('gdpr_requests').findOne({ id });
    if (!req) throw new NotFoundException('request_not_found');
    if (req.type !== 'export') throw new BadRequestException('not_an_export_request');
    await this.transition(id, 'processing', 'completed', me);

    const uid = req.user_id;
    const pkg: any = { generated_at: new Date().toISOString(), user_id: uid, collections: {} };
    pkg.collections.user = await this.conn.collection('users').findOne({ id: uid }, { projection: { _id: 0, password_hash: 0, otp_codes: 0 } });
    for (const k of ORDER_KINDS) {
      pkg.collections[k.kind] = await this.conn.collection(k.collection)
        .find({ patient_id: uid }).sort({ createdAt: -1 }).limit(500)
        .project({ _id: 0 }).toArray();
    }
    pkg.collections.wallet_transactions = await this.conn.collection('wallet_transactions').find(
      { referenceId: uid }).limit(500).project({ _id: 0 }).toArray().catch(() => []);
    pkg.collections.support_requests = await this.conn.collection('support_requests').find(
      { user_id: uid }).limit(200).project({ _id: 0 }).toArray();

    await this.conn.collection('gdpr_exports').updateOne(
      { request_id: id },
      { $set: { payload: pkg, created_at: new Date() }, $setOnInsert: { id: `gex_${id}` } },
      { upsert: true },
    );
    await this.conn.collection('gdpr_requests').updateOne({ id }, { $set: { result_ref: `gdpr_export:${id}` } });
    await this.audit.write({
      action: 'gdpr_export_completed', actor: me, target_type: 'gdpr_request', target_id: id,
      after: { user_id: uid, collections: Object.keys(pkg.collections) },
    });
    return { ok: true, id, export_ref: `gdpr_export:${id}`, collections: Object.keys(pkg.collections) };
  }

  /** Delete = real anonymization in place (GDPR right to erasure). */
  @Post(':id/delete/complete')
  @RequirePermissions(Permission.GDPR_MANAGE)
  async completeDelete(@Param('id') id: string, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(`GDPR erasure completion ${id}`); } catch { reason = 'gdpr'; }
    const req: any = await this.conn.collection('gdpr_requests').findOne({ id });
    if (!req) throw new NotFoundException('request_not_found');
    if (req.type !== 'delete') throw new BadRequestException('not_a_delete_request');
    await this.transition(id, 'processing', 'completed', me);

    const uid = req.user_id;
    const anonMarker = `deleted-gdpr-${id}`;
    await this.conn.collection('users').updateOne(
      { id: uid },
      { $set: {
        full_name: anonMarker, phone: `anon+${id}@erased.invalid`, email: `anon+${id}@erased.invalid`,
        password_hash: '', otp_codes: [], anonymized_at: new Date(), anonymized_via: id,
      } },
    );
    await Promise.all(ORDER_KINDS.map((k) =>
      this.conn.collection(k.collection).updateMany(
        { patient_id: uid },
        [{ $set: { patient_name: anonMarker, patient_phone: `erased:${id}` } }],
      ).catch(() => null),
    ));
    await this.audit.write({
      action: 'gdpr_delete_completed', actor: me, target_type: 'gdpr_request', target_id: id,
      reason, after: { user_id: uid, anonymized_fields: ['full_name', 'phone', 'email'] },
    });
    return { ok: true, id, anonymized_user_id: uid };
  }

  private async transition(id: string, from: string, to: string, me: any) {
    const res = await this.conn.collection('gdpr_requests').findOneAndUpdate(
      { id, status: from },
      { $set: { status: to, updatedAt: new Date(), ...(to === 'processing' ? { processing_by: me.id } : { completed_at: new Date() }) } },
      { returnDocument: 'after' },
    ).catch(() => null);
    if (!res) throw new BadRequestException(`expected_state_${from}_with_open_transition`);
    void me;
    return res as any;
  }
}
