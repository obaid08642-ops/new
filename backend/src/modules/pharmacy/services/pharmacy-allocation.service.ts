import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ServiceUnavailableException, Inject } from '@nestjs/common';
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
    const order: any = await this.orders.findOne({ id: a.order_id }, { _id: 0, __v: 0, patient_account_id: 0 }).lean();
    // Master spec: patient contact is revealed to the pharmacy ONLY after the patient selected this offer.
    let patient_contact: any = null;
    if (order && order.selected_allocation_id === a.id && order.selected_offer_id === a.offer_id) {
      const patient: any = await this.orders.db.collection('users').findOne({ id: order.patient_account_id });
      if (patient) patient_contact = { name: patient.full_name || patient.name || null, phone: patient.phone || null };
    }
    return { ...a, order, patient_contact };
  }

  /** Pharmacist sets an item-level action: available / substitute / unavailable. */
  async itemAction(user: any, allocId: string, allocItemId: string, body: { action: AllocationItemAction; substitute_sku?: string; substitute_reason?: string; qty_offered?: number; notes?: string }) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id: allocId });
    if (!a) throw new NotFoundException('allocation_not_found');
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException('not_yours');
    // Once a patient has chosen a versioned offer, its contents and price are
    // immutable. A provider must compose a new offer before selection instead.
    if ((a as any).offer_id) throw new BadRequestException('selected_offer_immutable');
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

  /**
   * The allocation exists only because the patient selected a quote. Every
   * provider-side fulfillment action must re-check that exact quote and the
   * server-authoritative financial gate before changing operational state.
   */
  private async assertFulfillmentAuthorized(a: any) {
    const order: any = await this.orders.findOne({ id: a.order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (!order.selected_offer_id || !order.selected_allocation_id ||
        order.selected_offer_id !== a.offer_id || order.selected_allocation_id !== a.id ||
        Number(order.selected_offer_version) !== Number(a.offer_version)) {
      throw new BadRequestException('selected_offer_binding_required');
    }
    const quotedTotal = Number(order.pricing_snapshot?.totals?.total);
    if (!order.pricing_snapshot || order.pricing_snapshot.offer_id !== a.offer_id ||
        Number(order.pricing_snapshot.offer_version) !== Number(a.offer_version) ||
        !Number.isFinite(quotedTotal) || Math.round(quotedTotal * 100) !== Math.round(Number(a.totals?.total || 0) * 100)) {
      throw new BadRequestException('selected_quote_version_mismatch');
    }

    const paymentMethod = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
    const paidFor = async (amount: number) => {
      // A generic order-level paid flag or booking lookup is never payment evidence for a selected quote.
      const snapshotHash = String(order.pricing_snapshot?.hash || '');
      if (!snapshotHash) return false;
      const payment: any = await this.orders.db.collection('pharmacy_payment_evidence').findOne({
        order_id: order.id, selected_offer_id: a.offer_id, selected_offer_version: a.offer_version,
        quote_snapshot_hash: snapshotHash, amount: Math.round(amount * 100) / 100,
        currency: String(a.totals?.currency || 'SAR'), payer_account_id: order.patient_account_id,
        status: 'confirmed', gateway_payment_id: { $exists: true }, webhook_event_id: { $exists: true },
      });
      return !!payment;
    };

    if (paymentMethod === 'cash' || paymentMethod === 'card') {
      if (!await paidFor(quotedTotal)) throw new BadRequestException('payment_confirmation_required');
      return order;
    }
    if (paymentMethod === 'cod') {
      const policy: any = await this.orders.db.collection('pharmacy_fulfillment_policies').findOne({
        active: true, payment_method: 'cod', allow_preparation: true,
        $or: [{ provider_account_id: a.pharmacy_account_id }, { provider_account_id: null }, { provider_account_id: { $exists: false } }],
      });
      if (!policy) throw new BadRequestException('cod_policy_confirmation_required');
      return order;
    }
    if (paymentMethod === 'insurance') {
      const decision: any = order.insurance_decision;
      if (!decision || decision.offer_id !== a.offer_id || Number(decision.offer_version) !== Number(a.offer_version)) {
        throw new BadRequestException('insurance_decision_required');
      }
      if (decision.outcome === 'full' && Number(decision.patient_share || 0) === 0) return order;
      if (decision.outcome === 'partial' && Number(decision.patient_share || 0) > 0 && await paidFor(Number(decision.patient_share))) return order;
      if (decision.outcome === 'rejected') throw new BadRequestException('insurance_requote_required');
      throw new BadRequestException('copay_payment_confirmation_required');
    }
    throw new BadRequestException('unsupported_payment_method');
  }

  async confirm(user: any, id: string) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    await this.assertFulfillmentAuthorized(a);
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
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    await this.assertFulfillmentAuthorized(a);
    const order: any = await this.orders.findOne({ id: a.order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (order?.delivery?.method === 'pickup') throw new BadRequestException('pickup_orders_are_handed_over_not_shipped');
    const fromStatus = a.status;
    this.transition(a, PharmacyAllocationState.OUT_FOR_DELIVERY, user.id);
    await a.save();
    await this.orders.updateOne({ id: a.order_id }, {
      $set: {
        'delivery.courier_name': String(body?.courier_name || '').slice(0, 120) || undefined,
        'delivery.courier_phone': String(body?.courier_phone || '').slice(0, 32) || undefined,
        'delivery.courier_eta': body?.eta ? new Date(body.eta) : undefined,
        'delivery.dispatched_at': new Date(),
      },
      $push: { timeline: { ts: new Date(), event: 'out_for_delivery', by: user.id } },
    });
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationProgress(a);
    await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: 'transition_to_out_for_delivery', before: { status: fromStatus }, after: { status: a.status }, meta: { order_id: a.order_id } });
    return a.toObject();
  }

  async delivered(user: any, id: string, body?: { collection?: { method: 'cash' | 'card_terminal'; amount_collected: number } }) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    await this.assertFulfillmentAuthorized(a);
    const order: any = await this.orders.findOne({ id: a.order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    const method = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
    const isCod = method === 'cod' || order.status === PharmacyOrderState.COD_DUE_ON_DELIVERY;
    if (isCod) {
      // Master spec: COD delivery requires collection proof matching the selected quote total exactly.
      const expected = Math.round(Number(order.pricing_snapshot?.totals?.total ?? a.totals?.total) * 100) / 100;
      const collected = Number(body?.collection?.amount_collected);
      const collMethod = body?.collection?.method;
      if (!['cash', 'card_terminal'].includes(String(collMethod)) || !Number.isFinite(collected)) {
        throw new BadRequestException('cod_collection_proof_required');
      }
      if (Math.round(collected * 100) / 100 !== expected) {
        throw new BadRequestException('collected_amount_must_match_selected_quote_total');
      }
      await this.orders.db.collection('pharmacy_payment_evidence').insertOne({
        id: uuidv4(),
        kind: 'cod_collection',
        order_id: order.id,
        allocation_id: a.id,
        selected_offer_id: a.offer_id,
        selected_offer_version: a.offer_version,
        amount: Math.round(collected * 100) / 100,
        currency: String(a.totals?.currency || 'SAR'),
        method: collMethod,
        collected_by: user.id,
        collected_at: new Date(),
        status: 'confirmed',
      });
      await this.orders.updateOne({ id: a.order_id }, {
        $set: { 'delivery.collection_proof': { method: collMethod, amount_collected: Math.round(collected * 100) / 100, collected_by: user.id, collected_at: new Date() } },
      });
    }
    const fromStatus = a.status;
    this.transition(a, PharmacyAllocationState.DELIVERED, user.id);
    await a.save();
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationProgress(a);
    await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: 'transition_to_delivered', before: { status: fromStatus }, after: { status: a.status }, meta: { order_id: a.order_id } });
    return a.toObject();
  }

  private async advance(user: any, id: string, to: PharmacyAllocationState) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    await this.assertFulfillmentAuthorized(a);
    const fromStatus = a.status;
    this.transition(a, to, user.id);
    await a.save();
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.notif.notifyPatientAllocationProgress(a);
    await this.bus.emit({ type: 'allocation.updated', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: `transition_to_${to}`, before: { status: fromStatus }, after: { status: to }, meta: { order_id: a.order_id } });
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
    await this.bus.emit({ type: 'allocation.cancelled', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'provider', pharmacy_account_id: user.id, reason_code: reason || 'pharmacy_cancelled', meta: { order_id: a.order_id } });
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
    else if (allConfirmed && order.status === PharmacyOrderState.FULLY_ALLOCATED) { nextStatus = PharmacyOrderState.CONFIRMED; event = 'all_allocations_confirmed'; }
    if (!nextStatus) return;
    await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: nextStatus,
      actor_role: 'system', patient_account_id: order.patient_account_id, reason: event,
      mutate: async () => {
        order.status = nextStatus!;
        order.timeline.push({ ts: new Date(), event });
        if (nextStatus === PharmacyOrderState.DELIVERED) {
          await this.bus.emit({ type: 'pharmacy.all_allocations_delivered', entity_type: 'order', entity_id: order.id, patient_account_id: order.patient_account_id, reason_code: 'all_allocations_delivered', actor_role: 'system', meta: { allocations: allocs.length } });
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

  /** Legacy provider-controlled insurance route is intentionally unavailable. */
  updateInsurance() {
    throw new ServiceUnavailableException('legacy_allocation_insurance_disabled_use_admin_selected_offer_decision');
  }
}
