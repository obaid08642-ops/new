import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ServiceUnavailableException, Inject, Logger } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyOrder, PharmacyOrderState, PharmacyAllocation, PharmacyAllocationState, ALLOCATION_TRANSITIONS, ORDER_TRANSITIONS, AllocationItemAction } from '../schemas/pharmacy.schema';
import { PharmacyInventoryItem } from '../../provider/schemas/capabilities.schema';
import { SmartSplitService } from './smart-split.service';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { EventBusService } from '../../events/event-bus.service';
import { WorkflowEngineService } from '../../workflow-engine/workflow-engine.module';
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyInventoryItemRepository } from "./repositories/pharmacyinventoryitem.repository";
import { isProviderRole } from '../../../common/enums';
import { settlementDelayDefault } from '../../../common/commission-defaults';
import { assertSubstituteInsidePrescription } from './rx-rules';

function assertProvider(u: any) { if (!u || !isProviderRole(u.role)) throw new ForbiddenException('provider_scope_required'); }
function assertPatient(u: any) { if (!u || u.role !== 'patient') throw new ForbiddenException('patient_scope_required'); }

/** P13-R2: totals are always derived from the decided items, never from a pending proposal. */
export function recalcAllocationTotals(a: any) {
  a.totals.subtotal = a.items.filter((i: any) => i.action === AllocationItemAction.AVAILABLE || i.action === AllocationItemAction.SUBSTITUTE).reduce((s: number, i: any) => s + (i.unit_price || 0) * (i.qty_offered || 0), 0);
  a.totals.total = a.totals.subtotal + (a.totals.delivery_fee || 0);
}

/** P13-R2: fulfilment must wait until the patient decided every proposal. */
export function pendingSubstituteProposals(a: any): any[] {
  return (a.items || []).filter((i: any) => i?.substitute_status === 'proposed');
}

/** P13-R2: deterministic snapshot hash, identical to the one stored at offer selection. */
export function buildQuoteHash(offer_id: string, offer_version: number, totals: any): string {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require('crypto');
  return crypto.createHash('sha256').update(JSON.stringify({ offer_id, offer_version, totals })).digest('hex');
}

type AllocationRow = { id: string; order_id: string; offer_id?: string; status: string } & Record<string, unknown>;
type PendingOrderRow = { id: string; selected_allocation_id?: string; selected_offer_id?: string };

@Injectable()
export class PharmacyAllocationService {
  private readonly logger = new Logger('PharmacyAllocation');
  constructor(
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyInventoryItemRepository') private inv: PharmacyInventoryItemRepository,
    private split: SmartSplitService,
    private notif: PharmacyNotificationService,
    private bus: EventBusService,
    private engine: WorkflowEngineService,
  ) {}

  // Inventory tracking is OPTIONAL per provider (default off — no-balances model).
  // When off, stock checks/reservations are skipped entirely.
  async tracksInventory(provider_account_id: string): Promise<boolean> {
    try {
      const doc: any = await (this.inv as any).model.db.collection('provider_settings').findOne({ provider_id: provider_account_id });
      return doc?.inventory_tracking === true;
    } catch {
      return false;
    }
  }

  async getInventoryTracking(user: any) {
    return { inventory_tracking: await this.tracksInventory(user.id) };
  }

  async setInventoryTracking(user: any, body: any) {
    const value = body?.inventory_tracking === true;
    await (this.inv as any).model.db.collection('provider_settings').updateOne(
      { provider_id: user.id },
      { $set: { provider_id: user.id, inventory_tracking: value, updatedAt: new Date() } },
      { upsert: true },
    );
    return { ok: true, inventory_tracking: value };
  }

