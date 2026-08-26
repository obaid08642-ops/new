import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Model, Connection } from 'mongoose';
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
    @InjectConnection() private readonly conn: Connection,
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
    return { ...order, effective_status, allocations_detail: allocs };
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

  /**
   * PH-PHARMACY (Cash branch): after the patient selects an offer they may choose
   * cash-on-delivery/pickup. Registers the deferred collection commitment and
   * CONFIRMS the order so the pharmacy starts dispensing.
   */
  async registerCod(user: any, id: string) {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (order.status !== PharmacyOrderState.OFFER_SELECTED) throw new BadRequestException(`cod_requires_offer_selected_got_${order.status}`);
    const total = Math.round((Number((order as any).selected_offer?.subtotal_estimate || 0) + Number((order as any).selected_offer?.delivery_fee || 0)) * 100) / 100;
    order.status = PharmacyOrderState.CONFIRMED;
    (order as any).payment_method = 'cod';
    (order as any).payment_status = 'cod_pending_collection';
    (order as any).totals = { ...(order as any).totals, total: total, currency: 'SAR' };
    order.timeline.push({ ts: new Date(), event: 'cod_registered_confirmed', meta: { total } });
    await order.save();
    try { (this.engine as any).announceCreated?.({ kind: 'pharmacy', entity_id: order.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: user.id, meta: { payment: 'cod', total } }); } catch {}
    return { ok: true, status: order.status, total, settlement: 'collect_on_delivery_or_pickup' };
  }

  /**
   * PH-PHARMACY (D-003): pay the selected offer with wallet balance.
   * Atomic guarded deduction ($gte) — never a read-then-write race. On success
   * the order CONFIRMs immediately (PAYMENT_PENDING → CONFIRMED, wallet-settled).
   */
  async payWithWallet(user: any, id: string) {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (order.status !== PharmacyOrderState.OFFER_SELECTED) throw new BadRequestException(`pay_requires_offer_selected_got_${order.status}`);
    const total = Math.round((Number((order as any).selected_offer?.subtotal_estimate || 0) + Number((order as any).selected_offer?.delivery_fee || 0)) * 100) / 100;
    if (total <= 0) throw new BadRequestException('nothing_to_charge');

    // Atomic: only deduct when balance actually covers it.
    const debited = await this.conn.collection('wallets').findOneAndUpdate(
      { owner_id: user.id, owner_type: 'patient', balance: { $gte: total } },
      { $inc: { balance: -total }, $set: { updatedAt: new Date() } },
      { returnDocument: 'after' },
    );
    if (!debited?.value) throw new BadRequestException('insufficient_wallet_balance');

    await this.conn.collection('wallet_transactions').insertOne({
      id: uuidv4(), wallet_id: debited.value.id || null, owner_id: user.id, owner_type: 'patient',
      amount: -total, type: 'debit', reference_type: 'pharmacy_order', reference_id: id,
      description: 'دفع طلب صيدلية من المحفظة', created_at: new Date(),
    });

    order.status = PharmacyOrderState.CONFIRMED;
    (order as any).payment_method = 'wallet';
    (order as any).payment_status = 'paid';
    (order as any).totals = { ...(order as any).totals, total, currency: 'SAR' };
    order.timeline.push({ ts: new Date(), event: 'wallet_paid_confirmed', meta: { total } });
    await order.save();
    return { ok: true, status: order.status, paid: total, remaining_balance: debited.value.balance };
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


