import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ModuleRef } from '@nestjs/core';
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
  /** Value written on admin cancel (the collection's own casing). */
  cancelledValue?: string;
  /**
   * Orders whose lifecycle is owned by a domain service (allocations, stock, workflow engine):
   * the console must go through that service instead of writing the document directly.
   */
  managed?: boolean;
}

export const ORDER_KINDS: OrderKindSpec[] = [
  {
    // Current pharmacy flow (patient-app broadcast -> offers -> allocation), lowercase states.
    kind: 'pharmacy', collection: 'pharmacy_orders', stateField: 'status', historyField: 'timeline',
    patientField: 'patient_account_id', amountExpr: '$totals.total',
    cancelledStates: ['cancelled'], completedStates: ['delivered', 'completed'], cancelledValue: 'cancelled',
    label_ar: 'طلب صيدلية', managed: true,
  },
  {
    // Legacy cart checkout (/orders) still writes here.
    kind: 'pharmacy', collection: 'orders', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'pharmacy_id',
    amountExpr: '$total', cancelledStates: ['CANCELLED'], completedStates: ['DELIVERED'],
    label_ar: 'طلب صيدلية',
  },
  {
    // labs.service book(): amount in `total`, serving lab in provider_account_id
    kind: 'lab', collection: 'labbookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'provider_account_id',
    amountExpr: '$total', cancelledStates: ['CANCELLED', 'SAMPLE_REJECTED'], completedStates: ['REPORTED'],
    label_ar: 'حجز مختبر',
  },
  {
    // radiology.service book(): amount in `total`, center in provider_account_id; REPORT_READY is the final state
    kind: 'radiology', collection: 'radiologybookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'provider_account_id',
    amountExpr: '$total', cancelledStates: ['CANCELLED'], completedStates: ['REPORT_READY', 'REPORT_PUBLISHED'],
    label_ar: 'حجز أشعة',
  },
  {
    // home-care.service book(): amount in `total`, the chosen nurse in provider_id
    kind: 'nursing', collection: 'homecarebookings', stateField: 'state', historyField: 'state_history',
    patientField: 'patient_id', patientNameField: 'patient_name', providerField: 'provider_id',
    amountExpr: '$total', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED', 'DONE'],
    label_ar: 'تمريض منزلي',
  },
  {
    kind: 'consultation', collection: 'appointments', stateField: 'status', historyField: 'state_history',
    patientField: 'patient_id', providerField: 'doctor_user_id',
    amountExpr: '$total_price', cancelledStates: ['CANCELLED', 'REJECTED'], completedStates: ['COMPLETED'],
    label_ar: 'استشارة',
  },
];

/** Every collection that stores orders of this kind (a kind can live in more than one). */
export function getKindSpecs(kind: string): OrderKindSpec[] {
  const specs = ORDER_KINDS.filter((k) => k.kind === kind);
  if (!specs.length) throw new BadRequestException(`unknown_order_kind:${kind}`);
  return specs;
}

export function getKindSpec(kind: string): OrderKindSpec {
  return getKindSpecs(kind)[0];
}

const isCancelled = (spec: OrderKindSpec, state: unknown) => spec.cancelledStates.includes(String(state));

