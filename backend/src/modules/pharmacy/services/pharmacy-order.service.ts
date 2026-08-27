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
import { assertGovernedPharmacyTransition } from '../../../common/governed-workflow';
import { PharmacyOrderState as GovernedPharmacyOrderState } from '@nabd/shared-contracts';
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
      governed_state: GovernedPharmacyOrderState.CART_DRAFT,
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
    // The legacy persistence state passes through READY_FOR_SPLIT, but the
    // governed business action is one patient-owned transition: draft → broadcast.
    assertGovernedPharmacyTransition(
      GovernedPharmacyOrderState.CART_DRAFT,
      GovernedPharmacyOrderState.ORDER_BROADCASTING,
      'PATIENT',
    );
    return await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: PharmacyOrderState.READY_FOR_SPLIT,
      actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, reason: 'patient_submitted',
      mutate: async () => {
        order.status = PharmacyOrderState.READY_FOR_SPLIT;
        order.governed_state = GovernedPharmacyOrderState.ORDER_BROADCASTING;
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
