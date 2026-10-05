import { MediaService } from '../media/media.service';
import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Inject, Optional } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection, Types } from 'mongoose';
import { ReturnRequest } from '../../schemas/returns.schema';

import { ReturnRequestRepository } from "./repositories/returnrequest.repository";
import { RefundExecutor } from '../finance-engine/finance-engine.module';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

/**
 * E1 S5 — Returns engine with Saudi pharmacy rules.
 *
 * Eligibility (defaults overridable via finance_config { key: 'return_policy' }):
 *  - window: 7 days from delivery (config: window_days)
 *  - opened or used products are NOT returnable (health & safety)
 *  - cold-chain / refrigerated items are NOT returnable once dispatched
 *  - prescription-dispensed items marked non-returnable by the pharmacy are blocked
 *  - every request requires admin review; approval executes a REAL refund
 *    through the original payment method (gateway → card, else wallet).
 */
const NON_RETURNABLE_CATEGORIES = ['cold_chain', 'refrigerated', 'controlled', 'prescription_only_nonreturnable'];

@Injectable()
export class ReturnsService {
  constructor(
    @Inject('ReturnRequestRepository') private readonly returnModel: ReturnRequestRepository,
    private readonly refundExec: RefundExecutor,
    @InjectConnection() private readonly conn: Connection,
    @Optional() private readonly media?: MediaService,
  ) {}

  /**
   * R7-2: photo evidence is stored as `media:<assetId>` (owned by the patient), never as a
   * presigned URL, which expires after 15 minutes. Readers get a fresh signed URL.
   */
  private async evidenceRefs(userId: string, docs: unknown): Promise<string[]> {
    if (!Array.isArray(docs) || !docs.length) return [];
    if (docs.length > 10) throw new BadRequestException('too_many_attachments');
    const ids = docs.map((d) => String(d || ''));
    if (ids.some((d) => !/^media:[A-Za-z0-9_-]{1,128}$/.test(d))) throw new BadRequestException('attachment_must_be_uploaded_media');
    const assetIds = ids.map((d) => d.slice('media:'.length));
    const owned = await (this.conn as any).collection('media_assets')
      .countDocuments({ id: { $in: assetIds }, owner_id: { $eq: String(userId) } });
    if (owned !== new Set(assetIds).size) throw new BadRequestException('attachment_not_owned');
    return ids;
  }

  private async withEvidenceUrls<T extends Record<string, any>>(row: T | null): Promise<T | null> {
    if (!row || !Array.isArray((row as any).attached_docs) || !(row as any).attached_docs.length) return row;
    const refs: string[] = (row as any).attached_docs.map(String);
    const assetIds = refs.filter((r) => r.startsWith('media:')).map((r) => r.slice('media:'.length));
    const assets: any[] = assetIds.length
      ? await (this.conn as any).collection('media_assets').find({ id: { $in: assetIds } }, { projection: { _id: 0, id: 1, key: 1 } }).toArray()
      : [];
    const keyOf = new Map(assets.map((a: any) => [String(a.id), String(a.key)]));
    const urls = await Promise.all(refs.map(async (r) => {
      if (!r.startsWith('media:')) return r;
      const key = keyOf.get(r.slice('media:'.length));
      if (!key || !this.media) return null;
      return this.media.generatePresignedDownloadUrl(key, 15 * 60).catch(() => null);
    }));
    return { ...row, attached_docs: urls.filter(Boolean) } as T;
  }

  private async withEvidenceUrlsAll<T extends Record<string, any>>(rows: T[]): Promise<T[]> {
    return Promise.all(rows.map(async (r) => (await this.withEvidenceUrls(r)) as T));
  }

  private async policy() {
    const cfg: any = await this.conn.collection('finance_config').findOne({ key: 'return_policy' } as any);
    return {
      window_days: Number(cfg?.window_days ?? 7),
      non_returnable_categories: Array.isArray(cfg?.non_returnable_categories) ? cfg.non_returnable_categories : NON_RETURNABLE_CATEGORIES,
    };
  }

