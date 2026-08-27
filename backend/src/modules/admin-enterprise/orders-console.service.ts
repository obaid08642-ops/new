import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { validateReason, MIN_FINANCIAL_REASON_LENGTH, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';
import { WalletService } from '../wallet/wallet.service';

/**
 * Unified order-kind registry. Every lifecycle surface (list/detail/actions)
 * is driven from this map so adding a vertical never means copy-pasting a
 * controller.
 */
export interface OrderKindSpec {
  kind: string;
  collection: string;
  stateField: string;
  historyField: string;
  patientField: string;
  patientNameField?: string;
  providerField?: string;
  amountExpr: string; // $-expression root for the payable total
  cancelledStates: string[];
  completedStates: string[];
  label_ar: string;
}

export const ORDER_KINDS: OrderKindSpec[] = [
  {
    kind: 'pharmacy', collection: 'orders', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'pharmacy_id',
    amountExpr: '$total', cancelledStates: ['CANCELLED'], completedStates: ['DELIVERED'],
    label_ar: 'طلب صيدلية',
  },
  {
    kind: 'lab', collection: 'labbookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'facility_id',
    amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'SAMPLE_REJECTED'], completedStates: ['REPORTED'],
    label_ar: 'حجز مختبر',
  },
  {
    kind: 'radiology', collection: 'radiologybookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'facility_id',
    amountExpr: '$total_price', cancelledStates: ['CANCELLED'], completedStates: ['REPORT_PUBLISHED'],
    label_ar: 'حجز أشعة',
  },
  {
    kind: 'nursing', collection: 'homecarebookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'provider_id',
    amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED', 'DONE'],
    label_ar: 'تمريض منزلي',
  },
  {
    kind: 'consultation', collection: 'appointments', stateField: 'status', historyField: 'state_history',
    patientField: 'patient_id', providerField: 'doctor_user_id',
    amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED'],
    label_ar: 'استشارة',
  },
];

export function getKindSpec(kind: string): OrderKindSpec {
  const spec = ORDER_KINDS.find((k) => k.kind === kind);
  if (!spec) throw new BadRequestException(`unknown_order_kind:${kind}`);
  return spec;
}

const CANCELLED_SETS = new Map(ORDER_KINDS.map((k) => [k.kind, new Set(k.cancelledStates)]));

