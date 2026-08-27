import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyOrder, PharmacyOrderState, PharmacyAllocation, PharmacyAllocationState, ALLOCATION_TRANSITIONS, AllocationItemAction } from '../schemas/pharmacy.schema';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { EventBusService } from '../../events/event-bus.service';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { isProviderRole } from '../../../common/enums';

function assertProvider(u: any) { if (!u || !isProviderRole(u.role)) throw new ForbiddenException('provider_scope_required'); }

@Injectable()
export class PharmacyAllocationService {
  constructor(
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    private split: SmartSplitService,
    private notif: PharmacyNotificationService,
    private bus: EventBusService,
    private engine: WorkflowEngineService,
  ) {}

  async listForProvider(user: any, status?: string) {
    assertProvider(user);
    const q: any = { pharmacy_account_id: user.id };
    if (status) q.status = status;
    return this.allocs.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
  }

  /** Locate the calling pharmacy's allocation for a given order (used by order-level Blueprint endpoints). */
  async findByOrderForProvider(user: any, orderId: string) {
    assertProvider(user);
    const a = await this.allocs.findOne({ order_id: orderId, pharmacy_account_id: user.id });
    if (!a) throw new NotFoundException('allocation_not_found_for_order');
    return a;
  }

  async detail(user: any, id: string): Promise<any> {
    const a = await this.allocs.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!a) throw new NotFoundException('allocation_not_found');
    if (user.role === 'provider' && a.pharmacy_account_id !== user.id) throw new ForbiddenException('not_yours');
    const order = await this.orders.findOne({ id: a.order_id }, { _id: 0, __v: 0, patient_account_id: 0 }).lean();
    return { ...a, order };
  }

  /** Pharmacist sets an item-level action: available / substitute / unavailable. */
  async itemAction(user: any, allocId: string, allocItemId: string, body: { action: AllocationItemAction; substitute_sku?: string; substitute_reason?: string; qty_offered?: number; notes?: string }) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id: allocId });
    if (!a) throw new NotFoundException('allocation_not_found');
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (![PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED].includes(a.status)) {
      throw new BadRequestException(`cannot_change_items_in_${a.status}`);
    }
    const item = a.items.find(i => i.id === allocItemId);
    if (!item) throw new NotFoundException('alloc_item_not_found');
    const prevAction = item.action;
    const prevQty = item.qty_offered;
    const prevInvId = item.inventory_id;
    item.action = body.action;
    item.notes = body.notes || item.notes;
    item.updated_at = new Date();

    if (body.action === AllocationItemAction.SUBSTITUTE) {
      if (!body.substitute_sku) throw new BadRequestException('substitute_sku_required');
      const subInv = await this.inv.findOne({ provider_account_id: user.id, sku: body.substitute_sku, available: true });
      if (!subInv) throw new BadRequestException('substitute_not_in_inventory');
      if (subInv.stock < (body.qty_offered || item.qty_requested)) throw new BadRequestException('substitute_insufficient_stock');
      // Release previous reservation if any
      if (prevAction === AllocationItemAction.AVAILABLE && prevInvId && prevQty) {
        await this.inv.updateOne({ id: prevInvId, provider_account_id: user.id }, { $inc: { stock: prevQty } });
      }
      // Reserve new substitute stock
      const qty = body.qty_offered || item.qty_requested;
      const reserved = await this.inv.findOneAndUpdate(
        { id: subInv.id, provider_account_id: user.id, stock: { $gte: qty } },
        { $inc: { stock: -qty } },
      );
      if (!reserved) throw new BadRequestException('substitute_stock_race');
      item.substitute_for_sku = item.sku;
      item.substitute_reason = body.substitute_reason;
      item.inventory_id = subInv.id;
      item.sku = subInv.sku;
      item.name = subInv.name_ar || subInv.name_en;
      item.qty_offered = qty;
      item.unit_price = subInv.price;
    } else if (body.action === AllocationItemAction.UNAVAILABLE) {
      // Release any reservation
      if (prevAction === AllocationItemAction.AVAILABLE && prevInvId && prevQty) {
        await this.inv.updateOne({ id: prevInvId, provider_account_id: user.id }, { $inc: { stock: prevQty } });
      }
      item.qty_offered = 0;
      item.inventory_id = undefined;
    } else if (body.action === AllocationItemAction.AVAILABLE) {
      // Adjust quantity if provided
      const newQty = body.qty_offered || item.qty_requested;
      if (newQty !== prevQty) {
        const delta = newQty - prevQty;
        if (delta > 0) {
          // Need to reserve more
          const reserved = await this.inv.findOneAndUpdate(
            { id: item.inventory_id, provider_account_id: user.id, stock: { $gte: delta } },
            { $inc: { stock: -delta } },
          );
          if (!reserved) throw new BadRequestException('insufficient_stock_for_increase');
        } else if (delta < 0 && item.inventory_id) {
          await this.inv.updateOne({ id: item.inventory_id, provider_account_id: user.id }, { $inc: { stock: -delta } });
        }
        item.qty_offered = newQty;
      }
    }

    // Recalculate totals
    a.totals.subtotal = a.items.filter(i => i.action === AllocationItemAction.AVAILABLE || i.action === AllocationItemAction.SUBSTITUTE).reduce((s, i) => s + (i.unit_price || 0) * (i.qty_offered || 0), 0);
    a.totals.total = a.totals.subtotal + (a.totals.delivery_fee || 0);
    a.timeline.push({ ts: new Date(), event: 'item_action', by: user.id, meta: { item_id: allocItemId, action: body.action } });
    a.markModified('items');
    await a.save();

    // Notify patient if item became unavailable
    if (body.action === AllocationItemAction.UNAVAILABLE) {
      await this.notif.notifyPatientItemUnavailable(a, item);
    }
    return a.toObject();
  }

  private transition(a: PharmacyAllocation, to: PharmacyAllocationState, by?: string, meta?: any) {
    if (!ALLOCATION_TRANSITIONS[a.status].includes(to)) {
      throw new BadRequestException(`invalid_transition_${a.status}_to_${to}`);
    }
    a.status = to;
    a.timeline.push({ ts: new Date(), event: to, by, meta });
  }

  async confirm(user: any, id: string) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    const anyUnavailable = a.items.some(i => i.action === AllocationItemAction.UNAVAILABLE);
    const anyAvailable = a.items.some(i => i.action !== AllocationItemAction.UNAVAILABLE);
    if (!anyAvailable) {
      this.transition(a, PharmacyAllocationState.REJECTED, user.id, { reason: 'all_items_unavailable' });
      a.rejection_reason = 'all_items_unavailable';
    } else if (anyUnavailable) {
      this.transition(a, PharmacyAllocationState.PARTIALLY_CONFIRMED, user.id);
    } else {
      this.transition(a, PharmacyAllocationState.CONFIRMED, user.id);
    }
    a.estimated_ready_at = new Date(Date.now() + (a.estimated_preparation_minutes || 30) * 60_000);
    await a.save();
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationConfirmed(a);
    return a.toObject();
  }

  async preparing(user: any, id: string) { return this.advance(user, id, PharmacyAllocationState.PREPARING); }
  async ready(user: any, id: string) { return this.advance(user, id, PharmacyAllocationState.READY_FOR_PICKUP); }
  async outForDelivery(user: any, id: string, body?: { courier_name?: string; courier_phone?: string; eta?: Date }) {
    const a = await this.advance(user, id, PharmacyAllocationState.OUT_FOR_DELIVERY);
    if (body) {
      const doc = await this.allocs.findOne({ id });
      if (doc) {
        doc.delivery = { ...doc.delivery, method: 'pharmacy_delivery', ...body };
        await doc.save();
      }
    }
    return a;
  }
  async delivered(user: any, id: string) {
    const a = await this.advance(user, id, PharmacyAllocationState.DELIVERED);
    const doc = await this.allocs.findOne({ id });
    if (doc) { doc.delivery = { ...doc.delivery, delivered_at: new Date() }; await doc.save(); }
    // 💰 Credit pharmacy earnings: gross − commission − VAT(15% on commission).
    // Idempotent per allocation. E1 S8: enters ESCROW (state 'pending') and
    // matures to 'cleared' after the configured settlement delay.
    if (doc) {
      try {
        const ledger = (this.allocs as any).db.collection('platformledgerentries');
        const dup = await ledger.findOne({ ref_type: 'allocation', ref_id: id, type: 'provider_earning' });
        if (!dup) {
          const gross = Number(doc.totals?.total ?? 0);
          if (gross > 0) {
            const cfg: any = await (this.allocs as any).db.collection('finance_config').findOne({ key: 'commissions' });
            const pct = cfg?.service_types?.pharmacy?.percent ?? 10;
            const vatPct = cfg?.tax?.vat_percent ?? 15;
            const delayDays = cfg?.settlement?.delay_days?.pharmacy ?? cfg?.settlement?.delay_days?.default ?? 3;
            const commission = Math.round(gross * pct) / 100;
            const vat = Math.round(commission * vatPct) / 100;
            await ledger.insertOne({
              id: `earn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
              provider_account_id: doc.pharmacy_account_id,
              type: 'provider_earning', state: 'pending',
              available_at: new Date(Date.now() + delayDays * 24 * 3600 * 1000),
              amount: Math.round((gross - commission - vat) * 100) / 100,
              gross, commission_percent: pct, commission, vat,
              ref_type: 'allocation', ref_id: id, order_id: doc.order_id,
              createdAt: new Date(),
            });
          }
        }
      } catch { /* ledger credit must never block delivery confirmation */ }
    }
    return a;
  }

  private async advance(user: any, id: string, to: PharmacyAllocationState) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    if ([PharmacyAllocationState.PREPARING, PharmacyAllocationState.READY_FOR_PICKUP, PharmacyAllocationState.OUT_FOR_DELIVERY, PharmacyAllocationState.DELIVERED].includes(to)) {
      const order: any = await this.orders.findOne({ id: a.order_id });
      if (!order || order.governed_state !== 'CONFIRMED') throw new BadRequestException('payment_or_cod_confirmation_required');
    }
    const fromStatus = a.status;
    this.transition(a, to, user.id);
    await a.save();
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationProgress(a);
    this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: `transition_to_${to}`, before: { status: fromStatus }, after: { status: to }, meta: { order_id: a.order_id } }).catch(() => null);
    return a.toObject();
  }

  async cancel(user: any, id: string, reason: string) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    if ([PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED].includes(a.status)) throw new BadRequestException('already_terminal');
    await this.split.releaseStockForAllocation(a);
    this.transition(a, PharmacyAllocationState.CANCELLED, user.id, { reason });
    a.cancellation_reason = reason;
    await a.save();
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationCancelled(a, reason);
    this.bus.emit({ type: 'allocation.cancelled', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: reason || 'pharmacy_cancelled', meta: { order_id: a.order_id } }).catch(() => null);
    return a.toObject();
  }

  private async refreshOrderAfterAllocationChange(orderId: string) {
    const order = await this.orders.findOne({ id: orderId });
    if (!order) return;
    const allocs = await this.allocs.find({ order_id: orderId }).lean();
    const allConfirmed = allocs.every(a => [PharmacyAllocationState.CONFIRMED, PharmacyAllocationState.PARTIALLY_CONFIRMED, PharmacyAllocationState.PREPARING, PharmacyAllocationState.READY_FOR_PICKUP, PharmacyAllocationState.OUT_FOR_DELIVERY, PharmacyAllocationState.DELIVERED, PharmacyAllocationState.REJECTED, PharmacyAllocationState.CANCELLED].includes(a.status as any));
    const allDelivered = allocs.length > 0 && allocs.every(a => [PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED, PharmacyAllocationState.REJECTED].includes(a.status as any));
    const anyOut = allocs.some(a => a.status === PharmacyAllocationState.OUT_FOR_DELIVERY);
    const anyPreparing = allocs.some(a => [PharmacyAllocationState.PREPARING, PharmacyAllocationState.READY_FOR_PICKUP].includes(a.status as any));
    let nextStatus: PharmacyOrderState | null = null;
    let event = '';
    if (allDelivered && order.status !== PharmacyOrderState.DELIVERED && order.status !== PharmacyOrderState.COMPLETED) { nextStatus = PharmacyOrderState.DELIVERED; event = 'all_allocations_delivered'; }
    else if (anyOut && order.status !== PharmacyOrderState.OUT_FOR_DELIVERY) { nextStatus = PharmacyOrderState.OUT_FOR_DELIVERY; event = 'first_out_for_delivery'; }
    else if (anyPreparing && order.status !== PharmacyOrderState.IN_FULFILLMENT) { nextStatus = PharmacyOrderState.IN_FULFILLMENT; event = 'fulfillment_started'; }
    else if (allConfirmed && order.status === PharmacyOrderState.FULLY_ALLOCATED && order.governed_state === 'CONFIRMED') { nextStatus = PharmacyOrderState.CONFIRMED; event = 'all_allocations_confirmed'; }
    if (!nextStatus) return;
    await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: nextStatus,
      actor_role: 'system', patient_account_id: order.patient_account_id, reason: event,
      mutate: async () => {
        order.status = nextStatus!;
        order.timeline.push({ ts: new Date(), event });
        if (nextStatus === PharmacyOrderState.DELIVERED) {
          this.bus.emit({ type: 'pharmacy.all_allocations_delivered', entity_type: 'order', entity_id: order.id, patient_account_id: order.patient_account_id, reason_code: 'all_allocations_delivered', actor_role: 'system', meta: { allocations: allocs.length } }).catch(() => null);
        }
        await order.save();
        return order.toObject();
      },
    }).catch(() => null);
  }

  /** Sweep expired pending_review allocations. Returns counts. */
  async expireStale() {
    const now = new Date();
    const stale = await this.allocs.find({ status: PharmacyAllocationState.PENDING_REVIEW, review_expires_at: { $lt: now } });
    let expired = 0;
    for (const a of stale) {
      await this.split.releaseStockForAllocation(a);
      this.transition(a, PharmacyAllocationState.EXPIRED, 'system', { reason: 'review_timeout' });
      await a.save();
      expired++;
      await this.refreshOrderAfterAllocationChange(a.order_id);
    }
    return { expired, scanned: stale.length };
  }

  async updateInsurance(user: any, allocId: string, body: { status: string; copayAmount?: number; rejectionReason?: string; coveredAmount?: number }) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id: allocId });
    if (!a) throw new NotFoundException('allocation_not_found');
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException('not_yours');

    const order = await this.orders.findOne({ id: a.order_id });
    if (!order) throw new NotFoundException('order_not_found');

    if (!order.insurance_details) {
      throw new BadRequestException('order_has_no_insurance');
    }

    order.insurance_details.approvalStatus = body.status;
    if (body.copayAmount !== undefined) order.insurance_details.copayAmount = body.copayAmount;
    if (body.coveredAmount !== undefined) order.insurance_details.coveredAmount = body.coveredAmount;
    if (body.rejectionReason !== undefined) order.insurance_details.rejectionReason = body.rejectionReason;
    
    order.insurance_details.approvalDate = new Date();
    order.insurance_details.approvedBy = user.id;

    order.markModified('insurance_details');
    await order.save();

    // Trigger notification or workflow
    this.bus.emit({ type: 'pharmacy.insurance.updated', entity_type: 'order', entity_id: order.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, patient_account_id: order.patient_account_id, meta: { allocId: a.id, status: body.status, copayAmount: body.copayAmount } }).catch(() => null);
    
    return { success: true, insurance_details: order.insurance_details };
  }
}