@Injectable()
export class OrdersConsoleService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
    private readonly wallet: WalletService,
    private readonly moduleRef: ModuleRef,
  ) {}

  /**
   * Gateway payments for a booking. App checkouts go through PaymentsService (`transactions`); the Moyasar
   * module records `moyasar_payments`. Both count; each row keeps its source so refunds are mirrored back.
   */
  private async paymentsFor(id: string, paidOnly = false): Promise<any[]> {
    const paid = ['paid', 'confirmed', 'succeeded'];
    const [moy, txn] = await Promise.all([
      this.conn.collection('moyasar_payments').find({
        $or: [{ booking_id: id }, { reference_id: id }, { order_id: id }], ...(paidOnly ? { status: { $in: paid } } : {}),
      }).sort({ createdAt: -1 }).limit(20).toArray().catch(() => []),
      this.conn.collection('transactions').find({ booking_id: id, ...(paidOnly ? { status: { $in: paid } } : {}) })
        .sort({ createdAt: -1 }).limit(20).toArray().catch(() => []),
    ]);
    return [...(moy as any[]).map((p) => ({ ...p, _source: 'moyasar_payments' })), ...(txn as any[]).map((p) => ({ ...p, _source: 'transactions' }))];
  }

  /** Finds the order in whichever collection of this kind holds it. */
  private async findOrder(kind: string, id: string): Promise<{ spec: OrderKindSpec; doc: any }> {
    for (const spec of getKindSpecs(kind)) {
      const doc: any = await this.conn.collection(spec.collection).findOne({ id });
      if (doc) return { spec, doc };
    }
    throw new NotFoundException('order_not_found');
  }

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
    const kinds = opts.kind && opts.kind !== 'all' ? getKindSpecs(opts.kind) : ORDER_KINDS;
    const rx = opts.q?.trim() ? new RegExp(opts.q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i') : null;

    const rows: any[] = [];
    let total = 0;
    for (const spec of kinds) {
      const match: any = {};
      if (opts.status) {
        const st = String(opts.status);
        match[spec.stateField] = { $in: [...new Set([st, st.toUpperCase(), st.toLowerCase()])] };
      }
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
      // Each collection contributes its newest page*limit rows; the merge below slices the page.
      const perCol = page * limit;
      const amountField = spec.amountExpr.slice(1);
      const mongoSort: Record<string, 1 | -1> = opts.sort === 'oldest' || opts.sort === 'amount_asc'
        ? (opts.sort === 'amount_asc' ? { [amountField]: 1, createdAt: -1 } : { createdAt: 1 })
        : (opts.sort === 'amount_desc' ? { [amountField]: -1, createdAt: -1 } : { createdAt: -1 });
      const items = await col.find(match)
        .sort(mongoSort)
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
          total: { $ifNull: [spec.amountExpr, 0] },
          sla_due_at: 1,
        })
        .toArray();
      for (const it of items as any[]) {
        it.kind = spec.kind;
        it.kind_label_ar = spec.label_ar;
        it.is_cancelled = isCancelled(spec, it.state);
        it.is_completed = spec.completedStates.includes(String(it.state));
        // Shape read by admin/src/pages/admin/orders/index.tsx (status, patient{}, provider{}, amount).
        it.status = it.state;
        it.patient = { id: it.patient_id ?? undefined, name: it.patient_name ?? undefined, phone: it.patient_phone ?? undefined };
        it.provider = it.provider_id ? { id: it.provider_id } : undefined;
        it.amount = typeof it.total === 'number' ? it.total : Number(it.total || 0);
        rows.push(it);
      }
    }

    rows.sort((a, b) => {
      if (opts.sort === 'oldest') return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
      if (opts.sort === 'amount_asc') return Number(a.total || 0) - Number(b.total || 0);
      if (opts.sort === 'amount_desc') return Number(b.total || 0) - Number(a.total || 0);
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
    const sliced = rows.slice((page - 1) * limit, page * limit);

    // status facet across requested kinds (for filter chips)
    const byStatus: Record<string, number> = {};
    if (opts.kind && opts.kind !== 'all') {
      for (const spec of kinds) {
        const facetRows = await this.conn.collection(spec.collection).aggregate([
          { $group: { _id: `$${spec.stateField}`, n: { $sum: 1 } } },
        ]).toArray().catch(() => []);
        for (const r of facetRows as any[]) {
          const k = String(r._id || 'unknown');
          byStatus[k] = (byStatus[k] || 0) + r.n;
        }
      }
    }
    const byKind: Record<string, number> = {};
    for (const spec of ORDER_KINDS) {
      const [c] = await this.conn.collection(spec.collection).aggregate([{ $count: 'n' }]).toArray().catch(() => [{ n: 0 }]);
      byKind[spec.kind] = (byKind[spec.kind] || 0) + (c?.n || 0);
    }

    return { data: sliced, total, page, pages: Math.ceil(total / limit), by_status: byStatus, by_kind: byKind };
  }

  /**
   * CSV export is produced from the same server-filtered queue used by the UI.
   * The limit prevents an interactive HTTP request from exhausting the worker;
   * callers receive an explicit truncation header and can use scheduled reports
   * for larger ranges.
   */
  async exportCsv(opts: { kind?: string; q?: string; status?: string; from?: string; to?: string }) {
    const maxRows = Math.max(1, Math.min(10_000, Number(process.env.ADMIN_EXPORT_MAX_ROWS || 10_000)));
    const first = await this.list({ ...opts, page: 1, limit: 100 });
    const rows = [...first.data];
    for (let page = 2; rows.length < Math.min(first.total, maxRows) && page <= first.pages; page += 1) {
      const next = await this.list({ ...opts, page, limit: 100 });
      rows.push(...next.data);
    }
    const escape = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const header = ['id', 'kind', 'state', 'patient_id', 'patient_name', 'provider_id', 'payment_status', 'total', 'created_at', 'sla_due_at'];
    const lines = rows.slice(0, maxRows).map((row: any) => [
      row.id, row.kind, row.state, row.patient_id, row.patient_name, row.provider_id,
      row.payment_status, row.total, row.created_at, row.sla_due_at,
    ].map(escape).join(','));
    return {
      filename: `orders-${new Date().toISOString().slice(0, 10)}.csv`,
      csv: [header.join(','), ...lines].join('\n'),
      truncated: first.total > maxRows,
      total_matching: first.total,
      exported_rows: Math.min(rows.length, maxRows),
    };
  }

  // ── Detail ───────────────────────────────────────────────────

  async detail(kind: string, id: string) {
    const { spec, doc } = await this.findOrder(kind, id);

    const payments = (await this.paymentsFor(id)).map(({ _id, client_secret, webhook_payload, ...p }: any) => p);

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
      kind, kind_label_ar: spec.label_ar, source_collection: spec.collection,
      // The detail page renders { from, to, note, at, by_user_id }; `timeline` collections store { ts, event, by, meta }.
      timeline: (doc[spec.historyField] || []).map((e: any) => (spec.historyField === 'timeline'
        ? { at: e.ts, from: e.meta?.from, to: e.meta?.to ?? e.event, note: e.meta?.note ?? e.meta?.reason ?? e.event, by_user_id: e.by }
        : e)),
      payments,
      financials: { gross_paid: Math.round(paid * 100) / 100, refunded_total: Math.round(refundsTotal * 100) / 100, refundable_max: Math.max(0, Math.round((paid - refundsTotal) * 100) / 100) },
      refunds,
    };
  }

  // ── Mutations ────────────────────────────────────────────────

  private async pushHistory(spec: OrderKindSpec, id: string, fromState: string, toState: string, admin: any, note: string) {
    // `timeline` collections use { ts, event, by, meta }; `state_history` ones { from, to, at, note }.
    const entry = spec.historyField === 'timeline'
      ? { ts: new Date(), event: 'admin_action', by: admin.id, meta: { from: fromState, to: toState, note } }
      : { from: fromState, to: toState, by_user_id: admin.id, by_role: 'admin', at: new Date(), note };
    await this.conn.collection(spec.collection).updateOne({ id }, { $push: { [spec.historyField]: entry } as any });
  }

  async cancel(kind: string, id: string, rawReason: unknown, admin: any) {
    const reason = this.reason(rawReason);
    const { spec, doc } = await this.findOrder(kind, id);
    const from = String(doc[spec.stateField]);
    if (isCancelled(spec, from)) throw new BadRequestException('already_cancelled');
    if (spec.completedStates.includes(from)) throw new BadRequestException(`cannot_cancel_completed_state_${from}`);
    const to = spec.cancelledValue || 'CANCELLED';

    if (spec.managed && spec.collection === 'pharmacy_orders') {
      // Releases allocations and stock and goes through the workflow engine.
      const { PharmacyOrderService } = await import('../pharmacy/services/pharmacy-order.service');
      await this.moduleRef.get(PharmacyOrderService, { strict: false }).adminCancel(admin, id, reason);
    } else {
      await this.conn.collection(spec.collection).updateOne({ id }, { $set: { [spec.stateField]: to, cancelled_at: new Date(), cancellation_reason: reason } });
      await this.pushHistory(spec, id, from, to, admin, `admin_cancel: ${reason}`);
    }
    await this.audit.write({
      action: 'order_cancel', actor: admin, target_type: spec.collection, target_id: id,
      reason, before: { state: from }, after: { state: to },
    });
    return { ok: true, id, previous_state: from, state: to };
  }

  /** Real wallet refund capped at net paid (gross − already refunded). */
  async refund(kind: string, id: string, body: { amount?: number; mode?: 'partial' | 'full'; reason?: unknown }, admin: any) {
    const reason = this.financialReason(body?.reason);
    const { spec, doc } = await this.findOrder(kind, id);

    const payments = await this.paymentsFor(id, true);
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
      await this.conn.collection((p as any)._source).updateOne(
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
    const { spec, doc } = await this.findOrder(kind, id);
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
    const newProvider = String(body?.provider_id || '').trim();
    if (!newProvider) throw new BadRequestException('provider_id_required');
    const { spec, doc } = await this.findOrder(kind, id);
    // Managed pharmacy orders are held by allocations (stock reserved per pharmacy): a field swap
    // would leave the old pharmacy's allocation live, so reassignment is not offered there.
    if (!spec.providerField || spec.managed) throw new BadRequestException('kind_has_no_provider_field');
    if (isCancelled(spec, doc[spec.stateField])) throw new BadRequestException('cannot_reassign_cancelled');

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
    const { spec, doc } = await this.findOrder(kind, id);
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

  /** Internal operations note; no client-side state is treated as the source of truth. */
  async addInternalNote(kind: string, id: string, rawNote: unknown, admin: any) {
    const note = this.reason(rawNote);
    const { spec, doc } = await this.findOrder(kind, id);
    const entry = { by_user_id: admin.id, by_role: 'admin', at: new Date(), note: `internal_note: ${note}` };
    await this.conn.collection(spec.collection).updateOne({ id }, { $push: { internal_notes: entry } } as any);
    await this.audit.write({
      action: 'order_internal_note', actor: admin, target_type: spec.collection, target_id: id,
      reason: note, after: { internal_note_added: true },
    });
    return { ok: true, id, note: entry };
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
