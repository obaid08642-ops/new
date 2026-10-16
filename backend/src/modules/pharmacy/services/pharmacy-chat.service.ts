/**
 * Phase 2A-rework: Pharmacy Chat Service for substitute negotiation.
 * Content filter blocks phone numbers, URLs, external messenger refs.
 * Auto-close 12h after order delivered/completed.
 */
import { Injectable, ForbiddenException, NotFoundException, BadRequestException, ConflictException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyChatThread, PharmacyChatMessage, PharmacyOrder, PharmacyOrderState, PharmacyAllocation, AllocationItemAction } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyChatThreadRepository } from "./repositories/pharmacychatthread.repository";
import { PharmacyChatMessageRepository } from "./repositories/pharmacychatmessage.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyAllocationService, buildQuoteHash, recalcAllocationTotals } from './pharmacy-allocation.service';
import { assertSubstituteInsidePrescription } from './rx-rules';

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

const FINISHED: string[] = [PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED, PharmacyOrderState.CANCELLED];
const isPharmacy = (user: any) => user?.role === 'pharmacy' || user?.role === 'provider';

@Injectable()
export class PharmacyChatService {
  constructor(
    @Inject('PharmacyChatThreadRepository') private threads: PharmacyChatThreadRepository,
    @Inject('PharmacyChatMessageRepository') private messages: PharmacyChatMessageRepository,
    @Inject('PharmacyOrderRepository') private orders: PharmacyOrderRepository,
    @Inject('PharmacyAllocationRepository') private allocs: PharmacyAllocationRepository,
    private bus: EventBusService,
    private allocations: PharmacyAllocationService,
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

  /**
   * Issues 479/480: the pharmacy opens the negotiation of one line of an order from its "Order chat". Only a pharmacy that
   * is part of the order (it sent an offer on it or holds its allocation) may open it, only for a line of that order, and
   * only while the order is not finished. The thread belongs to that pharmacy and the order's patient.
   */
  async openForPharmacy(user: any, order_id: string, order_item_id: string): Promise<any> {
    if (!isPharmacy(user)) throw new ForbiddenException('pharmacy_only');
    const order: any = await this.orders.findOne({ id: order_id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    const part = (await this.allocs.findOne({ order_id, pharmacy_account_id: user.id }).lean())
      || (await this.orders.db.collection('pharmacy_offers').findOne({ order_id, pharmacy_account_id: user.id, status: { $in: ['submitted', 'selected'] } }, { projection: { _id: 0, id: 1 } }));
    if (!part) throw new ForbiddenException('not_part_of_order');
    if (!(Array.isArray(order.items) ? order.items : []).some((i: any) => i?.id === order_item_id)) throw new BadRequestException('order_item_not_found');
    if (FINISHED.includes(order.status)) throw new BadRequestException('order_closed');
    const t: any = await this.openOrGetThread(order_id, order_item_id, user.id);
    return typeof t?.toObject === 'function' ? t.toObject() : t;
  }

  async listThreads(user: any, order_id?: string): Promise<any> {
    const q: any = {};
    if (user.role === 'patient') q.patient_account_id = user.id;
    else if (isPharmacy(user)) q.pharmacy_account_id = user.id;
    else throw new ForbiddenException();
    if (order_id) q.order_id = order_id;
    const threads: any[] = await this.threads.find(q).sort({ updatedAt: -1 }).lean();
    return this.withSummaries(threads);
  }

  /**
   * #525: each conversation says who it is with (the pharmacy's public name) and what was said last (a short preview of
   * the newest visible message and who sent it), so the list is readable without opening every thread.
   */
  private async withSummaries(threads: any[]): Promise<any[]> {
    if (!threads.length) return threads;
    const pharmacyIds = [...new Set(threads.map((t) => t.pharmacy_account_id).filter(Boolean).map(String))];
    const names = new Map<string, { ar: string | null; en: string | null }>();
    const db: any = (this.threads as any).db;
    if (db && pharmacyIds.length) {
      const rows: any[] = await db.collection('provider_profiles')
        .find({ $or: [{ user_id: { $in: pharmacyIds } }, { account_id: { $in: pharmacyIds } }] } as any, { projection: { _id: 0, user_id: 1, account_id: 1, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1 } })
        .toArray().catch(() => []);
      for (const p of rows) {
        const name = { ar: p.display_name_ar || p.name_ar || null, en: p.display_name_en || p.name_en || null };
        for (const key of [p.user_id, p.account_id].filter(Boolean)) names.set(String(key), name);
      }
    }
    return Promise.all(threads.map(async (t) => {
      const last: any = await this.messages.findOne({ thread_id: t.id, blocked: { $ne: true } }, undefined, { sort: { createdAt: -1 } }).lean();
      const name = names.get(String(t.pharmacy_account_id));
      return {
        ...t,
        pharmacy_name_ar: name?.ar ?? null,
        pharmacy_name_en: name?.en ?? null,
        last_message: last
          ? { text: typeof last.text === 'string' ? last.text.slice(0, 120) : null, from: last.sender_role ?? null, has_image: !!last.image_uri, has_offer: !!last.substitute_offer, at: last.createdAt ?? null }
          : null,
      };
    }));
  }

  async listMessages(user: any, thread_id: string): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id }).lean();
    if (!t) throw new NotFoundException();
    // Only the thread's patient and pharmacy read it (before, any signed-in non-patient could read any thread).
    if (t.patient_account_id !== user.id && t.pharmacy_account_id !== user.id && user.role !== 'admin') throw new ForbiddenException();
    const msgs = await this.messages.find({ thread_id, blocked: { $ne: true } }).sort({ createdAt: 1 }).lean();
    return { thread: t, messages: msgs };
  }

