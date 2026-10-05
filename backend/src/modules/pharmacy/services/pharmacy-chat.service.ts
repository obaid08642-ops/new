/**
 * Phase 2A-rework: Pharmacy Chat Service for substitute negotiation.
 * Content filter blocks phone numbers, URLs, external messenger refs.
 * Auto-close 12h after order delivered/completed.
 */
import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PharmacyChatThread, PharmacyChatMessage, PharmacyOrder, PharmacyOrderState, PharmacyAllocation, AllocationItemAction } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyChatThreadRepository } from "./repositories/pharmacychatthread.repository";
import { PharmacyChatMessageRepository } from "./repositories/pharmacychatmessage.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";

const BLOCK_PATTERNS: Array<{ name: string; re: RegExp }> = [
  { name: 'phone_e164', re: /(\+?\d{1,3}[-.\s]?)?(\(?\d{2,4}\)?[-.\s]?){2,4}\d{2,4}/g },
  { name: 'arabic_phone', re: /[٠-٩۰-۹]{6,}/g },
  { name: 'url', re: /\b(?:https?:\/\/|www\.|t\.me\/|wa\.me\/|bit\.ly\/)[^\s]+/gi },
  { name: 'external_app', re: /\b(whats?app|telegram|signal|messenger|viber|imo|skype|zoom|google\s*meet|teams)\b/gi },
  { name: 'email', re: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g },
];

function screen(text: string): { ok: boolean; reason?: string } {
  if (!text) return { ok: true };
  const t = String(text);
  for (const p of BLOCK_PATTERNS) if (p.re.test(t)) return { ok: false, reason: p.name };
  return { ok: true };
}

interface SubstituteTotals { subtotal: number; delivery_fee: number; total: number; currency: string }

const round2 = (n: number) => Math.round(n * 100) / 100;

/** Allocation totals from its lines: available + substitute items, price x offered qty. */
function allocationTotals(alloc: PharmacyAllocation): SubstituteTotals {
  const subtotal = round2(alloc.items
    .filter(i => i.action === AllocationItemAction.AVAILABLE || i.action === AllocationItemAction.SUBSTITUTE)
    .reduce((sum, i) => sum + (Number(i.unit_price) || 0) * (Number(i.qty_offered) || 0), 0));
  const deliveryFee = Number(alloc.totals?.delivery_fee) || 0;
  return { subtotal, delivery_fee: deliveryFee, total: round2(subtotal + deliveryFee), currency: alloc.totals?.currency || 'SAR' };
}

@Injectable()
export class PharmacyChatService {
  constructor(
    @Inject('PharmacyChatThreadRepository') private threads: PharmacyChatThreadRepository,
    @Inject('PharmacyChatMessageRepository') private messages: PharmacyChatMessageRepository,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    private bus: EventBusService,
  ) {}

