import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyOrder, PharmacyOrderState, ORDER_TRANSITIONS, OrderItemMatchStatus, PharmacyAllocation } from '../schemas/pharmacy.schema';
import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { PharmacyBroadcastService } from './pharmacy-broadcast.service';
import { EventBusService } from '../../events/event-bus.service';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';

import { PharmacyAllocationState } from '../schemas/pharmacy.schema';
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";

function assertPatient(u: any) { if (!u || u.role !== 'patient') throw new ForbiddenException('patient_scope_required'); }

@Injectable()
export class PharmacyOrderService {
  constructor(
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    private split: SmartSplitService,
    private notif: PharmacyNotificationService,
    private broadcast: PharmacyBroadcastService,
    private bus: EventBusService,
    private engine: WorkflowEngineService,
  ) {}

  async create(user: any, body: any) {
    assertPatient(user);
    const items = (body.items || []).map((it: any) => ({
      id: uuidv4(),
      raw_name: it.raw_name || it.name || it.name_ar || 'unknown',
      name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
      dosage: it.dosage, form: it.form, frequency: it.frequency, duration: it.duration,
      qty: Math.max(1, Number(it.qty) || 1),
      match_status: OrderItemMatchStatus.MANUAL,
      matched_sku: it.sku || it.matched_sku, unit_price: it.unit_price,
      intake_source: it.intake_source || 'manual',
      notes: it.notes,
    }));
    if (!items.length) throw new BadRequestException('items_required');
    const order = await this.orders.create({
      id: uuidv4(),
      patient_account_id: user.id,
      status: PharmacyOrderState.DRAFT,
      items,
      delivery_address: body.delivery_address,
      patient_notes: body.patient_notes,
      prescription_attachments: body.prescription_attachments || [],
      totals: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' },
      timeline: [{ ts: new Date(), event: 'created' }],
    });
    await this.engine.announceCreated({ kind: 'pharmacy', entity_id: order.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { items: items.length, intake_source: 'broadcast' } });
    return order.toObject();
  }

  async list(user: any, status?: string) {
    assertPatient(user);
    const q: any = { patient_account_id: user.id };
    if (status) q.status = status;
    return this.orders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  }