@Injectable()
export class OrdersConsoleService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
    private readonly wallet: WalletService,
  ) {}

  // ── Listing ──────────────────────────────────────────────────

  /**
   * Server-filtered, server-sorted, paginated unified queue.
   * For kind=all each collection contributes up to page*limit newest rows and
   * the merge happens in memory before slicing — deterministic and index-backed.
   */
  async list(opts: {
    kind?: string; q?: string; status?: string; from?: string; to?: string;
    page?: number; limit?: number; sort?: string;
  }) {
    const page = Math.max(1, opts.page || 1);
    const limit = Math.min(100, Math.max(1, opts.limit || 25));
    const kinds = opts.kind && opts.kind !== 'all' ? [getKindSpec(opts.kind)] : ORDER_KINDS;
    const rx = opts.q?.trim() ? new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const rows: any[] = [];
    let total = 0;
    for (const spec of kinds) {
      const match: any = {};
      if (opts.status) match[spec.stateField] = String(opts.status).toUpperCase();
      if (opts.from || opts.to) {
        match.createdAt = {
          ...(opts.from ? { $gte: new Date(opts.from) } : {}),
          ...(opts.to ? { $lte: new Date(opts.to) } : {}),
        };
      }
      if (rx) {
        const or: any[] = [{ id: rx }, ...(spec.patientNameField ? [{ [spec.patientNameField]: rx }] : [])];
        if (spec.patientField) or.push({ [spec.patientField]: rx });
        match.$or = or;
      }
      const col = this.conn.collection(spec.collection);
      const [count] = await col.aggregate([{ $match: match }, { $count: 'n' }]).toArray().catch(() => [{ n: 0 }]);
      total += count?.n || 0;
      const perCol = opts.kind && opts.kind !== 'all' ? limit : page * limit;
      const items = await col.find(match)
        .sort(opts.sort === 'oldest' ? { createdAt: 1 } : { createdAt: -1 })
        .limit(perCol)
        .project({
          _id: 0, id: 1, tracking_id: 1,
          state: `$${spec.stateField}`,
          created_at: '$createdAt',
          patient_id: `$${spec.patientField}`,
          patient_name: spec.patientNameField ? `$${spec.patientNameField}` : null,
          patient_phone: 1,
          provider_id: spec.providerField ? `$${spec.providerField}` : null,
          payment_method: 1, payment_status: 1,
          total: {
            $ifNull: [
              spec.amountExpr === '$total_price' ? '$total_price'
                : spec.amountExpr === '$total' ? '$total' : '$total_price',
              0,
            ],
          },
          sla_due_at: 1,
        })
        .toArray();
      for (const it of items as any[]) {
        it.kind = spec.kind;
        it.kind_label_ar = spec.label_ar;
        it.is_cancelled = CANCELLED_SETS.get(spec.kind)?.has(String(it.state)) || false;
        it.is_completed = spec.completedStates.includes(String(it.state));
        rows.push(it);
      }
    }

    rows.sort((a, b) =>
      opts.sort === 'oldest'
        ? new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
        : new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    const sliced = opts.kind && opts.kind !== 'all' ? rows : rows.slice((page - 1) * limit, page * limit);

    // status facet across requested kinds (for filter chips)
    const byStatus: Record<string, number> = {};
    if (kinds.length === 1) {
      const spec = kinds[0];
      const facetRows = await this.conn.collection(spec.collection).aggregate([
        { $group: { _id: `$${spec.stateField}`, n: { $sum: 1 } } },
      ]).toArray().catch(() => []);
      for (const r of facetRows as any[]) byStatus[String(r._id || 'unknown')] = r.n;
    }
    const byKind: Record<string, number> = {};
    for (const spec of ORDER_KINDS) {
      const [c] = await this.conn.collection(spec.collection).aggregate([{ $count: 'n' }]).toArray().catch(() => [{ n: 0 }]);
      byKind[spec.kind] = c?.n || 0;
    }

    return { data: sliced, total, page, pages: Math.ceil(total / limit), by_status: byStatus, by_kind: byKind };
  }

  // ── Detail ───────────────────────────────────────────────────

  async detail(kind: string, id: string) {
    const spec = getKindSpec(kind);
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');

    const payments = await this.conn.collection('moyasar_payments')
      .find({ $or: [{ booking_id: id }, { reference_id: id }, { order_id: id }] })
      .project({ _id: 0 })
      .sort({ createdAt: -1 }).limit(20).toArray()
      .catch(() => []);

    const refunds = await this.conn.collection('wallet_transactions')
      .find({ referenceType: 'refund', referenceId: id, type: 'credit' })
      .project({ _id: 0, amount: 1, description: 1, createdAt: 1 })
      .toArray();

    const refundsTotal = refunds.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    const paid = payments.filter((p: any) => ['paid', 'confirmed', 'succeeded'].includes(String(p.status || '').toLowerCase()))
      .reduce((a: number, p: any) => a + Number(p.amount || 0), 0);

    const { _id, __v, ...clean } = doc;
    return {
      order: clean,
      kind, kind_label_ar: spec.label_ar,
      timeline: doc[spec.historyField] || [],
      payments,
      financials: { gross_paid: Math.round(paid * 100) / 100, refunded_total: Math.round(refundsTotal * 100) / 100, refundable_max: Math.max(0, Math.round((paid - refundsTotal) * 100) / 100) },
      refunds,
    };
  }

  // ── Mutations ────────────────────────────────────────────────

  private async pushHistory(spec: OrderKindSpec, id: string, fromState: string, toState: string, admin: any, note: string) {
    await this.conn.collection(spec.collection).updateOne(
      { id },
      {
        $push: {
          [spec.historyField]: {
            from: fromState, to: toState,
            by_user_id: admin.id, by_role: 'admin',
            at: new Date(), note,
          },
        } as any,
      },
    );
  }

  async cancel(kind: string, id: string, rawReason: unknown, admin: any) {
    const reason = this.reason(rawReason);
    const spec = getKindSpec(kind);
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');
    const from = String(doc[spec.stateField]);
    if (CANCELLED_SETS.get(kind)?.has(from)) throw new BadRequestException('already_cancelled');
    if (spec.completedStates.includes(from)) throw new BadRequestException(`cannot_cancel_completed_state_${from}`);

    await this.conn.collection(spec.collection).updateOne({ id }, { $set: { [spec.stateField]: 'CANCELLED', cancelled_at: new Date(), cancellation_reason: reason } });
    await this.pushHistory(spec, id, from, 'CANCELLED', admin, `admin_cancel: ${reason}`);
    await this.audit.write({
      action: 'order_cancel', actor: admin, target_type: spec.collection, target_id: id,
      reason, before: { state: from }, after: { state: 'CANCELLED' },
    });
    return { ok: true, id, previous_state: from, state: 'CANCELLED' };
  }

  /** Real wallet refund capped at net paid (gross − already refunded). */
  async refund(kind: string, id: string, body: { amount?: number; mode?: 'partial' | 'full'; reason?: unknown }, admin: any) {
    const reason = this.financialReason(body?.reason);
    const spec = getKindSpec(kind);
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');

    const payments = await this.conn.collection('moyasar_payments').find({
      $or: [{ booking_id: id }, { reference_id: id }, { order_id: id }],
      status: { $in: ['paid', 'confirmed', 'succeeded'] },
    }).toArray().catch(() => []);
    const paid = (payments as any[]).reduce((a: number, p: any) => a + Number(p.amount || 0), 0);
    if (paid <= 0) throw new BadRequestException('no_confirmed_payment_to_refund');
    const priorRefunds = await this.conn.collection('wallet_transactions')
      .find({ referenceType: 'refund', referenceId: id, type: 'credit' }).toArray();
    const refunded = priorRefunds.reduce((a: number, r: any) => a + Number(r.amount || 0), 0);
    const maxRefundable = Math.round((paid - refunded) * 100) / 100;
    if (maxRefundable <= 0) throw new BadRequestException('fully_refunded_already');

    let amount: number;
    if ((body?.mode || 'full') === 'full') amount = maxRefundable;
    else {
      amount = Math.round(Number(body?.amount) * 100) / 100;
      if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount_required_positive');
      if (amount > maxRefundable) throw new BadRequestException(`amount_exceeds_refundable_${maxRefundable}`);
    }

    await this.wallet.topup(doc[spec.patientField], 'patient', amount, `refund ${kind}:${id} — ${reason}`.slice(0, 180), 'refund', id);
    // Mirror the refund onto the gateway payment records so revenue and the
    // daily reconciliation don't keep counting refunded money as gross.
    const fullyRefunded = Math.round((refunded + amount) * 100) / 100 >= paid;
    for (const p of payments) {
      await this.conn.collection('moyasar_payments').updateOne(
        { _id: (p as any)._id },
        { $set: {
          status: fullyRefunded ? 'refunded' : (p as any).status,
          refunded_amount: Math.min(paid, Number((p as any).refunded_amount || 0) + amount),
          refunded_at: new Date(),
        } },
      );
    }
    await this.conn.collection(spec.collection).updateOne({ id }, { $set: { refund_status: 'refunded', refunded_amount: Math.round((refunded + amount) * 100) / 100, last_refund_at: new Date() } });
    await this.audit.write({
      action: 'order_refund', actor: admin, target_type: spec.collection, target_id: id,
      reason, before: { refunded }, after: { refunded: refunded + amount, paid },
      meta: { patient_id: doc[spec.patientField], mode: body?.mode || 'full' },
    });
    return { ok: true, id, credited_amount: amount, refunded_total: Math.round((refunded + amount) * 100) / 100 };
  }

  /** Goodwill compensation — separate permission from refund, never exceeds cap. */
  async compensate(kind: string, id: string, body: { amount?: number; reason?: unknown }, admin: any) {
    const reason = this.financialReason(body?.reason);
    const cap = Number(process.env.COMPENSATION_MAX_SAR || 500);
    const spec = getKindSpec(kind);
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');
    const amount = Math.round(Number(body?.amount) * 100) / 100;
    if (!Number.isFinite(amount) || amount <= 0) throw new BadRequestException('amount_required_positive');
    if (amount > cap) throw new BadRequestException(`amount_exceeds_compensation_cap_${cap}`);

    await this.wallet.topup(doc[spec.patientField], 'patient', amount, `compensation ${kind}:${id} — ${reason}`.slice(0, 180), 'refund', `comp_${id}`);
    await this.audit.write({
      action: 'order_compensate', actor: admin, target_type: spec.collection, target_id: id,
      reason, after: { amount }, meta: { patient_id: doc[spec.patientField] },
    });
    return { ok: true, id, compensated_amount: amount };
  }

  async reassign(kind: string, id: string, body: { provider_id?: string; reason?: unknown }, admin: any) {
    const reason = this.reason(body?.reason);
    const spec = getKindSpec(kind);
    if (!spec.providerField) throw new BadRequestException('kind_has_no_provider_field');
    const newProvider = String(body?.provider_id || '').trim();
    if (!newProvider) throw new BadRequestException('provider_id_required');
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');
    if (CANCELLED_SETS.get(kind)?.has(String(doc[spec.stateField]))) throw new BadRequestException('cannot_reassign_cancelled');

    const oldProvider = doc[spec.providerField] || null;
    await this.conn.collection(spec.collection).updateOne(
      { id },
      { $set: { [spec.providerField]: newProvider, reassigned_at: new Date(), reassigned_by: admin.id } },
    );
    await this.pushHistory(spec, id, String(doc[spec.stateField]), String(doc[spec.stateField]), admin, `reassign ${oldProvider}→${newProvider}: ${reason}`);
    await this.audit.write({
      action: 'order_reassign', actor: admin, target_type: spec.collection, target_id: id,
      reason, before: { provider: oldProvider }, after: { provider: newProvider },
    });
    return { ok: true, id, previous_provider: oldProvider, provider: newProvider };
  }

  async extendSla(kind: string, id: string, body: { hours?: number; reason?: unknown }, admin: any) {
    const reason = this.reason(body?.reason);
    const hours = Number(body?.hours);
    if (!Number.isFinite(hours) || hours <= 0 || hours > 72) throw new BadRequestException('hours_must_be_1_to_72');
    const spec = getKindSpec(kind);
    const doc: any = await this.conn.collection(spec.collection).findOne({ id });
    if (!doc) throw new NotFoundException('order_not_found');
    const base = doc.sla_due_at ? new Date(doc.sla_due_at) : new Date();
    const newDue = new Date(base.getTime() + hours * 3600_000);
    await this.conn.collection(spec.collection).updateOne(
      { id },
      { $set: { sla_due_at: newDue, sla_extended_at: new Date(), sla_extended_by_hours: hours } },
    );
    await this.audit.write({
      action: 'order_sla_extend', actor: admin, target_type: spec.collection, target_id: id,
      reason, before: { sla_due_at: doc.sla_due_at || null }, after: { sla_due_at: newDue, hours },
    });
    return { ok: true, id, sla_due_at: newDue, extended_hours: hours };
  }

  private reason(raw: unknown): string {
    try {
      return validateReason(raw);
    } catch (e) {
      if (e instanceof ReasonError) throw new BadRequestException(e.code);
      throw e;
    }
  }

  private financialReason(raw: unknown): string {
    try {
      return validateReason(raw, MIN_FINANCIAL_REASON_LENGTH);
    } catch (e) {
      if (e instanceof ReasonError) throw new BadRequestException(e.code);
      throw e;
    }
  }
}