  async postMessage(user: any, thread_id: string, body: { text?: string; image_uri?: string; substitute_offer?: { inventory_item_id: string; notes?: string } }): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const isPatient = t.patient_account_id === user.id;
    const isPharmacy = t.pharmacy_account_id === user.id;
    if (!isPatient && !isPharmacy) throw new ForbiddenException();
    if (!body.text?.trim() && !body.image_uri && !body.substitute_offer) throw new BadRequestException('empty_message');
    // Issues 479/480: only the pharmacy proposes a substitute, and only an item of its own inventory that stays inside the
    // prescription (issue 1440). The sku, name and price come from the inventory row, never from what is typed.
    const substitute = body.substitute_offer ? await this.substituteFromInventory(t, isPharmacy, body.substitute_offer) : undefined;
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
      text: body.text, image_uri: body.image_uri, substitute_offer: substitute,
    });
    t.last_message_at = new Date();
    await t.save();
    if (substitute) {
      await this.bus.emit({ type: 'substitute.proposed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'provider', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: m.id, offer: substitute } });
    }
    return m.toObject();
  }

  /** The substitute a pharmacy attaches: its own live inventory row, checked against the order line's prescription. */
  private async substituteFromInventory(t: any, isPharmacy: boolean, offer: { inventory_item_id: string; notes?: string }) {
    if (!isPharmacy) throw new ForbiddenException('substitute_from_pharmacy_only');
    const inv: any = await this.orders.db.collection('provider_capabilities_pharmacy').findOne({
      id: String(offer.inventory_item_id), provider_account_id: t.pharmacy_account_id, available: true, stock: { $gt: 0 },
      $or: [{ expiry_date: { $exists: false } }, { expiry_date: null }, { expiry_date: { $gt: new Date() } }],
    });
    if (!inv) throw new BadRequestException('inventory_item_not_available');
    const order: any = await this.orders.findOne({ id: t.order_id }).lean();
    const line = order?.items?.find((i: any) => i.id === t.order_item_id);
    if (!line) throw new BadRequestException('order_item_not_found');
    await assertSubstituteInsidePrescription(this.orders.db, line, inv);
    const price = Number(inv.price);
    return {
      inventory_item_id: String(inv.id),
      sku: inv.sku !== undefined && inv.sku !== null ? String(inv.sku) : undefined,
      name: inv.name_ar || inv.name_en || undefined,
      name_en: inv.name_en || undefined,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
      notes: offer.notes?.trim() || undefined,
    };
  }

  /** Patient: accept a substitute offered in a chat thread. Updates allocation item. */
  async acceptSubstitute(user: any, thread_id: string, message_id: string): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const msg = await this.messages.findOne({ id: message_id, thread_id }).lean();
    if (!msg || !msg.substitute_offer) throw new BadRequestException('no_substitute_offer');
    // Issue 1440: a prescription line's substitute is the pharmacy's own inventory item inside the prescription.
    const order: any = await this.orders.findOne({ id: t.order_id });
    const line = order?.items?.find((i: any) => i.id === t.order_item_id);
    if (line?.requires_prescription === true) {
      const subId = msg.substitute_offer.inventory_item_id;
      const subSku = msg.substitute_offer.sku;
      const subInv = subId || subSku
        ? await this.orders.db.collection('provider_capabilities_pharmacy').findOne({ provider_account_id: t.pharmacy_account_id, ...(subId ? { id: String(subId) } : { sku: String(subSku) }) })
        : null;
      await assertSubstituteInsidePrescription(this.orders.db, line, subInv);
    }
    // The allocation's own accept: availability, stock reservation, order totals, and no price change once paid.
    await this.allocations.acceptChatSubstitute(user, t.order_id, t.pharmacy_account_id, t.order_item_id, { sku: msg.substitute_offer.sku, notes: msg.substitute_offer.notes });
    t.status = 'closed';
    t.resolution = 'accepted';
    await t.save();
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', system_code: 'substitute_accepted', text: `البديل مقبول من المريض.` });
    await this.bus.emit({ type: 'substitute.accepted', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: msg.id } });
    return { ok: true };
  }

  async rejectOrRemove(user: any, thread_id: string, action: 'rejected' | 'removed'): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    // A paid order keeps its lines: the paid amount is bound to the quote, so removing one here would neither refund it
    // nor let the order be fulfilled. After payment the pharmacy cancels or refunds the line through its own flows.
    if (action === 'removed' && await this.orders.db.collection('pharmacy_payment_evidence').findOne({ order_id: t.order_id, status: 'confirmed' })) {
      throw new ConflictException('item_removal_after_payment');
    }
    t.status = 'closed';
    t.resolution = action;
    await t.save();
    // P13-R2: a decision in chat settles any pending allocation proposal for
    // the same line, so fulfilment never waits on (or delivers past) it.
    const alloc = await this.allocs.findOne({ order_id: t.order_id, pharmacy_account_id: t.pharmacy_account_id });
    const aItem = alloc?.items?.find((i: any) => i.order_item_id === t.order_item_id);
    if (alloc && aItem && aItem.substitute_status === 'proposed') {
      aItem.substitute_status = 'rejected';
      if (action === 'removed') {
        aItem.action = AllocationItemAction.UNAVAILABLE;
        aItem.qty_offered = 0;
        aItem.inventory_id = undefined;
      }
      aItem.updated_at = new Date();
      recalcAllocationTotals(alloc);
      alloc.markModified('items');
      await alloc.save();
      await this.syncOrderTotals(t.order_id, alloc, new Date(), action === 'removed' ? 'item_removed_from_order' : 'substitute_rejected');
    }
    if (action === 'removed') {
      // Remove item from order
      const order = await this.orders.findOne({ id: t.order_id });
      if (order) {
        order.items = order.items.filter((it: any) => it.id !== t.order_item_id);
        order.markModified('items');
        order.timeline.push({ ts: new Date(), event: 'item_removed_from_order', meta: { order_item_id: t.order_item_id } });
        await order.save();
      }
    }
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', system_code: action === 'rejected' ? 'substitute_rejected' : 'item_removed', text: action === 'rejected' ? `المريض رفض البديل.` : `تم حذف الصنف من الطلب.` });
    await this.bus.emit({ type: action === 'rejected' ? 'substitute.rejected' : 'substitute.item_removed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id } });
    return { ok: true };
  }

  /** P13-R2: keep the order's server-authoritative totals with the decided allocation. */
  private async syncOrderTotals(orderId: string, alloc: any, now: Date, event: string) {
    // Only bound allocations own a pricing snapshot (the fulfilment gate reads it).
    if (!alloc?.offer_id) return;
    const totals = { subtotal: alloc.totals.subtotal, delivery_fee: alloc.totals.delivery_fee || 0, total: alloc.totals.total, currency: alloc.totals.currency || 'SAR' };
    await this.orders.updateOne({ id: orderId }, {
      $set: {
        totals,
        pricing_snapshot: { offer_id: alloc.offer_id, offer_version: alloc.offer_version, totals, hash: buildQuoteHash(alloc.offer_id, alloc.offer_version, totals), captured_at: now },
      },
      $push: { timeline: { ts: now, event, meta: { allocation_id: alloc.id, totals } } },
    });
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
