import { BadRequestException, Body, Controller, ConflictException, ForbiddenException, Get, Inject, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser, getEffectiveRoles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, MIN_FINANCIAL_REASON_LENGTH, ReasonError, roleSatisfies } from '../../common/rbac';
import { AdminAuditService } from './audit.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * A1 — REAL dispute queue (replaces the previous 503 stub).
 *
 * Source of truth: `support_requests` where the category is a financial /
 * order complaint. Resolution moves real money through WalletService.topup()
 * (the same audited internal-credit path used for refunds platform-wide) and
 * every decision is RBAC-gated + reason-mandatory + audit-logged.
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
    @Inject(WalletService) private readonly wallet: WalletService,
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

    const col = this.conn.collection('support_requests');
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
      })),
      stats: Object.fromEntries((byStatus as any[]).map((s) => [String(s._id || 'unknown'), s.count])),
      total, page: p, pages: Math.ceil(total / l),
    };
  }

  @Get(':id')
  async detail(@Param('id') id: string) {
    const t: any = await this.conn.collection('support_requests').findOne({ id }, { projection: { _id: 0 } });
    if (!t) throw new NotFoundException('dispute_not_found');
    const refunds = await this.conn.collection('wallet_transactions')
      .find({ referenceType: 'refund', referenceId: id, type: 'credit' }).project({ _id: 0, amount: 1, description: 1, createdAt: 1 }).toArray();
    return { ...t, refunds };
  }

  /**
   * Resolve a dispute.
   * body: { decision: refund_full | refund_partial | reject | close_no_action, amount?, reason }
   * Money decisions REQUIRE a ≥10-char reason and move REAL wallet credit.
   */
  @Post(':id/resolve')
  @RequirePermissions(Permission.DISPUTES_RESOLVE)
  async resolve(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
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

    const ticket: any = await this.conn.collection('support_requests').findOne({ id });
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
      await this.wallet.topup(
        ticket.user_id, 'patient',
        creditedAmount,
        `refund: ${reason}`.slice(0, 180),
        'refund',
        ticket.id,
      );
    }

    const resolutionEntry = {
      by: me.id,
      role: 'admin',
      message: `[resolution:${decision}] ${reason}${creditedAmount ? ` — مبلغ ${creditedAmount} ر.س إلى المحفظة` : ''}`,
      at: new Date(),
    };
    await this.conn.collection('support_requests').updateOne(
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
