import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { v4 as uuid } from 'uuid';
import { validateReason, MIN_FINANCIAL_REASON_LENGTH, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';

const PAID_STATUSES = ['paid', 'confirmed', 'succeeded'];
const VERTICALS: Record<string, string[]> = {
  consultation: ['consultation', 'appointment'],
  pharmacy: ['pharmacy-order', 'pharmacy', 'pharmacy_order'],
  lab: ['lab-booking', 'lab'],
  radiology: ['radiology-booking', 'radiology'],
  nursing: ['nursing', 'homecare', 'home_care'],
};

function verticalOf(bookingKind: unknown): string {
  const k = String(bookingKind || '').toLowerCase();
  for (const [v, aliases] of Object.entries(VERTICALS)) if (aliases.includes(k)) return v;
  return 'other';
}

export type Granularity = 'day' | 'week' | 'month';

/** Pure date-bucket key used by the revenue series (unit-tested). */
export function bucketKey(d: Date, g: Granularity): string {
  const dt = new Date(d);
  if (g === 'day') return dt.toISOString().slice(0, 10);
  if (g === 'week') {
    const t = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth(), dt.getUTCDate()));
    const dayNum = (t.getUTCDay() + 6) % 7; // Monday=0
    t.setUTCDate(t.getUTCDate() - dayNum);
    return `W${t.toISOString().slice(0, 10)}`;
  }
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}`;
}

export interface RevenueRow { bucket: string; vertical: string; gross: number; count: number }

export function seriesToRows(payments: Array<{ paid_at?: Date; createdAt?: Date; amount?: number; booking_kind?: string }>, g: Granularity): RevenueRow[] {
  const map = new Map<string, RevenueRow>();
  for (const p of payments) {
    const when = p.paid_at || p.createdAt;
    if (!when) continue;
    const bucket = bucketKey(new Date(when), g);
    const vertical = verticalOf(p.booking_kind);
    const key = `${bucket}|${vertical}`;
    const row = map.get(key) || { bucket, vertical, gross: 0, count: 0 };
    row.gross += Number(p.amount || 0);
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => a.bucket.localeCompare(b.bucket));
}

/** Pure MoM delta — current vs previous equal-length window per vertical. */
export function momComparison(rows: RevenueRow[], from: Date, to: Date, prevRows: RevenueRow[]) {
  const sumByVertical = (list: RevenueRow[]) => {
    const m: Record<string, { gross: number; count: number }> = {};
    for (const r of list) {
      m[r.vertical] = m[r.vertical] || { gross: 0, count: 0 };
      m[r.vertical].gross += r.gross;
      m[r.vertical].count += r.count;
    }
    return m;
  };
  const cur = sumByVertical(rows.filter((r) => r.bucket >= bucketKey(from, 'day') && r.bucket <= bucketKey(to, 'day')));
  const prevMap = sumByVertical(prevRows);
  const out: Array<{ vertical: string; current: number; previous: number; delta_pct: number | null }> = [];
  for (const [vertical, c] of Object.entries(cur)) {
    const prev = prevMap[vertical]?.gross || 0;
    out.push({ vertical, current: Math.round(c.gross * 100) / 100, previous: Math.round(prev * 100) / 100, delta_pct: prev > 0 ? Math.round(((c.gross - prev) / prev) * 1000) / 10 : null });
  }
  return out.sort((a, b) => b.current - a.current);
}

@Injectable()
export class FinanceSuiteService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  // ── Revenue ──────────────────────────────────────────────────

  async revenue(opts: { from: string; to: string; granularity: Granularity }) {
    const from = new Date(opts.from);
    const to = new Date(opts.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime()) || from > to) throw new BadRequestException('invalid_date_range');
    const spanMs = to.getTime() - from.getTime();

    const matchPaid = (f: Date, t: Date) => ({
      status: { $in: PAID_STATUSES },
      $or: [{ paid_at: { $gte: f, $lte: t } }, { paid_at: null, createdAt: { $gte: f, $lte: t } }],
    });

    const [curPayments, prevPayments] = await Promise.all([
      this.conn.collection('moyasar_payments').find(matchPaid(from, to))
        .project({ paid_at: 1, createdAt: 1, amount: 1, booking_kind: 1 }).toArray(),
      this.conn.collection('moyasar_payments').find(matchPaid(new Date(from.getTime() - spanMs - 1), new Date(from.getTime() - 1)))
        .project({ paid_at: 1, createdAt: 1, amount: 1, booking_kind: 1 }).toArray(),
    ]);

    const rows = seriesToRows(curPayments as any[], opts.granularity);
    const buckets = [...new Set(rows.map((r) => r.bucket))].sort();
    const series = buckets.map((b) => {
      const entry: any = { bucket: b };
      let total = 0;
      for (const r of rows.filter((x) => x.bucket === b)) {
        entry[r.vertical] = Math.round(r.gross * 100) / 100;
        total += r.gross;
      }
      entry.total = Math.round(total * 100) / 100;
      return entry;
    });

    const mom = momComparison(rows, from, to, seriesToRows(prevPayments as any[], opts.granularity));
    const refundsAgg = await this.conn.collection('moyasar_payments').aggregate([
      { $match: { status: 'refunded', refunded_at: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$refunded_amount' }, n: { $sum: 1 } } },
    ]).toArray().catch(() => []);
    const walletRefundsAgg = await this.conn.collection('wallet_transactions').aggregate([
      { $match: { type: 'credit', referenceType: 'refund', createdAt: { $gte: from, $lte: to } } },
      { $group: { _id: null, total: { $sum: '$amount' }, n: { $sum: 1 } } },
    ]).toArray().catch(() => []);

    return {
      granularity: opts.granularity,
      range: { from: opts.from, to: opts.to },
      series,
      mom,
      refunds: {
        gateway_refunded: Math.round((refundsAgg[0]?.total || 0) * 100) / 100,
        wallet_credits_issued: Math.round((walletRefundsAgg[0]?.total || 0) * 100) / 100,
      },
      totals: mom.reduce((a, r) => ({ ...a, [r.vertical]: r.current }), {} as Record<string, number>),
    };
  }

  /**
   * Commissions & VAT — computed SERVER-SIDE from finance_config (plan C:
   * removes the conflicting client-side computation).
   */
  async commissions(opts: { from: string; to: string }) {
    const from = new Date(opts.from);
    const to = new Date(opts.to);
    if (isNaN(from.getTime()) || isNaN(to.getTime())) throw new BadRequestException('invalid_date_range');
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
    if (!cfg) throw new NotFoundException('finance_config_missing');

    const rates: Record<string, number> = cfg.rates || {};
    const vatRate = Number(cfg.vat_rate ?? 0.15);
    const payments = await this.conn.collection('moyasar_payments').find({
      status: { $in: PAID_STATUSES },
      $or: [{ paid_at: { $gte: from, $lte: to } }, { paid_at: null, createdAt: { $gte: from, $lte: to } }],
    }).project({ amount: 1, booking_kind: 1 }).toArray();

    const byVertical: Record<string, { gross: number; commission: number; vat: number; net_to_provider: number; count: number }> = {};
    for (const p of payments as any[]) {
      const v = verticalOf(p.booking_kind);
      const gross = Number(p.amount || 0);
      const rate = Number(rates[v] ?? rates.default ?? 0);
      const commission = Math.round(gross * rate * 100) / 100;
      const vat = Math.round(commission * vatRate * 100) / 100;
      const row = byVertical[v] || { gross: 0, commission: 0, vat: 0, net_to_provider: 0, count: 0 };
      row.gross += gross; row.commission += commission; row.vat += vat; row.net_to_provider += gross - commission; row.count += 1;
      byVertical[v] = row;
    }
    const round = (o: any) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, Math.round(Number(v) * 100) / 100]));
    const totals = Object.values(byVertical).reduce((a: any, r: any) => ({
      gross: a.gross + r.gross, commission: a.commission + r.commission, vat: a.vat + r.vat, net_to_provider: a.net_to_provider + r.net_to_provider, count: a.count + r.count,
    }), { gross: 0, commission: 0, vat: 0, net_to_provider: 0, count: 0 });
    return {
      config_used: { rates, vat_rate: vatRate, source: 'finance_config:commissions' },
      by_vertical: Object.fromEntries(Object.entries(byVertical).map(([k, v]) => [k, round(v)])),
      totals: round(totals),
    };
  }

  async upsertCommissionConfig(body: { rates?: Record<string, number>; vat_rate?: number }, admin: any, rawReason: unknown) {
    const reason = validateReason(rawReason, MIN_FINANCIAL_REASON_LENGTH);
    const before: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' });
    const $set: any = { updatedAt: new Date(), updated_by: admin.id };
    if (body?.rates && typeof body.rates === 'object') {
      $set.rates = Object.fromEntries(Object.entries(body.rates).map(([k, v]) => {
        const n = Number(v);
        if (!Number.isFinite(n) || n < 0 || n > 0.9) throw new BadRequestException(`rate_out_of_range:${k}`);
        return [k, n];
      }));
    }
    if (body?.vat_rate !== undefined) {
      const vr = Number(body.vat_rate);
      if (!Number.isFinite(vr) || vr < 0 || vr > 0.5) throw new BadRequestException('vat_rate_out_of_range');
      $set.vat_rate = vr;
    }
    await this.conn.collection('finance_config').updateOne({ key: 'commissions' }, { $set }, { upsert: true });
    await this.audit.write({
      action: 'finance_config_update', actor: admin, target_type: 'finance_config', target_id: 'commissions',
      reason, before: before ? { rates: before.rates, vat_rate: before.vat_rate } : null,
      after: { rates: $set.rates, vat_rate: $set.vat_rate },
    });
    const after: any = await this.conn.collection('finance_config').findOne({ key: 'commissions' }, { projection: { _id: 0 } });
    return after;
  }

  // ── Reconciliation ───────────────────────────────────────────

  /** Daily Moyasar ↔ platform ledger diff report. */
  async reconciliation(dateStr: string) {
    const day = new Date(dateStr);
    if (isNaN(day.getTime())) throw new BadRequestException('invalid_date');
    const start = new Date(day.toISOString().slice(0, 10));
    const end = new Date(start.getTime() + 86_400_000);

    const gateway = await this.conn.collection('moyasar_payments').aggregate([
      { $match: { status: { $in: PAID_STATUSES }, $or: [{ paid_at: { $gte: start, $lt: end } }, { paid_at: null, createdAt: { $gte: start, $lt: end } }] } },
      { $group: { _id: '$booking_kind', total: { $sum: '$amount' }, n: { $sum: 1 }, ids: { $push: '$booking_id' } } },
    ]).toArray().catch(() => []);

    // Platform side: bookings whose payment_status marks them paid on that day.
    const kinds: Array<{ label: string; collection: string; stateField?: string }> = [
      { label: 'pharmacy', collection: 'orders' },
      { label: 'lab', collection: 'labbookings' },
      { label: 'radiology', collection: 'radiologybookings' },
      { label: 'nursing', collection: 'homecarebookings' },
      { label: 'consultation', collection: 'appointments' },
    ];
    const platformRows: any[] = [];
    for (const k of kinds) {
      const agg = await this.conn.collection(k.collection).aggregate([
        { $match: { payment_status: { $in: ['paid', 'confirmed'] }, paid_at: { $gte: start, $lt: end } } },
        { $group: { _id: null, total: { $sum: { $ifNull: ['$total_price', '$total'] } }, n: { $sum: 1 }, ids: { $push: '$id' } } },
      ]).toArray().catch(() => []);
      if (agg.length) platformRows.push({ vertical: k.label, total: Math.round((agg[0].total || 0) * 100) / 100, n: agg[0].n });
    }
    const gatewayTotal = Math.round((gateway as any[]).reduce((a: number, g: any) => a + Number(g.total || 0), 0) * 100) / 100;
    const platformTotal = Math.round(platformRows.reduce((a: number, r: any) => a + Number(r.total || 0), 0) * 100) / 100;

    const diffs: Array<{ type: string; detail: string }> = [];
    for (const g of gateway as any[]) {
      const mapped = platformRows.find((p) => VERTICALS[p.vertical]?.some(() => true));
      void mapped;
      diffs.push({ type: 'gateway_row', detail: `${g._id}: ${Math.round(g.total * 100) / 100} SAR across ${g.n} payments` });
    }
    for (const p of platformRows) diffs.push({ type: 'platform_row', detail: `${p.vertical}: ${p.total} SAR across ${p.n} bookings` });

    return {
      date: dateStr,
      gateway_total_sar: gatewayTotal,
      platform_total_sar: platformTotal,
      variance_sar: Math.round((gatewayTotal - platformTotal) * 100) / 100,
      gateway_rows: (gateway as any[]).map((g) => ({ kind: g._id, total: g.total, count: g.n })),
      platform_rows: platformRows,
      note: 'variance ≠ 0 ⇒ investigate refunded-but-marked-paid or COD/wallet flows missing gateway records',
    };
  }

  // ── Payout batches with maker-checker ────────────────────────

  private get withdrawals() { return this.conn.collection('providerwithdrawals'); }
  private dualThreshold(): number { return Number(process.env.PAYOUT_DUAL_APPROVAL_SAR || 10000); }

  async payoutQueue(status?: string, page = 1, limit = 25) {
    const q: any = status ? { state: String(status).toUpperCase() } : {};
    const l = Math.min(100, Math.max(1, limit));
    const [items, total, byState] = await Promise.all([
      this.withdrawals.find(q).sort({ createdAt: -1 }).skip((page - 1) * l).limit(l)
        .project({ _id: 0 }).toArray(),
      this.withdrawals.countDocuments(q),
      this.withdrawals.aggregate([{ $group: { _id: '$state', n: { $sum: 1 }, amount: { $sum: '$amount' } } }]).toArray().catch(() => []),
    ]);
    return {
      data: items,
      total, page, pages: Math.ceil(total / l),
      dual_approval_threshold_sar: this.dualThreshold(),
      by_state: (byState as any[]).map((s) => ({ state: s._id, count: s.n, amount: s.amount })),
    };
  }

  /**
   * Two-step approval: stage-one (maker) then completion (checker).
   * The same admin may never both request and approve, and large payouts
   * (≥ PAYOUT_DUAL_APPROVAL_SAR) require two distinct approvers.
   */
  async approvePayout(id: string, admin: any, rawReason: unknown, decision: 'approve' | 'reject') {
    const reason = validateReason(rawReason, MIN_FINANCIAL_REASON_LENGTH);
    const w: any = await this.withdrawals.findOne({ id });
    if (!w) throw new NotFoundException('payout_not_found');
    if (admin.id === w.provider_id) throw new ForbiddenException('cannot_approve_own_payout');
    if (['COMPLETED', 'REJECTED'].includes(String(w.state))) throw new BadRequestException(`already_${w.state.toLowerCase()}`);

    const needsDual = Number(w.amount) >= this.dualThreshold();
    if (decision === 'reject') {
      if (w.state !== 'PENDING_ADMIN_APPROVAL') throw new BadRequestException('not_rejectable_in_state_' + w.state);
      await this.withdrawals.updateOne({ id }, { $set: { state: 'REJECTED', rejected_by: admin.id, rejected_at: new Date(), rejection_reason: reason } });
      await this.audit.write({
        action: 'payout_reject', actor: admin, target_type: 'providerwithdrawals', target_id: id,
        reason, before: { state: w.state }, after: { state: 'REJECTED' },
      });
      return { ok: true, id, state: 'REJECTED' };
    }

    if (needsDual) {
      if (!w.approved_stage_one_by) {
        await this.withdrawals.updateOne({ id }, {
          $set: { approved_stage_one_by: admin.id, approved_stage_one_name: admin.full_name || admin.email || admin.id, approved_stage_one_at: new Date(), state: 'AWAITING_SECOND_APPROVAL' },
        });
        await this.audit.write({
          action: 'payout_approve_stage_one', actor: admin, target_type: 'providerwithdrawals', target_id: id,
          reason, before: { state: w.state }, after: { state: 'AWAITING_SECOND_APPROVAL' },
          meta: { amount: w.amount, dual_required: true },
        });
        return { ok: true, id, state: 'AWAITING_SECOND_APPROVAL', message: 'stage_one_recorded_second_distinct_admin_required' };
      }
      if (w.approved_stage_one_by === admin.id) throw new ForbiddenException('dual_approval_requires_distinct_admins');
      await this.withdrawals.updateOne({ id }, {
        $set: {
          state: 'APPROVED_FOR_PAYOUT', approved_by: admin.id, approved_by_name: admin.full_name || admin.email || admin.id, approved_at: new Date(),
          approval_reason: reason, batch_id: `pb_${uuid().slice(0, 12)}`,
        },
      });
      await this.audit.write({
        action: 'payout_approve_final', actor: admin, target_type: 'providerwithdrawals', target_id: id,
        reason, before: { state: w.state }, after: { state: 'APPROVED_FOR_PAYOUT' },
        meta: { amount: w.amount, stage_one_by: w.approved_stage_one_by },
      });
      return { ok: true, id, state: 'APPROVED_FOR_PAYOUT' };
    }

    // Below threshold: single approval suffices (still audited, still not self).
    await this.withdrawals.updateOne({ id }, {
      $set: { state: 'APPROVED_FOR_PAYOUT', approved_by: admin.id, approved_by_name: admin.full_name || admin.email || admin.id, approved_at: new Date(), approval_reason: reason },
    });
    await this.audit.write({
      action: 'payout_approve_single', actor: admin, target_type: 'providerwithdrawals', target_id: id,
      reason, before: { state: w.state }, after: { state: 'APPROVED_FOR_PAYOUT' },
      meta: { amount: w.amount },
    });
    return { ok: true, id, state: 'APPROVED_FOR_PAYOUT' };
  }

  /** Detailed provider account statement (orders + payouts + ledger). */
  async providerStatement(providerId: string, from?: string, to?: string) {
    if (!providerId) throw new BadRequestException('provider_id_required');
    const range: any = {
      ...(from ? { $gte: new Date(from) } : {}),
      ...(to ? { $lte: new Date(to) } : {}),
    };
    const hasRange = Object.keys(range).length > 0;

    const ledger = await this.conn.collection('platformledgerentries')
      .find(hasRange ? { provider_account_id: providerId, createdAt: range } : { provider_account_id: providerId })
      .sort({ createdAt: -1 }).limit(300).project({ _id: 0 }).toArray();
    const payouts = await this.withdrawals
      .find(hasRange ? { provider_id: providerId, createdAt: range } : { provider_id: providerId })
      .sort({ createdAt: -1 }).limit(100).project({ _id: 0 }).toArray();

    const summary = ledger.reduce((a: any, e: any) => {
      if (['provider_earning', 'bonus', 'referral'].includes(e.type) && e.state === 'cleared') a.earned_cleared += Number(e.amount || 0);
      else if (e.type === 'provider_earning' && e.state === 'pending') a.earned_pending += Number(e.amount || 0);
      else if (e.type === 'payout' && e.state === 'cleared') a.paid_out += Number(e.amount || 0);
      else if (['provider_debit', 'penalty', 'chargeback'].includes(e.type)) a.debits += Number(e.amount || 0);
      return a;
    }, { earned_cleared: 0, earned_pending: 0, paid_out: 0, debits: 0 });

    return {
      provider_id: providerId,
      summary: Object.fromEntries(Object.entries(summary).map(([k, v]) => [k, Math.round(Number(v) * 100) / 100])),
      balance_available: Math.round((summary.earned_cleared - summary.paid_out - summary.debits) * 100) / 100,
      ledger, payouts,
    };
  }
}