  async openOrGetThread(order_id: string, order_item_id: string, pharmacy_account_id: string): Promise<PharmacyChatThread> {
    const order = await this.orders.findOne({ id: order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    let t = await this.threads.findOne({ order_id, order_item_id, pharmacy_account_id });
    if (!t) {
      t = await this.threads.create({
        id: uuidv4(),
        order_id, patient_account_id: order.patient_account_id, pharmacy_account_id, order_item_id,
        status: 'open',
      });
    }
    return t;
  }

  async listThreads(user: any, order_id?: string): Promise<any> {
    const q: any = {};
    if (user.role === 'patient') q.patient_account_id = user.id;
    else if (user.role === 'provider') q.pharmacy_account_id = user.id;
    else throw new ForbiddenException();
    if (order_id) q.order_id = order_id;
    return this.threads.find(q).sort({ updatedAt: -1 }).lean();
  }

  async listMessages(user: any, thread_id: string): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id }).lean();
    if (!t) throw new NotFoundException();
    if (user.role === 'patient' && t.patient_account_id !== user.id) throw new ForbiddenException();
    if (user.role === 'provider' && t.pharmacy_account_id !== user.id) throw new ForbiddenException();
    const msgs = await this.messages.find({ thread_id, blocked: { $ne: true } }).sort({ createdAt: 1 }).lean();
    return { thread: t, messages: msgs };
  }

  async postMessage(user: any, thread_id: string, body: { text?: string; image_uri?: string; substitute_offer?: any }): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const isPatient = t.patient_account_id === user.id;
    const isPharmacy = t.pharmacy_account_id === user.id;
    if (!isPatient && !isPharmacy) throw new ForbiddenException();
    // Screen content (only text fields are screened; offers are structured)
    const screened = screen(body.text || '');
    if (!screened.ok) {
      const blockedMsg = await this.messages.create({
        id: uuidv4(), thread_id, sender_account_id: user.id,
        sender_role: isPatient ? 'patient' : 'pharmacy',
        text: '[BLOCKED]', blocked: true, blocked_reason: screened.reason,
      });
      throw new BadRequestException({ code: 'content_blocked', reason: screened.reason, message_id: blockedMsg.id });
    }
    const m = await this.messages.create({
      id: uuidv4(), thread_id, sender_account_id: user.id,
      sender_role: isPatient ? 'patient' : 'pharmacy',
      // Only the pharmacy proposes substitutes; a patient message never carries one.
      text: body.text, image_uri: body.image_uri, substitute_offer: isPharmacy ? body.substitute_offer : undefined,
    });
    t.last_message_at = new Date();
    await t.save();
    if (body.substitute_offer && isPharmacy) {
      await this.bus.emit({ type: 'substitute.proposed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: isPatient ? 'patient' : 'provider', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: m.id, offer: body.substitute_offer } });
    }
    return m.toObject();
  }

  /**
   * Patient: accept a substitute the pharmacy offered in a chat thread. The
   * allocation item becomes the substitute and the totals are recomputed from
   * the allocation lines (same rule as a pharmacy-side item edit). When this
   * allocation is the order's selected one, the order totals and the quote
   * snapshot the payment is bound to follow, so the patient pays the new total.
   * Once a payment for the current quote is confirmed the price cannot move.
   */
  async acceptSubstitute(user: any, thread_id: string, message_id: string): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const msg = await this.messages.findOne({ id: message_id, thread_id }).lean();
    if (!msg || !msg.substitute_offer) throw new BadRequestException('no_substitute_offer');
    // Only the pharmacy of this thread can propose a substitute.
    if (msg.sender_role !== 'pharmacy' || msg.sender_account_id !== t.pharmacy_account_id) {
      throw new BadRequestException('substitute_not_from_pharmacy');
    }
    const offeredPrice = Number(msg.substitute_offer.price);
    const totals = await this.changeAllocationLine(user, t, 'substitute_accepted', (alloc) => {
      const item = alloc.items.find(i => i.order_item_id === t.order_item_id);
      if (!item) return false;
      item.action = AllocationItemAction.SUBSTITUTE;
      item.substitute_for_sku = item.sku;
      item.sku = msg.substitute_offer.sku || item.sku;
      item.name = msg.substitute_offer.name || item.name;
      item.substitute_reason = msg.substitute_offer.notes || 'patient_accepted_in_chat';
      if (Number.isFinite(offeredPrice) && offeredPrice >= 0) item.unit_price = offeredPrice;
      item.updated_at = new Date();
      return true;
    }, { message_id: msg.id });
    t.status = 'closed';
    t.resolution = 'accepted';
    await t.save();
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', text: `البديل مقبول من المريض.` });
    await this.bus.emit({ type: 'substitute.accepted', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: msg.id } });
    return { ok: true, ...(totals ? { totals } : {}) };
  }

  /**
   * Apply a patient decision to the pharmacy's allocation line for this thread
   * and recompute the totals from the allocation lines. When the allocation is
   * the order's selected one, the order totals and the quote snapshot the
   * payment is bound to follow (same hash rule as the offer selection). Once a
   * payment for the current quote is confirmed the lines can no longer change.
   * Returns the new totals, or undefined when there was no line to change.
   */
  private async changeAllocationLine(
    user: { id: string },
    t: PharmacyChatThread,
    event: 'substitute_accepted' | 'substitute_rejected_item_removed' | 'item_removed_by_patient',
    mutate: (alloc: PharmacyAllocation) => boolean,
    meta: Record<string, unknown> = {},
  ): Promise<SubstituteTotals | undefined> {
    const alloc = await this.allocs.findOne({ order_id: t.order_id, pharmacy_account_id: t.pharmacy_account_id });
    if (!alloc || !alloc.items.some(i => i.order_item_id === t.order_item_id)) return undefined;
    const order = await this.orders.findOne({ id: t.order_id }).lean();
    const selected = Boolean(order && order.selected_allocation_id === alloc.id);
    if (selected && order.pricing_snapshot?.hash) {
      const paid = await this.orders.db.collection('pharmacy_payment_evidence').findOne({
        order_id: t.order_id, status: 'confirmed', quote_snapshot_hash: order.pricing_snapshot.hash,
      });
      if (paid) throw new BadRequestException(event === 'substitute_accepted' ? 'substitute_after_payment_requires_new_quote' : 'item_change_after_payment_requires_new_quote');
    }
    if (!mutate(alloc)) return undefined;
    const totals = allocationTotals(alloc);
    alloc.totals = { ...alloc.totals, ...totals };
    alloc.timeline.push({ ts: new Date(), event, by: user.id, meta: { ...meta, order_item_id: t.order_item_id, total: totals.total } });
    alloc.markModified('items');
    alloc.markModified('totals');
    await alloc.save();
    if (selected) {
      const snapshot = order.pricing_snapshot;
      const set: Record<string, unknown> = { totals };
      if (snapshot?.offer_id) {
        set.pricing_snapshot = {
          ...snapshot,
          totals,
          hash: crypto.createHash('sha256')
            .update(JSON.stringify({ offer_id: snapshot.offer_id, offer_version: snapshot.offer_version, totals }))
            .digest('hex'),
          captured_at: new Date(),
        };
      }
      await this.orders.updateOne({ id: order.id }, {
        $set: set,
        $push: { timeline: { ts: new Date(), event: `${event}_totals_updated`, by: user.id, meta: { allocation_id: alloc.id, order_item_id: t.order_item_id, total: totals.total } } },
      });
    }
    return totals;
  }

  /**
   * Patient: reject the offered substitute, or remove the line outright. Both
   * take the line out of the order (13.R2 Verify: "reject -> item removed")
   * and out of the pharmacy's allocation, and the totals are recomputed.
   */
  async rejectOrRemove(user: any, thread_id: string, action: 'rejected' | 'removed'): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const totals = await this.changeAllocationLine(user, t, action === 'rejected' ? 'substitute_rejected_item_removed' : 'item_removed_by_patient', (alloc) => {
      const before = alloc.items.length;
      alloc.items = alloc.items.filter(i => i.order_item_id !== t.order_item_id);
      return alloc.items.length !== before;
    });
    const order = await this.orders.findOne({ id: t.order_id });
    if (order && order.items.some((it: any) => it.id === t.order_item_id)) {
      order.items = order.items.filter((it: any) => it.id !== t.order_item_id);
      order.markModified('items');
      order.timeline.push({ ts: new Date(), event: 'item_removed_from_order', meta: { order_item_id: t.order_item_id, reason: action } });
      await order.save();
    }
    t.status = 'closed';
    t.resolution = action;
    await t.save();
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', text: action === 'rejected' ? `المريض رفض البديل وحُذف الصنف من الطلب.` : `تم حذف الصنف من الطلب.` });
    await this.bus.emit({ type: action === 'rejected' ? 'substitute.rejected' : 'substitute.item_removed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id } });
    return { ok: true, ...(totals ? { totals } : {}) };
  }

  /** Sweep closures (called by admin) — archive threads where order completed >12h ago. */
  async sweepAutoClose(): Promise<any> {
    const cutoff = new Date(Date.now() - 12 * 3600 * 1000);
    const completedOrders = await this.orders.find({ status: { $in: [PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED, PharmacyOrderState.CANCELLED] }, updatedAt: { $lt: cutoff } }, { id: 1 }).lean();
    const ids = completedOrders.map(o => o.id);
    const res = await this.threads.updateMany({ order_id: { $in: ids }, status: 'open' }, { $set: { status: 'archived', resolution: 'timeout' } });
    return { archived: res.modifiedCount, scanned: completedOrders.length };
  }
}
