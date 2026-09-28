import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, getEffectiveRoles } from '../../../common/auth.guard';
import { Permission, RequirePermissions } from '../../../common/permissions';
import { UserRole } from '../../../common/enums';
import { validateReason, MIN_FINANCIAL_REASON_LENGTH, ReasonError, roleSatisfies } from '../../../common/rbac';
import { AdminAuditService } from './audit.service';
import { RefundExecutor } from '../../finance-engine/finance-engine.module';
import { ResolveDto } from './admin-disputes.dto';

/**
 * A1 — REAL dispute queue (replaces the previous 503 stub).
 *
 * Source of truth: `supportrequests` (SupportRequest model) where the category is a financial /
 * order complaint. Money decisions execute a REAL refund through the original
 * payment method (RefundExecutor — A2, no wallet) and every decision is
 * RBAC-gated + reason-mandatory + audit-logged.
 */
@Controller('admin/disputes')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminDisputesController {
  /** Hard cap per single dispute refund (safety rail, SAR). */
  private readonly maxRefund = Number(process.env.DISPUTE_MAX_REFUND_SAR || 2000);

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
    private readonly refundExec: RefundExecutor,
  ) {}

  private static DISPUTE_CATEGORIES = ['COMPLAINT', 'PAYMENT', 'ORDER_ISSUE'];

  @Get()
  async list(
    @Query('status') status = 'open',
    @Query('category') category?: string,
    @Query('q') q?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '25',
  ) {
    const p = Math.max(1, parseInt(page, 10) || 1);
    const l = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const base: any = {
      category: category
        ? String(category).toUpperCase()
        : { $in: AdminDisputesController.DISPUTE_CATEGORIES },
    };
    if (status === 'open') base.status = { $in: ['OPEN', 'IN_PROGRESS'] };
    else if (status && status !== 'all') base.status = String(status).toUpperCase();
    if (q?.trim()) {
      const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      base.$or = [{ subject: rx }, { message: rx }, { user_name: rx }, { user_phone: rx }, { tracking_id: rx }];
    }

    const col = this.conn.collection('supportrequests');
    const [items, total, byStatus] = await Promise.all([
      col.find(base).sort({ priority: -1, createdAt: -1 }).skip((p - 1) * l).limit(l)
        .project({ _id: 0, thread: 0 })
        .toArray(),
      col.countDocuments(base),
      col.aggregate([
        { $match: { category: base.category === undefined ? base.category : base.category } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]).toArray().catch(() => []),
    ]);

    // Financial overlay: any wallet credits already issued against these tickets.
    const ids = (items as any[]).map((t) => t.id);
    const refunds = ids.length ? await this.conn.collection('wallet_transactions')
      .find({ referenceType: 'refund', referenceId: { $in: ids }, type: 'credit' })
      .project({ referenceId: 1, amount: 1 })
      .toArray().catch(() => []) : [];
    const refundMap = new Map<string, number>();
    for (const r of refunds as any[]) refundMap.set(r.referenceId, (refundMap.get(r.referenceId) || 0) + Number(r.amount || 0));

    // P6.x-15: SLA timers — dispute resolution deadline from the `sla`
    // system_config (fallback 48h), surfaced per row for the disputes center.
    const slaCfg: any = await this.conn.collection('system_configs').findOne({ key: 'sla' }).catch(() => null);
    const slaHours = Number(slaCfg?.value?.dispute_hours) > 0 ? Number(slaCfg.value.dispute_hours) : 48;
    const nowMs = Date.now();
    const withSla = (t: any) => {
      const created = t.createdAt ? new Date(t.createdAt).getTime() : nowMs;
      const due = created + slaHours * 3600000;
      const open = ['OPEN', 'IN_PROGRESS'].includes(String(t.status));
      return { sla_due_at: new Date(due).toISOString(), sla_breached: open && nowMs > due, sla_hours_left: open ? Math.max(0, Math.round((due - nowMs) / 3600000)) : null };
    };

    return {
      data: (items as any[]).map((t) => ({
        id: t.id,
        tracking_id: t.tracking_id || null,
        patient: { id: t.user_id, name: t.user_name || null, phone: t.user_phone || null },
        category: t.category,
        subject: t.subject,
        message: t.message,
        status: t.status,
        priority: t.priority,
        source_role: t.source_role,
        refunded_so_far: refundMap.get(t.id) || 0,
        created_at: t.createdAt,
        resolved_at: t.resolved_at || null,
        ...withSla(t),
      })),
      stats: Object.fromEntries((byStatus as any[]).map((s) => [String(s._id || 'unknown'), s.count])),
      total, page: p, pages: Math.ceil(total / l),
    };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const t: any = await this.conn.collection('supportrequests').findOne({ id }, { projection: { _id: 0 } });
    if (!t) throw new NotFoundException('dispute_not_found');
    const refunds = await this.conn.collection('wallet_transactions')
      .find({ referenceType: 'refund', referenceId: id, type: 'credit' }).project({ _id: 0, amount: 1, description: 1, createdAt: 1 }).toArray();
    return { ...t, refunds };
  }

  /**
   * Resolve a dispute.
   * body: { decision: refund_full | refund_partial | reject | close_no_action, amount?, reason }
   * Money decisions REQUIRE a ≥10-char reason and execute a REAL refund to the original payment method.
   */
  @Post(':id/resolve')
  @RequirePermissions(Permission.DISPUTES_RESOLVE)
  async resolve(@Param('id') id: string, @Body() b: ResolveDto, @CurrentUser() me: any) {
    const decision = String(b?.decision || '');
    if (!['refund_full', 'refund_partial', 'reject', 'close_no_action'].includes(decision)) {
      throw new BadRequestException('invalid_decision');
    }
    const isMoney = decision.startsWith('refund');
    let reason: string;
    try {
      reason = validateReason(b?.reason, isMoney ? MIN_FINANCIAL_REASON_LENGTH : 5);
    } catch (e) {
      if (e instanceof ReasonError) throw new BadRequestException(e.code);
      throw e;
    }
    if (isMoney && !roleSatisfies('admin', [...getEffectiveRoles(me), ...(me.permissions || [])])) {
      // permission gate already enforced by guard; explicit double-check for money paths
      throw new ForbiddenException('insufficient_permissions');
    }

    const ticket: any = await this.conn.collection('supportrequests').findOne({ id });
    if (!ticket) throw new NotFoundException('dispute_not_found');
    if (['RESOLVED', 'CLOSED'].includes(String(ticket.status))) {
      throw new ConflictException('dispute_already_resolved');
    }
    if (!AdminDisputesController.DISPUTE_CATEGORIES.includes(String(ticket.category))) {
      throw new BadRequestException('not_a_dispute_category');
    }

    let creditedAmount = 0;
    if (decision === 'refund_partial') {
      const amt = Math.round(Number(b?.amount) * 100) / 100;
      if (!Number.isFinite(amt) || amt <= 0) throw new BadRequestException('amount_required_positive');
      if (amt > this.maxRefund) throw new BadRequestException(`amount_exceeds_cap_${this.maxRefund}`);
      creditedAmount = amt;
    } else if (decision === 'refund_full') {
      const amt = Math.round(Number(b?.amount) * 100) / 100;
      creditedAmount = Number.isFinite(amt) && amt > 0 ? Math.min(amt, this.maxRefund) : this.maxRefund;
    }

    if (creditedAmount > 0) {
      // A2: the dispute refund executes against a real booking through the
      // original payment method — never a wallet credit.
      const bookingKind = String((b as any)?.booking_kind || '').trim().toLowerCase();
      const bookingId = String((b as any)?.booking_id || '').trim();
      if (!bookingKind || !bookingId) throw new BadRequestException('booking_kind and booking_id are required for a refund decision');
      const { v4: uuidv4 } = require('uuid');
      await this.refundExec.execute({
        refund_id: `dispute_${ticket.id}_${uuidv4()}`,
        booking_kind: bookingKind,
        booking_id: bookingId,
        patient_id: ticket.user_id,
        amount: creditedAmount,
        reason: `dispute ${ticket.id}: ${reason}`.slice(0, 180),
        actor_id: me.id,
      });
    }

    const resolutionEntry = {
      by: me.id,
      role: 'admin',
      message: `[resolution:${decision}] ${reason}${creditedAmount ? ` — مبلغ ${creditedAmount} ر.س يُرد لوسيلة الدفع الأصلية` : ''}`,
      at: new Date(),
    };
    await this.conn.collection('supportrequests').updateOne(
      { id },
      { $set: { status: 'RESOLVED', resolved_at: new Date(), resolved_by: me.id, resolution_decision: decision }, $push: { thread: resolutionEntry } } as any,
    );

    await this.audit.write({
      action: `dispute_${decision}`,
      actor: me,
      target_type: 'support_request',
      target_id: id,
      reason,
      before: { status: ticket.status },
      after: { status: 'RESOLVED', decision, credited_amount: creditedAmount || null },
      meta: { patient_id: ticket.user_id, category: ticket.category },
    });

    return {
      ok: true,
      id,
      decision,
      credited_amount: creditedAmount || null,
      status: 'RESOLVED',
    };
  }
}