  /**
   * Check whether an order's items are returnable right now — used by the
   * patient app before filing the request (and enforced again server-side
   * at creation, because clients can lie).
   */
  async eligibility(userId: string, orderId: string) {
    const legacy: any = await this.conn.collection('orders').findOne({ id: orderId } as any);
    if (legacy) return this.legacyEligibility(userId, legacy);
    // Governed broadcast orders (P0-06): same Saudi ruleset, sourced from the
    // selected offer snapshot + medicine master flags.
    const order: any = await this.conn.collection('pharmacy_orders').findOne({ id: orderId } as any);
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== userId) throw new ForbiddenException('not_your_order');
    return this.pharmacyEligibility(order);
  }

  private async legacyEligibility(userId: string, order: any) {
    if (order.patient_id !== userId) throw new ForbiddenException('not_your_order');
    const pol = await this.policy();

    const delivered = ['DELIVERED', 'COMPLETED', 'PARTIALLY_FULFILLED'].includes(String(order.state || '').toUpperCase());
    const deliveredAt = order.delivered_at || order.updatedAt || order.createdAt;
    const ageDays = (Date.now() - new Date(deliveredAt).getTime()) / (24 * 3600 * 1000);
    const withinWindow = delivered && ageDays <= pol.window_days;

    const items = (order.items || []).map((it: any) => ({
      medicine_id: it.medicine_id,
      name_ar: it.name_ar, name_en: it.name_en,
      qty: it.qty, price: it.price,
      returnable: !pol.non_returnable_categories.includes(it.category) && it.non_returnable !== true,
      reason: pol.non_returnable_categories.includes(it.category) ? 'category_non_returnable' : (it.non_returnable === true ? 'flagged_non_returnable' : null),
    }));

    return {
      order_id: order.id,
      delivered,
      within_window: withinWindow,
      window_days: pol.window_days,
      eligible: withinWindow && items.some((i: any) => i.returnable),
      items,
    };
  }

  /** Pharmacy broadcast orders: items come from the patient-selected offer
   *  snapshot; safety flags come from the medicine master. Unknown (custom)
   *  items are excluded from self-service with an explicit reason. */
  private async pharmacyEligibility(order: any) {
    const pol = await this.policy();
    const delivered = ['DELIVERED', 'COMPLETED'].includes(String(order.status || '').toUpperCase());
    const deliveredAt = order.delivered_at || order.updatedAt || order.createdAt;
    const ageDays = deliveredAt ? (Date.now() - new Date(deliveredAt).getTime()) / (24 * 3600 * 1000) : Infinity;
    const withinWindow = delivered && ageDays <= pol.window_days;

    let offerItems: any[] = [];
    if (order.selected_offer_id) {
      const offer: any = await this.conn.collection('pharmacy_offers').findOne({
        id: order.selected_offer_id,
        order_id: order.id,
        ...(order.selected_offer_version ? { version: order.selected_offer_version } : {}),
      } as any);
      if (offer && Array.isArray(offer.items)) offerItems = offer.items;
    }
    const skus = [...new Set(offerItems.map((o: any) => String(o.sku || '')).filter(Boolean))];
    const master: any = {};
    if (skus.length) {
      const docs: any[] = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
        .find({ $or: [{ sku: { $in: skus } }, { id: { $in: skus } }] } as any).toArray().catch(() => []);
      for (const d of docs) {
        if (d.sku) master[String(d.sku)] = d;
        if (d.id) master[String(d.id)] = d;
      }
    }
    const items = offerItems.map((o: any) => {
      const m: any = master[String(o.sku || '')] || master[String(o.order_item_id || '')] || null;
      if (!m) {
        return { medicine_id: String(o.sku || o.order_item_id), name_ar: o.name_ar, name_en: o.name_en,
          qty: o.qty_offered, price: o.unit_price, returnable: false, reason: 'unmatched_catalog_item' };
      }
      const cats: string[] = [...(Array.isArray(m.categories) ? m.categories : []), m.category].filter(Boolean);
      const blocked = !!m.cold_chain || !!m.controlled || cats.some((c: string) => pol.non_returnable_categories.includes(c));
      return { medicine_id: String(o.sku || o.order_item_id), name_ar: o.name_ar || m.name_ar, name_en: o.name_en || m.name_en,
        qty: o.qty_offered, price: o.unit_price, returnable: !blocked,
        reason: blocked ? 'category_non_returnable' : null };
    });

    return {
      order_id: order.id,
      delivered,
      within_window: withinWindow,
      window_days: pol.window_days,
      eligible: withinWindow && items.some((i: any) => i.returnable),
      items,
    };
  }

  async createRequest(userId: string, data: any) {
    if (!data.serviceType) throw new BadRequestException('serviceType is required');
    if (!data.reason) throw new BadRequestException('reason is required');
    if (!data.orderId) throw new BadRequestException('orderId is required');

    // Pharmacy orders: enforce the Saudi ruleset + compute the REAL amount
    let amount = 0;
    let reviewedItems: any[] = [];
    if (String(data.serviceType).toLowerCase().includes('pharm')) {
      const el = await this.eligibility(userId, data.orderId);
      if (!el.eligible) {
        throw new BadRequestException(el.within_window ? 'no_returnable_items' : `return_window_expired (${el.window_days} days)`);
      }
      if (data.is_opened === true || data.is_used === true) {
        throw new BadRequestException('opened_or_used_products_are_not_returnable');
      }
      const requestedIds: string[] = Array.isArray(data.items) && data.items.length
        ? data.items.map((i: any) => i.medicine_id || i).filter(Boolean)
        : el.items.filter((i: any) => i.returnable).map((i: any) => i.medicine_id);
      reviewedItems = el.items.filter((i: any) => requestedIds.includes(i.medicine_id));
      if (!reviewedItems.length) throw new BadRequestException('no_valid_items_selected');
      const nonReturnable = reviewedItems.filter((i: any) => !i.returnable);
      if (nonReturnable.length) throw new BadRequestException(`non_returnable_items: ${nonReturnable.map((i: any) => i.medicine_id).join(', ')}`);
      amount = Math.round(reviewedItems.reduce((s: number, i: any) => s + (i.price || 0) * (i.qty || 1), 0) * 100) / 100;
      if (!(amount > 0)) throw new BadRequestException('computed_return_amount_is_zero');
    } else {
      // LJ-05: service returns resolve ownership + paid amount from the real
      // booking collections (completed + paid only), never the client.
      const sources: Record<string, Array<{ collection: string; kind: string; terminal: string[] }>> = {
        consultation: [{ collection: 'appointments', kind: 'consultation', terminal: ['COMPLETED'] }],
        diagnostics: [
          { collection: 'labbookings', kind: 'lab', terminal: ['REPORTED', 'COMPLETED'] },
          { collection: 'radiologybookings', kind: 'radiology', terminal: ['REPORT_READY', 'REPORT_PUBLISHED', 'COMPLETED'] },
        ],
        nursing: [{ collection: 'homecarebookings', kind: 'nursing', terminal: ['COMPLETED'] }],
        insurance: [
          { collection: 'appointments', kind: 'consultation', terminal: ['COMPLETED'] },
          { collection: 'labbookings', kind: 'lab', terminal: ['REPORTED', 'COMPLETED'] },
          { collection: 'radiologybookings', kind: 'radiology', terminal: ['REPORT_READY', 'REPORT_PUBLISHED', 'COMPLETED'] },
          { collection: 'homecarebookings', kind: 'nursing', terminal: ['COMPLETED'] },
        ],
      };
      const candidates = sources[String(data.serviceType).toLowerCase()];
      if (!candidates) throw new BadRequestException('unsupported_return_service');

      let booking: any;
      let bookingKind: string | undefined;
      for (const source of candidates) {
        const found: any = await this.conn.collection(source.collection).findOne({ id: data.orderId } as any);
        if (!found) continue;
        if (String(found.patient_id || found.patient_account_id) !== String(userId)) throw new ForbiddenException('not_your_booking');
        const state = String(found.status || found.state || '').toUpperCase();
        if (!source.terminal.includes(state)) throw new BadRequestException('booking_not_completed');
        booking = found;
        bookingKind = source.kind;
        break;
      }
      if (!booking || !bookingKind) throw new NotFoundException('completed_booking_not_found');

      const transactions: any[] = await this.conn.collection('transactions').find(
        { booking_kind: bookingKind, booking_id: data.orderId, status: 'paid' },
        { projection: { amount: 1, _id: 0 } },
      ).toArray();
      const paidTotal = transactions.reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
      const paymentStatus = String(booking.payment_status || '').toLowerCase();
      amount = ['paid', 'covered_by_insurance'].includes(paymentStatus)
        ? Number(booking.total_price ?? booking.total ?? booking.price ?? 0) || paidTotal
        : Number(booking.collection_proof?.amount_collected || 0) || paidTotal;
      if (!(amount > 0)) throw new BadRequestException('booking_has_no_collected_payment');
      reviewedItems = [];
      data.bookingKind = bookingKind;
    }

    const returnRequest = await this.returnModel.create({
      patient_id: userId,
      order_id: data.orderId,
      booking_kind: data.bookingKind || 'pharmacy',
      service_type: data.serviceType,
      reason: data.reason,
      details: data.details,
      items: reviewedItems,
      is_opened: data.is_opened === true,
      is_used: data.is_used === true,
      refund_method: data.refundMethod || 'original',
      amount,
      attached_docs: await this.evidenceRefs(userId, data.attachedDocs),
      status: 'processing',
    } as any);

    return returnRequest.toObject();
  }

  async myReturns(userId: string) {
    return this.withEvidenceUrlsAll(await this.returnModel.find({ patient_id: userId }).sort({ createdAt: -1 }).lean() as any[]);
  }

  /** Returns filed against this provider's orders: legacy `orders` plus
   *  governed broadcast orders (via the provider's allocations) — P0-06. */
  async providerReturns(providerId: string): Promise<any[]> {
    const [legacy, allocs] = await Promise.all([
      (this.returnModel.db as any).collection('orders')
        .find({ pharmacy_id: providerId }, { projection: { id: 1 } }).toArray(),
      (this.returnModel.db as any).collection('pharmacy_allocations')
        .find({ pharmacy_account_id: providerId }, { projection: { order_id: 1 } }).toArray(),
    ]);
    const ids = [...legacy.map((o: any) => o.id), ...allocs.map((a: any) => a.order_id)].filter(Boolean);
    if (!ids.length) return [];
    return this.withEvidenceUrlsAll(await this.returnModel.find({ order_id: { $in: ids } } as any).sort({ createdAt: -1 }).lean() as any[]);
  }

  async getById(id: string, userId: string, userRole: string) {
    const request = await this.returnModel.findOne({ id }).lean();
    if (!request) throw new NotFoundException('Return request not found');
    if (request.patient_id !== userId && userRole !== 'admin') {
      throw new ForbiddenException('Access denied');
    }
    return this.withEvidenceUrls(request as any);
  }

  /** LJ-05: server-eligible completed bookings for the return picker. */
  async eligibleBookings(userId: string, serviceType: string) {
    const type = String(serviceType || '').toLowerCase();
    if (type.includes('pharm')) {
      const [legacy, governed] = await Promise.all([
        this.conn.collection('orders').find({ patient_id: userId, state: { $in: ['DELIVERED', 'COMPLETED', 'PARTIALLY_FULFILLED'] } } as any).sort({ createdAt: -1 }).limit(50).toArray(),
        this.conn.collection('pharmacy_orders').find({ patient_account_id: userId, status: { $in: ['DELIVERED', 'COMPLETED'] } } as any).sort({ createdAt: -1 }).limit(50).toArray(),
      ]);
      const seen = new Set<string>();
      const eligible: any[] = [];
      for (const order of [...legacy, ...governed]) {
        const id = String(order.id || '');
        if (!id || seen.has(id)) continue;
        seen.add(id);
        const result = await this.eligibility(userId, id).catch(() => null);
        if (!result?.eligible) continue;
        const amount = Math.round(result.items.filter((item: any) => item.returnable).reduce((sum: number, item: any) => sum + Number(item.price || 0) * Number(item.qty || 1), 0) * 100) / 100;
        if (amount > 0) eligible.push({ id, booking_kind: 'pharmacy', service_type: 'pharmacy', amount, items: result.items, createdAt: order.createdAt });
      }
      return eligible;
    }

    const sources: Record<string, Array<{ collection: string; kind: string; terminal: string[] }>> = {
      consultation: [{ collection: 'appointments', kind: 'consultation', terminal: ['COMPLETED'] }],
      diagnostics: [
        { collection: 'labbookings', kind: 'lab', terminal: ['REPORTED', 'COMPLETED'] },
        { collection: 'radiologybookings', kind: 'radiology', terminal: ['REPORT_READY', 'REPORT_PUBLISHED', 'COMPLETED'] },
      ],
      nursing: [{ collection: 'homecarebookings', kind: 'nursing', terminal: ['COMPLETED'] }],
      insurance: [
        { collection: 'appointments', kind: 'consultation', terminal: ['COMPLETED'] },
        { collection: 'labbookings', kind: 'lab', terminal: ['REPORTED', 'COMPLETED'] },
        { collection: 'radiologybookings', kind: 'radiology', terminal: ['REPORT_READY', 'REPORT_PUBLISHED', 'COMPLETED'] },
        { collection: 'homecarebookings', kind: 'nursing', terminal: ['COMPLETED'] },
      ],
    };
    const eligible: any[] = [];
    const ownerIds: any[] = [userId];
    if (Types.ObjectId.isValid(userId)) {
      const { Types: T } = require('mongoose');
      ownerIds.push(new T.ObjectId(userId));
    }
    for (const source of sources[type] || []) {
      const bookings: any[] = await this.conn.collection(source.collection)
        .find({ patient_id: { $in: ownerIds } }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(50).toArray();
      for (const booking of bookings) {
        const state = String(booking.status || booking.state || '').toUpperCase();
        if (!source.terminal.includes(state)) continue;
        const transactions: any[] = await this.conn.collection('transactions').find(
          { booking_kind: source.kind, booking_id: String(booking.id), status: 'paid' },
          { projection: { amount: 1, _id: 0 } },
        ).toArray();
        const paidTotal = transactions.reduce((sum: number, txn: any) => sum + Number(txn.amount || 0), 0);
        const paymentStatus = String(booking.payment_status || '').toLowerCase();
        const amount = ['paid', 'covered_by_insurance'].includes(paymentStatus)
          ? Number(booking.total_price ?? booking.total ?? booking.price ?? 0) || paidTotal
          : Number(booking.collection_proof?.amount_collected || 0) || paidTotal;
        if (amount > 0) eligible.push({ id: String(booking.id), booking_kind: source.kind, service_type: type, amount, createdAt: booking.createdAt });
      }
    }
    return eligible.sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }

  async adminList(status?: string) {
    const allowed = ['processing', 'approved', 'completed', 'rejected'];
    if (status && !allowed.includes(status)) throw new BadRequestException('invalid_return_status');
    const filter = status ? { status } : {};
    return this.withEvidenceUrlsAll(await this.returnModel.find(filter).sort({ createdAt: -1 }).lean() as any[]);
  }

  /**
   * Admin decision. Approval executes a REAL refund via the original payment
   * method: gateway refund to the card, or a cash ledger record (no wallet).
   * Ledger entries + patient notification are written by the RefundExecutor.
   */
  async adminDecide(id: string, decision: 'approved' | 'rejected', note: string, adminUser: any) {
    const request = await this.returnModel.findOne({ id });
    if (!request) throw new NotFoundException('Return request not found');
    if (request.status !== 'processing') throw new BadRequestException('Request already processed');

    request.admin_note = note;
    request.resolved_by = adminUser.id;
    request.resolved_at = new Date();

    if (decision === 'rejected') {
      request.status = 'rejected';
      await request.save();
      return request.toObject();
    }

    request.status = 'approved';
    const exec = await this.refundExec.execute({
      refund_id: `return_${request.id}`,
      booking_kind: request.booking_kind || 'pharmacy',
      booking_id: request.order_id,
      patient_id: request.patient_id,
      amount: Number(request.amount),
      reason: `return approved: ${request.reason}`,
      actor_id: adminUser.id,
    });
    (request as any).execution = exec;
    request.status = 'completed';

    await request.save();
    return request.toObject();
  }
}