  async listForProvider(user: any, status?: string) {    assertProvider(user);
    const q: any = { pharmacy_account_id: user.id };
    if (status) q.status = status;
    const rows: AllocationRow[] = await this.allocs.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(100).lean();
    // Each row says whether its order waits for this pharmacy to record the insurer's
    // decision (relay only, owner decision 35), so the Orders card can open that form inline.
    // The rule matches PharmacyInsuranceDecisionService.decide: the selected allocation of an
    // order in insurance_decision_pending, no decision recorded yet, still before fulfilment.
    const orderIds = [...new Set(rows.map((r) => r.order_id).filter(Boolean))];
    const pending: PendingOrderRow[] = orderIds.length
      ? await this.orders.find(
        { id: { $in: orderIds }, status: PharmacyOrderState.INSURANCE_DECISION_PENDING, insurance_decision: { $exists: false } },
        { _id: 0, id: 1, selected_allocation_id: 1, selected_offer_id: 1 },
      ).lean()
      : [];
    const awaiting = new Set<string>(pending.map((o) => `${o.id}|${o.selected_allocation_id}|${o.selected_offer_id}`));
    const decidable: string[] = [PharmacyAllocationState.PENDING_REVIEW, PharmacyAllocationState.PARTIALLY_CONFIRMED];
    return rows.map((r) => ({
      ...r,
      awaits_insurance_decision: !!r.offer_id && decidable.includes(r.status) && awaiting.has(`${r.order_id}|${r.id}|${r.offer_id}`),
    }));
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
    // P13-R2: SUBSTITUTE never applies at once; it stores a proposal the
    // patient decides (decideSubstitute). Other actions apply immediately.
    if (body.action !== AllocationItemAction.SUBSTITUTE) {
      item.action = body.action;
    }
    item.notes = body.notes || item.notes;
    item.updated_at = new Date();

    if (body.action === AllocationItemAction.SUBSTITUTE) {
      if (!body.substitute_sku) throw new BadRequestException('substitute_sku_required');
      const subInv = await this.inv.findOne({ provider_account_id: user.id, sku: body.substitute_sku, available: true });
      if (!subInv) throw new BadRequestException('substitute_not_in_inventory');
      const order: any = await this.orders.findOne({ id: a.order_id });
      await assertSubstituteInsidePrescription(this.orders.db, order?.items?.find((i: any) => i.id === item.order_item_id), subInv);
      const tracking = await this.split.holdsStock(a);
      if (tracking && subInv.stock < (body.qty_offered || item.qty_requested)) throw new BadRequestException('substitute_insufficient_stock');
      // P13-R2: never automatic. Store the proposal; sku, price, stock and
      // totals change only when the patient accepts (decideSubstitute). Any
      // reservation the original line holds stays until that decision.
      const qty = body.qty_offered || item.qty_requested;
      item.substitute_status = 'proposed';
      item.substitute_proposal = {
        sku: subInv.sku,
        name: subInv.name_ar || subInv.name_en,
        unit_price: subInv.price,
        qty_offered: qty,
        reason: body.substitute_reason,
      };
      item.notes = body.notes || item.notes;
      item.updated_at = new Date();
    } else if (body.action === AllocationItemAction.UNAVAILABLE) {
      // Release any reservation
      if (prevAction === AllocationItemAction.AVAILABLE && prevInvId && prevQty && await this.split.holdsStock(a)) {
        await this.inv.updateOne({ id: prevInvId, provider_account_id: user.id }, { $inc: { stock: prevQty } });
      }
      item.qty_offered = 0;
      item.inventory_id = undefined;
    } else if (body.action === AllocationItemAction.AVAILABLE) {
      // Adjust quantity if provided
      const newQty = body.qty_offered || item.qty_requested;
      if (newQty !== prevQty) {
        const delta = newQty - prevQty;
        if (delta > 0 && await this.split.holdsStock(a)) {
          // Need to reserve more
          const reserved = await this.inv.findOneAndUpdate(
            { id: item.inventory_id, provider_account_id: user.id, stock: { $gte: delta } },
            { $inc: { stock: -delta } },
          );
          if (!reserved) throw new BadRequestException('insufficient_stock_for_increase');
        } else if (delta < 0 && item.inventory_id && await this.split.holdsStock(a)) {
          await this.inv.updateOne({ id: item.inventory_id, provider_account_id: user.id }, { $inc: { stock: -delta } });
        }
        item.qty_offered = newQty;
      }
    }

    // Recalculate totals (a pending proposal changes nothing until accepted)
    recalcAllocationTotals(a);
    a.timeline.push({ ts: new Date(), event: 'item_action', by: user.id, meta: { item_id: allocItemId, action: body.action } });
    a.markModified('items');
    await a.save();

    // Notify patient if item became unavailable
    if (body.action === AllocationItemAction.UNAVAILABLE) {
      await this.notif.notifyPatientItemUnavailable(a, item);
    }
    if (body.action === AllocationItemAction.SUBSTITUTE) {
      await this.notif.notifyPatientSubstituteProposed(a, item);
    }
    return a.toObject();
  }