  async detail(user: any, id: string): Promise<any> {
    const order = await this.orders.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (user.role === 'patient' && order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    const allocs = await this.allocs.find({ order_id: id }, { _id: 0, __v: 0 }).lean();
    // Phase 2 hardening: compute effective_status as auto-heal aggregation across allocations.
    const allocStatuses = allocs.map((a: any) => a.status);
    let effective_status = order.status;
    const isPersistent = ['cancelled', 'completed'].includes(order.status as any);
    if (!isPersistent && allocs.length > 0) {
      const allClosed = allocStatuses.every((s: string) => ['delivered', 'cancelled', 'rejected', 'expired'].includes(s));
      const anyDelivered = allocStatuses.some((s: string) => s === 'delivered');
      const anyOOD = allocStatuses.some((s: string) => s === 'out_for_delivery');
      const anyPreparing = allocStatuses.some((s: string) => ['preparing', 'ready_for_pickup'].includes(s));
      if (allClosed && anyDelivered) effective_status = 'delivered' as any;
      else if (anyOOD) effective_status = 'out_for_delivery' as any;
      else if (anyPreparing) effective_status = 'in_fulfillment' as any;
    }
    return { ...order, effective_status, allocations_detail: allocs, ...this.governedView(order) };
  }

  /**
   * Derived governed patient view (shared by patient-app and patient-web):
   * state machine labels, quote snapshot handles, and insurance summaries —
   * all computed server-side from the persisted order document.
   */
  private governedView(order: any) {
    const method = String(order.payment_method || '').toLowerCase();
    const decision: any = order.insurance_decision || null;
    const snapshot = order.pricing_snapshot || null;
    const selected = !!order.selected_offer_id && !!snapshot?.hash;
    const quoteAccepted = !!order.quote_accepted_at;
    const codRegistered = method === 'cod' && !!order.cod_registered_at;

    let governed_state: string | null = null;
    if (selected) {
      if (method === 'insurance') {
        if (!decision) governed_state = 'INSURANCE_PROCESSING';
        else if (decision.outcome === 'full') governed_state = 'CONFIRMED';
        else governed_state = 'INSURANCE_DECISION_READY';
      } else if (codRegistered) governed_state = 'COD_REGISTERED';
      else if (order.pending_final_quote_snapshot?.hash) governed_state = 'FINAL_QUOTE_READY';
      else if (quoteAccepted) governed_state = 'FINAL_QUOTE_ACCEPTED';
      else governed_state = 'OFFER_SELECTED';
    }

    const view: any = {
      governed_state,
      coverage_mode: order.coverage_mode || (method === 'insurance' ? 'insurance' : selected ? 'cash' : undefined),
      selected_offer_snapshot: selected ? snapshot : undefined,
      selected_offer_hash: selected ? snapshot.hash : undefined,
      selected_offer_revision: selected ? Number(order.selected_offer_version) : undefined,
      pending_final_quote_snapshot: order.pending_final_quote_snapshot || undefined,
      pending_final_quote_hash: order.pending_final_quote_snapshot?.hash || undefined,
      pending_final_quote_revision: order.pending_final_quote_snapshot?.offer_version || undefined,
      accepted_quote_snapshot: quoteAccepted || codRegistered
        ? { ...snapshot, cod_allowed: true }
        : undefined,
      accepted_quote_hash: quoteAccepted || codRegistered ? snapshot?.hash : undefined,
      accepted_quote_revision: quoteAccepted || codRegistered ? Number(order.selected_offer_version) : undefined,
    };

    if (decision) {
      view.insurance_decision_summary = {
        decision: decision.outcome === 'full' ? 'APPROVED_FULL' : decision.outcome === 'partial' ? 'APPROVED_PARTIAL' : 'REJECTED',
        co_pay_amount: Number(decision.patient_share || 0),
        insurer_share: Number(decision.insurer_share || 0),
        currency: decision.currency || snapshot?.totals?.currency || 'SAR',
      };
      view.insurance_item_decisions = (decision.items || []).map((item: any) => {
        const lineAmount = Math.round(Number(item.unit_price || 0) * Number(item.quoted_qty || 0) * 100) / 100;
        const covered = Math.round(Number(item.insurer_share || 0) * 100) / 100;
        return {
          order_item_id: item.order_item_id,
          decision: item.outcome === 'approved' ? 'APPROVED_FULL' : item.outcome === 'partial' ? 'APPROVED_PARTIAL' : 'REJECTED',
          line_amount: lineAmount,
          covered_amount: covered,
          co_pay_amount: Math.round((lineAmount - covered) * 100) / 100,
          reason: item.reason || null,
        };
      });
      if (decision.outcome === 'full' && !order.payment_status) {
        view.payment_status = 'covered_by_insurance';
      }
    }
    return view;
  }

  /**
   * Patient explicitly accepts the final quote snapshot (hash + revision must
   * match the server-side selected quote). No payment is created here.
   */
  async acceptFinalQuote(user: any, id: string, quoteHash: string, quoteRevision: any, idempotencyKey: string) {
    if (!user?.id) throw new ForbiddenException('patient_identity_required');
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || ''))) throw new BadRequestException('idempotency_key_required');
    const hash = String(quoteHash || '').toLowerCase();
    if (!/^[a-f0-9]{64}$/.test(hash)) throw new BadRequestException('quote_hash_required');
    const revision = Number(quoteRevision);
    if (!Number.isInteger(revision) || revision <= 0) throw new BadRequestException('quote_revision_required');
    const order: any = await this.orders.findOne({ id, patient_account_id: user.id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (order.final_quote_idempotency_key === idempotencyKey && order.quote_accepted_at) {
      return { ok: true, idempotent: true, status: order.status };
    }
    if (!order.selected_offer_id || !order.pricing_snapshot?.hash) throw new BadRequestException('selected_quote_required');
    if (String(order.pricing_snapshot.hash).toLowerCase() !== hash || Number(order.selected_offer_version) !== revision) {
      throw new BadRequestException('quote_hash_or_revision_mismatch');
    }
    const method = String(order.payment_method || '').toLowerCase();
    if (method === 'insurance') throw new BadRequestException('insurance_orders_follow_insurance_decision_flow');
    if (['cancelled', 'expired'].includes(String(order.status))) throw new BadRequestException('order_not_actionable');
    const now = new Date();
    await this.orders.updateOne({ id: order.id }, {
      $set: { quote_accepted_at: now, final_quote_idempotency_key: idempotencyKey },
      $push: { timeline: { ts: now, event: 'final_quote_accepted', by: user.id, meta: { quote_hash: hash, quote_revision: revision } } },
    } as any);
    return { ok: true, idempotent: false, status: order.status };
  }

  /**
   * Patient registers a cash-on-delivery commitment for an accepted quote.
   * This is a qualified commitment, not a collected payment; collection proof
   * is enforced at delivery time by the allocation gate.
   */
  async registerCod(user: any, id: string, idempotencyKey: string) {
    if (!user?.id) throw new ForbiddenException('patient_identity_required');
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || ''))) throw new BadRequestException('idempotency_key_required');
    const order: any = await this.orders.findOne({ id, patient_account_id: user.id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (String(order.payment_method || '').toLowerCase() === 'cod' && order.cod_registered_at) {
      return { ok: true, idempotent: true, status: order.status };
    }
    if (!order.selected_offer_id || !order.pricing_snapshot?.hash) throw new BadRequestException('selected_quote_required');
    if (!order.quote_accepted_at) throw new BadRequestException('final_quote_acceptance_required');
    if (String(order.payment_method || '').toLowerCase() === 'insurance') throw new BadRequestException('insurance_orders_follow_insurance_decision_flow');
    if (['cancelled', 'expired'].includes(String(order.status))) throw new BadRequestException('order_not_actionable');
    const now = new Date();
    await this.orders.updateOne({ id: order.id }, {
      $set: { payment_method: 'cod', cod_registered_at: now, cod_idempotency_key: idempotencyKey, status: PharmacyOrderState.COD_DUE_ON_DELIVERY },
      $push: { timeline: { ts: now, event: 'cod_registered', by: user.id, meta: { amount: order.pricing_snapshot?.totals?.total } } },
    } as any);
    return { ok: true, idempotent: false, status: PharmacyOrderState.COD_DUE_ON_DELIVERY };
  }


  async update(user: any, id: string, body: any): Promise<any> {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (order.status !== PharmacyOrderState.DRAFT) throw new BadRequestException(`not_editable_in_${order.status}`);
    if (body.items) {
      order.items = body.items.map((it: any) => ({
        id: it.id || uuidv4(),
        raw_name: it.raw_name || it.name || it.name_ar || 'unknown',
        name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
        dosage: it.dosage, form: it.form, frequency: it.frequency, duration: it.duration,
        qty: Math.max(1, Number(it.qty) || 1),
        match_status: it.match_status || OrderItemMatchStatus.MANUAL,
        matched_sku: it.sku || it.matched_sku, unit_price: it.unit_price,
        intake_source: it.intake_source || 'manual',
        notes: it.notes,
      }));
    }
    if (body.delivery_address) order.delivery_address = body.delivery_address;
    if (body.patient_notes !== undefined) order.patient_notes = body.patient_notes;
    order.timeline.push({ ts: new Date(), event: 'edited' });
    await order.save();
    return order.toObject();
  }

  /** Patient submits the draft → triggers Smart Split. */
  async submit(user: any, id: string): Promise<any> {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (!ORDER_TRANSITIONS[order.status].includes(PharmacyOrderState.READY_FOR_SPLIT) && order.status !== PharmacyOrderState.READY_FOR_SPLIT) {
      // From DRAFT we go straight to READY_FOR_SPLIT (allowed).
      if (order.status !== PharmacyOrderState.DRAFT) {
        throw new BadRequestException(`cannot_submit_from_${order.status}`);
      }
    }
    return await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: PharmacyOrderState.READY_FOR_SPLIT,
      actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, reason: 'patient_submitted',
      mutate: async () => {
        order.status = PharmacyOrderState.READY_FOR_SPLIT;
        order.timeline.push({ ts: new Date(), event: 'submitted_by_patient' });
        await order.save();
        // Phase 2A-rework: NEW workflow — start broadcast (3km→5km→7km) first.
        // Smart Split is now the FALLBACK after broadcast rounds fail.
        await this.broadcast.start(order);
        return this.detail(user, order.id);
      },
    });
  }

  async cancel(user: any, id: string, reason: string) {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if ([PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED, PharmacyOrderState.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`cannot_cancel_in_${order.status}`);
    }
    return await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: PharmacyOrderState.CANCELLED,
      actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, reason: reason || 'patient_requested',
      mutate: async () => {
        order.status = PharmacyOrderState.CANCELLED;
        order.cancellation_reason = reason || 'patient_requested';
        order.timeline.push({ ts: new Date(), event: 'cancelled_by_patient', meta: { reason } });
        await order.save();
        // Release any open allocations + restock
        const openAllocs = await this.allocs.find({ order_id: id });
        for (const a of openAllocs) {
          if (![PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED, PharmacyAllocationState.REJECTED].includes(a.status as any)) {
            await this.split.releaseStockForAllocation(a);
            a.status = PharmacyAllocationState.CANCELLED;
            a.cancellation_reason = 'order_cancelled_by_patient';
            a.timeline.push({ ts: new Date(), event: 'cancelled_by_patient' });
            await a.save();
          }
        }
        this.bus.emit({ type: 'pharmacy.allocations_released', entity_type: 'order', entity_id: id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, reason_code: reason || 'patient_requested', meta: { released_allocations: openAllocs.length } }).catch(() => null);
        return { ok: true };
      },
    });
  }
}


