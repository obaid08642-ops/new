/**
 * Phase 2A-rework: Pharmacy Chat Service for substitute negotiation.
 * Content filter blocks phone numbers, URLs, external messenger refs.
 * Auto-close 12h after order delivered/completed.
 */
import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { PharmacyChatThread, PharmacyChatMessage, PharmacyOrder, PharmacyOrderState, PharmacyAllocation, AllocationItemAction } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';
import { PharmacyChatThreadRepository } from "./repositories/pharmacychatthread.repository";
import { PharmacyChatMessageRepository } from "./repositories/pharmacychatmessage.repository";
import { PharmacyOrderRepository } from "./repositories/pharmacyorder.repository";
import { PharmacyAllocationRepository } from "./repositories/pharmacyallocation.repository";
import { PharmacyOrderState as GovernedPharmacyOrderState } from '@nabd/shared-contracts';

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
      text: body.text, image_uri: body.image_uri, substitute_offer: body.substitute_offer,
    });
    t.last_message_at = new Date();
    await t.save();
    if (body.substitute_offer) {
      this.bus.emit({ type: 'substitute.proposed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: isPatient ? 'patient' : 'provider', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: m.id, offer: body.substitute_offer } }).catch(() => null);
    }
    return m.toObject();
  }

  /** Patient: accept a substitute offered in a chat thread. Updates allocation item. */
  async acceptSubstitute(user: any, thread_id: string, message_id: string): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const msg = await this.messages.findOne({ id: message_id, thread_id }).lean();
    if (!msg || !msg.substitute_offer) throw new BadRequestException('no_substitute_offer');
    const order: any = await this.orders.findOne({ id: t.order_id });
    if (!order || order.governed_state !== GovernedPharmacyOrderState.NEGOTIATION_REQUIRED || order.selected_pharmacy_account_id !== t.pharmacy_account_id) throw new BadRequestException('negotiation_not_active_for_thread');
    t.status = 'closed';
    t.resolution = 'accepted_pending_requote';
    await t.save();
    order.timeline = [...(order.timeline ?? []), { ts: new Date(), event: 'patient_accepted_substitute_pending_requote', by: user.id, meta: { thread_id, message_id, order_item_id: t.order_item_id } }];
    await order.save();
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', text: `البديل مقبول من المريض.` });
    this.bus.emit({ type: 'substitute.accepted', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id, message_id: msg.id } }).catch(() => null);
    return { ok: true, final_quote_required: true };
  }

  async rejectOrRemove(user: any, thread_id: string, action: 'rejected' | 'removed'): Promise<any> {
    const t = await this.threads.findOne({ id: thread_id });
    if (!t) throw new NotFoundException();
    if (t.patient_account_id !== user.id) throw new ForbiddenException();
    if (t.status !== 'open') throw new BadRequestException('thread_closed');
    const order: any = await this.orders.findOne({ id: t.order_id });
    if (!order || order.governed_state !== GovernedPharmacyOrderState.NEGOTIATION_REQUIRED || order.selected_pharmacy_account_id !== t.pharmacy_account_id) throw new BadRequestException('negotiation_not_active_for_thread');
    t.status = 'closed';
    t.resolution = `${action}_pending_requote`;
    await t.save();
    order.timeline = [...(order.timeline ?? []), { ts: new Date(), event: action === 'removed' ? 'patient_requested_item_removal_pending_requote' : 'patient_rejected_substitute_pending_requote', by: user.id, meta: { thread_id, order_item_id: t.order_item_id } }];
    await order.save();
    await this.messages.create({ id: uuidv4(), thread_id, sender_account_id: 'system', sender_role: 'system', text: action === 'rejected' ? `المريض رفض البديل.` : `تم حذف الصنف من الطلب.` });
    this.bus.emit({ type: action === 'rejected' ? 'substitute.rejected' : 'substitute.item_removed', entity_type: 'chat', entity_id: t.id, actor_account_id: user.id, actor_role: 'patient', patient_account_id: t.patient_account_id, pharmacy_account_id: t.pharmacy_account_id, meta: { order_id: t.order_id, order_item_id: t.order_item_id } }).catch(() => null);
    return { ok: true, final_quote_required: true };
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