  /**
   * P13-R2: the patient decides a proposed substitute, per item. Accept swaps
   * the line and updates the order total (and its pricing snapshot, so the
   * fulfilment gate keeps holding); reject removes the line. A price
   * difference against an already-confirmed payment fails closed downstream
   * (payment_confirmation_required) — settling it is payments territory.
   */
  async decideSubstitute(user: any, allocId: string, allocItemId: string, decision: 'accepted' | 'rejected'): Promise<any> {
    assertPatient(user);
    if (decision !== 'accepted' && decision !== 'rejected') throw new BadRequestException('invalid_substitute_decision');
    const a = await this.allocs.findOne({ id: allocId });
    if (!a) throw new NotFoundException('allocation_not_found');
    const order: any = await this.orders.findOne({ id: a.order_id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    const item = a.items.find((i: any) => i.id === allocItemId);
    if (!item) throw new NotFoundException('alloc_item_not_found');
    if (item.substitute_status !== 'proposed' || !item.substitute_proposal?.sku) {
      throw new BadRequestException('no_substitute_proposal');
    }
    const now = new Date();
    if (decision === 'accepted') {
      const p = item.substitute_proposal;
      const subInv = await this.inv.findOne({ provider_account_id: a.pharmacy_account_id, sku: p.sku, available: true });
      if (!subInv) throw new BadRequestException('substitute_no_longer_available');
      await assertSubstituteInsidePrescription(this.orders.db, order.items?.find((i: any) => i.id === item.order_item_id), subInv);
      const tracking = await this.split.holdsStock(a);
      const qty = p.qty_offered || item.qty_requested;
      if (tracking && subInv.stock < qty) throw new BadRequestException('substitute_insufficient_stock');
      // Release the original line's reservation, then reserve the substitute.
      if (tracking && item.action === AllocationItemAction.AVAILABLE && item.inventory_id && item.qty_offered) {
        await this.inv.updateOne({ id: item.inventory_id, provider_account_id: a.pharmacy_account_id }, { $inc: { stock: item.qty_offered } });
      }
      if (tracking) {
        const reserved = await this.inv.findOneAndUpdate(
          { id: subInv.id, provider_account_id: a.pharmacy_account_id, stock: { $gte: qty } },
          { $inc: { stock: -qty } },
        );
        if (!reserved) throw new BadRequestException('substitute_stock_race');
      }
      item.substitute_for_sku = item.sku;
      item.substitute_reason = p.reason;
      item.inventory_id = subInv.id;
      item.sku = subInv.sku;
      item.name = subInv.name_ar || subInv.name_en;
      item.qty_offered = qty;
      item.unit_price = subInv.price;
      item.action = AllocationItemAction.SUBSTITUTE;
      item.substitute_status = 'accepted';
      item.updated_at = now;
      recalcAllocationTotals(a);
      a.timeline.push({ ts: now, event: 'substitute_accepted', by: user.id, meta: { item_id: allocItemId, sku: item.sku, unit_price: item.unit_price, total: a.totals?.total } });
      await this.syncOrderTotalsToAllocation(order, a, now, 'substitute_accepted');
    } else {
      const tracking = await this.split.holdsStock(a);
      if (tracking && item.action === AllocationItemAction.AVAILABLE && item.inventory_id && item.qty_offered) {
        await this.inv.updateOne({ id: item.inventory_id, provider_account_id: a.pharmacy_account_id }, { $inc: { stock: item.qty_offered } });
      }
      item.action = AllocationItemAction.UNAVAILABLE;
      item.qty_offered = 0;
      item.inventory_id = undefined;
      item.substitute_status = 'rejected';
      item.updated_at = now;
      recalcAllocationTotals(a);
      a.timeline.push({ ts: now, event: 'substitute_rejected', by: user.id, meta: { item_id: allocItemId } });
      await this.syncOrderTotalsToAllocation(order, a, now, 'substitute_rejected');
    }
    a.markModified('items');
    await a.save();
    await this.notif.notifyPharmacySubstituteDecided(a, item, decision);
    await this.bus.emit({ type: decision === 'accepted' ? 'substitute.accepted' : 'substitute.rejected', entity_type: 'allocation', entity_id: a.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: order.patient_account_id, pharmacy_account_id: a.pharmacy_account_id, meta: { order_id: a.order_id, order_item_id: item.order_item_id } });
    return { ok: true, decision, totals: a.totals };
  }

  /** P13-R2: keep the order's server-authoritative totals with the decided allocation. */
  private async syncOrderTotalsToAllocation(order: any, a: any, now: Date, event: string) {
    const totals = { subtotal: a.totals.subtotal, delivery_fee: a.totals.delivery_fee || 0, total: a.totals.total, currency: a.totals.currency || 'SAR' };
    // Pre-selection composition allocations carry no offer binding yet; only
    // bound allocations own a pricing snapshot (the fulfilment gate reads it).
    const set: any = { totals };
    if (a.offer_id) {
      set.pricing_snapshot = { offer_id: a.offer_id, offer_version: a.offer_version, totals, hash: buildQuoteHash(a.offer_id, a.offer_version, totals), captured_at: now };
    }
    await this.orders.updateOne({ id: order.id }, {
      $set: set,
      $push: { timeline: { ts: now, event, meta: { allocation_id: a.id, totals } } },
    });
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
    // P13-R2: never fulfil past a substitute the patient has not decided.
    if (pendingSubstituteProposals(a).length > 0) throw new BadRequestException('substitute_acceptance_required');
    await this.assertFulfillmentAuthorized(a);
    const anyUnavailable = a.items.some(i => i.action === AllocationItemAction.UNAVAILABLE);
    const anyAvailable = a.items.some(i => i.action !== AllocationItemAction.UNAVAILABLE);
    if (!anyAvailable) {
      this.transition(a, PharmacyAllocationState.REJECTED, user.id, { reason: 'all_items_unavailable' });
      a.rejection_reason = 'all_items_unavailable';
    } else if (anyUnavailable && a.status !== PharmacyAllocationState.PARTIALLY_CONFIRMED) {
      this.transition(a, PharmacyAllocationState.PARTIALLY_CONFIRMED, user.id);
    } else {
      // #1143: confirming a partially confirmed allocation goes ahead with the available lines (it used to ask for
      // partially_confirmed again, which the state machine refuses, so the order could never reach preparation).
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
  async outForDelivery(user: any, id: string, body?: { courier_name?: string; courier_phone?: string; eta?: Date | string }) {
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
    await this.settleDeliveredAllocation(a, isCod);
    // Delivery is payment-gated upstream (assertFulfillmentAuthorized), so a
    // delivered allocation completes its order: DELIVERED -> COMPLETED.
    await this.refreshOrderAfterAllocationChange(a.order_id);
    await this.orders.updateOne({ id: a.order_id, status: PharmacyOrderState.DELIVERED }, {
      $set: { status: PharmacyOrderState.COMPLETED },
      $push: { timeline: { ts: new Date(), event: 'order_completed', by: user.id } },
    }).catch(() => null);
    return a.toObject();
  }

  /**
   * Wallet settlement on delivery completion (idempotent per allocation):
   *  - Online-paid (card/insurance copay via gateway): platform holds the money →
   *    credit the pharmacy its net (gross − commission − VAT) into escrow.
   *  - COD: the pharmacy already holds the full cash → it owes the platform
   *    commission + VAT (ledger debit). No earning is posted.
   */
  private async settleDeliveredAllocation(a: any, isCod: boolean) {
    const ledger = this.orders.db.collection('platformledgerentries');
    const refType = 'pharmacy_allocation';
    const refId = String(a.id);
    const dup = await ledger.findOne({ ref_type: refType, ref_id: refId, type: { $in: ['provider_earning', 'provider_debit'] } });
    if (dup) return;
    const gross = Math.round(Number(a.totals?.total || 0) * 100) / 100;
    if (!(gross > 0)) return;
    const cfg: any = await this.orders.db.collection('finance_config').findOne({ key: 'commissions' });
    const pct = Number(cfg?.service_types?.pharmacy?.percent ?? 10);
    const vatPct = Number(cfg?.tax?.vat_percent ?? 15);
    const commission = Math.round(gross * pct) / 100;
    const vat = Math.round(commission * vatPct) / 100;
    const now = new Date();
    if (isCod) {
      await ledger.insertOne({
        id: `le_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        provider_account_id: a.pharmacy_account_id, type: 'provider_debit', state: 'cleared',
        amount: Math.round((commission + vat) * 100) / 100,
        ref_type: refType, ref_id: refId, order_id: a.order_id,
        gross, commission_percent: pct, commission, vat,
        description: 'COD commission + VAT owed to platform (cash collected by pharmacy)',
        actor_id: 'system', createdAt: now,
      });
      return;
    }
    const delayDays = Number(cfg?.settlement?.delay_days?.pharmacy ?? cfg?.settlement?.delay_days?.default ?? settlementDelayDefault());
    const net = Math.round((gross - commission - vat) * 100) / 100;
    await ledger.insertOne({
      id: `earn_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      provider_account_id: a.pharmacy_account_id, type: 'provider_earning', state: 'pending',
      available_at: new Date(now.getTime() + delayDays * 24 * 3600 * 1000),
      amount: net, gross, commission_percent: pct, commission, vat,
      ref_type: refType, ref_id: refId, order_id: a.order_id,
      description: 'Pharmacy order earning (escrow until settlement delay)',
      actor_id: 'system', createdAt: now,
    });
  }

  private async advance(user: any, id: string, to: PharmacyAllocationState) {
    assertProvider(user);
    const a = await this.allocs.findOne({ id });
    if (!a) throw new NotFoundException();
    if (a.pharmacy_account_id !== user.id) throw new ForbiddenException();
    // P13-R2: never fulfil past a substitute the patient has not decided.
    if (pendingSubstituteProposals(a).length > 0) throw new BadRequestException('substitute_acceptance_required');
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
    // Target stage from the allocations, then walk the order there one ALLOWED step at a time
    // (ORDER_TRANSITIONS). Payment states (cod_due_on_delivery, payment/insurance settled, fully_allocated)
    // may only move to CONFIRMED; jumping straight to in_fulfillment/delivered was rejected by the engine,
    // the error was swallowed, and a cash order never left cod_due_on_delivery even after delivery.
    const PROGRESSION = [PharmacyOrderState.CONFIRMED, PharmacyOrderState.IN_FULFILLMENT, PharmacyOrderState.OUT_FOR_DELIVERY, PharmacyOrderState.DELIVERED];
    const EVENTS: Record<string, string> = {
      [PharmacyOrderState.CONFIRMED]: 'all_allocations_confirmed', [PharmacyOrderState.IN_FULFILLMENT]: 'fulfillment_started',
      [PharmacyOrderState.OUT_FOR_DELIVERY]: 'first_out_for_delivery', [PharmacyOrderState.DELIVERED]: 'all_allocations_delivered',
    };
    const target = allDelivered ? PharmacyOrderState.DELIVERED : anyOut ? PharmacyOrderState.OUT_FOR_DELIVERY
      : anyPreparing ? PharmacyOrderState.IN_FULFILLMENT : allConfirmed ? PharmacyOrderState.CONFIRMED : null;
    if (!target) return;
    for (let guard = 0; guard < PROGRESSION.length; guard++) {
      const cur = order.status as PharmacyOrderState;
      if (cur === PharmacyOrderState.COMPLETED || cur === PharmacyOrderState.CANCELLED || cur === target) return;
      const curIdx = PROGRESSION.indexOf(cur);
      if (curIdx >= PROGRESSION.indexOf(target)) return;
      const allowed = ORDER_TRANSITIONS[cur] || [];
      // farthest stage toward the target that this state allows (pickup goes in_fulfillment -> delivered)
      const next = PROGRESSION.slice(curIdx + 1, PROGRESSION.indexOf(target) + 1).reverse().find((st) => allowed.includes(st))
        || (allowed.includes(PharmacyOrderState.CONFIRMED) ? PharmacyOrderState.CONFIRMED : null);
      if (!next) { this.logger.warn(`order ${orderId}: no allowed step from ${cur} toward ${target}`); return; }
      const event = EVENTS[next];
      const ok = await this.engine.transition({
        kind: 'pharmacy', entity_id: order.id, from_domain: cur, to_domain: next,
        actor_role: 'system', patient_account_id: order.patient_account_id, reason: event,
        mutate: async () => {
          order.status = next;
          order.timeline.push({ ts: new Date(), event });
          if (next === PharmacyOrderState.DELIVERED) {
            await this.bus.emit({ type: 'pharmacy.all_allocations_delivered', entity_type: 'order', entity_id: order.id, patient_account_id: order.patient_account_id, reason_code: 'all_allocations_delivered', actor_role: 'system', meta: { allocations: allocs.length } });
          }
          await order.save();
          return order.toObject();
        },
      }).then(() => true).catch((e: any) => { this.logger.error(`order ${orderId}: ${cur} -> ${next} failed: ${e?.message}`); return false; });
      if (!ok) return;
    }
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
