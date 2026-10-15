import { Injectable, ForbiddenException, NotFoundException, BadRequestException, Inject } from '@nestjs/common';
import { Connection, Model } from 'mongoose';
import { InjectConnection } from '@nestjs/mongoose';
import { enforceRxRules } from './rx-rules';
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

/** A-4: governed states in which a card payment may be retried (no COD, owner decision 25). */
const PAYMENT_RETRY_STATES = ['PAYMENT_PENDING', 'FINAL_QUOTE_ACCEPTED'];

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
    @InjectConnection() private readonly conn: Connection,
  ) {}

  /**
   * Needs-review #494: a prescription id or attachment on an order must be the patient's own
   * (their prescription, or a file they uploaded); a foreign id is answered as not found.
   */
  private async assertOwnPrescriptionRefs(user: any, body: any) {
    const rxId = typeof body?.prescription_id === 'string' ? body.prescription_id : null;
    const attachments: string[] = Array.isArray(body?.prescription_attachments)
      ? body.prescription_attachments.filter((a: unknown): a is string => typeof a === 'string') : [];
    if (!rxId && !attachments.length) return;
    const ownRx = await this.conn.collection('prescriptions')
      .find({ id: { $in: [...new Set([rxId, ...attachments].filter(Boolean))] }, patient_id: { $eq: user.id } }, { projection: { _id: 0, id: 1 } }).toArray();
    const rxIds = new Set(ownRx.map((r: any) => r.id));
    if (rxId && !rxIds.has(rxId)) throw new NotFoundException('prescription_not_found');
    const files = attachments.filter((a) => !rxIds.has(a));
    if (!files.length) return;
    const owned = await this.conn.collection('storage_objects')
      .countDocuments({ id: { $in: files }, owner_account_id: { $eq: user.id }, deleted: { $ne: true } });
    if (owned !== new Set(files).size) throw new NotFoundException('prescription_attachment_not_found');
  }

  /**
   * A-0 (Q-11 done right): the patient's attachment ids become `{ type, uri }` rows that the pharmacy
   * screens and the Rx rules read. A file id must be the patient's own storage object; its type comes
   * from the stored mime and the uri is the access-checked `/api/v1/storage/:id` (no base64, no raw
   * bucket URL). An id of the patient's own prescription is not a file: it becomes the order's
   * `prescription_id` when none was sent. Anything else (client-made objects, foreign ids) is dropped;
   * assertOwnPrescriptionRefs already answered unknown ids with 404.
   */
  private async resolvePrescriptionAttachments(user: any, raw: unknown): Promise<{ files: Array<{ type: 'image' | 'pdf' | 'voice' | 'text'; uri: string }>; prescriptionId?: string }> {
    const ids = [...new Set((Array.isArray(raw) ? raw : [])
      .filter((a: unknown): a is string => typeof a === 'string' && a.trim() !== '')
      .map((a) => a.trim()))];
    if (!ids.length) return { files: [] };
    const ownRx = await this.conn.collection('prescriptions')
      .find({ id: { $in: ids }, patient_id: { $eq: user.id } }, { projection: { _id: 0, id: 1 } }).toArray();
    const rxIds = new Set(ownRx.map((r: any) => r.id));
    const fileIds = ids.filter((id) => !rxIds.has(id));
    const stored = fileIds.length
      ? await this.conn.collection('storage_objects')
        .find({ id: { $in: fileIds }, owner_account_id: { $eq: user.id }, deleted: { $ne: true } }, { projection: { _id: 0, id: 1, mime: 1 } }).toArray()
      : [];
    const mimeOf = new Map(stored.map((o: any) => [o.id, String(o.mime || '').toLowerCase()]));
    const typeOf = (mime: string): 'image' | 'pdf' | 'voice' | 'text' =>
      mime.startsWith('image/') ? 'image' : mime === 'application/pdf' ? 'pdf' : mime.startsWith('audio/') ? 'voice' : 'text';
    const files = fileIds.filter((id) => mimeOf.has(id)).map((id) => ({ type: typeOf(mimeOf.get(id)!), uri: `/api/v1/storage/${encodeURIComponent(id)}` }));
    return { files, prescriptionId: ownRx[0]?.id };
  }

  async create(user: any, body: any) {
    assertPatient(user);
    const sanitize = (str: any) => String(str || '').replace(/[<>]/g, '').trim();
    const items = (body.items || []).map((it: any) => ({
      id: uuidv4(),
      raw_name: sanitize(it.raw_name || it.name || it.name_ar || 'unknown'),
      name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
      medicine_id: typeof it.medicine_id === 'string' ? it.medicine_id : undefined,
      dosage: it.dosage, form: it.form, frequency: it.frequency, duration: it.duration,
      qty: Math.max(1, Number(it.qty) || 1),
      match_status: OrderItemMatchStatus.MANUAL,
      matched_sku: it.sku || it.matched_sku, unit_price: it.unit_price,
      intake_source: it.intake_source || 'manual',
      notes: it.notes,
    }));
    // Manual free-text request (web manual form): a named item the pharmacy
    // matches during broadcast, same as a typed unknown item.
    const manual = body.manual_request && typeof body.manual_request === 'object' ? body.manual_request : null;
    // Journeys 74 (decision 12): the quantity and a photo of the box. The photo must be the patient's own uploaded image;
    // the pharmacies asked about this order may open it (StorageService.orderPharmacyMayRead).
    const manualQty = Number.isInteger(manual?.qty) && manual.qty >= 1 && manual.qty <= 99 ? manual.qty : 1;
    let manualPhotoUri: string | undefined;
    if (manual && typeof manual.photo_id === 'string' && manual.photo_id.trim()) {
      const photo: any = await this.conn.collection('storage_objects').findOne(
        { id: { $eq: manual.photo_id.trim() }, owner_account_id: { $eq: user.id }, deleted: { $ne: true } },
        { projection: { _id: 0, id: 1, mime: 1 } },
      );
      if (!photo || !String(photo.mime || '').toLowerCase().startsWith('image/')) throw new BadRequestException('manual_photo_invalid');
      manualPhotoUri = `/api/v1/storage/${encodeURIComponent(photo.id)}`;
    }
    if (!items.length && manual && String(manual.name || '').trim()) {
      items.push({
        id: uuidv4(),
        raw_name: sanitize(manual.name),
        qty: manualQty,
        match_status: OrderItemMatchStatus.MANUAL,
        intake_source: 'manual',
        notes: typeof manual.details === 'string' ? sanitize(manual.details).slice(0, 500) : undefined,
        ...(manualPhotoUri ? { photo_uri: manualPhotoUri } : {}),
      });
    }
    if (!items.length && !body.prescription_id) throw new BadRequestException('items_required');
    await this.assertOwnPrescriptionRefs(user, body);
    const attachments = await this.resolvePrescriptionAttachments(user, body.prescription_attachments);
    const addr = body.delivery_address || {};
    const geo = addr.geo || (addr.lat && addr.lng ? { lat: Number(addr.lat), lng: Number(addr.lng) } : null);
    const normalizedAddress = { ...addr, ...(geo ? { geo } : {}) };
    const order = await this.orders.create({
      id: uuidv4(),
      patient_account_id: user.id,
      status: PharmacyOrderState.DRAFT,
      items,
      delivery_address: normalizedAddress,
      patient_notes: body.patient_notes,
      prescription_id: typeof body.prescription_id === 'string' ? body.prescription_id : attachments.prescriptionId,
      manual_request: manual ? { name: sanitize(manual.name).slice(0, 200), details: typeof manual.details === 'string' ? sanitize(manual.details).slice(0, 500) : null, qty: manualQty, ...(manualPhotoUri ? { photo_uri: manualPhotoUri } : {}) } : undefined,
      payment_method: typeof body.payment_method === 'string' ? body.payment_method : 'cash',
      // F73: draft fulfillment + payment mode (validated by DTO enums).
      fulfillment: body.fulfillment === 'pickup' ? 'pickup' : 'delivery',
      payment_mode: body.payment_mode === 'insurance' ? 'insurance' : 'cash',
      insurance_policy_id: typeof body.insurance_policy_id === 'string' ? body.insurance_policy_id : undefined,
      delivery_address_id: typeof body.delivery_address_id === 'string' ? body.delivery_address_id : undefined,
      prescription_attachments: attachments.files,
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
    const orders = await this.orders.find(q, { _id: 0, __v: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    if (!orders.length) return [];

    // Fetch all allocations in one query (fix N+1)
    const orderIds = orders.map((o: any) => o.id);
    const allocs = await this.allocs.find({ order_id: { $in: orderIds } }, { _id: 0, __v: 0 }).lean();
    const allocsByOrder = new Map<string, any[]>();
    for (const a of allocs) {
      const list = allocsByOrder.get(a.order_id) || [];
      list.push(a);
      allocsByOrder.set(a.order_id, list);
    }

    // Fetch all pharmacy names in one query
    const pharmacyIds = [...new Set(allocs.map((a: any) => a.pharmacy_account_id).filter(Boolean))];
    const pharmacyNamesMap = await this.pharmacyNames(pharmacyIds);

    // Enrich each order with governed_state, requires_prescription, courier, unit_price
    const catalogueFlags = await this.enrichItemsWithCatalogueFlags(
      orders.flatMap((o: any) => o.items || [])
    );

    // Build offer items map for unit_price from pricing_snapshot
    const offerItemsMap = new Map<string, Map<string, number>>();
    for (const o of orders) {
      const map = new Map<string, number>();
      if (o.pricing_snapshot?.totals && Array.isArray(o.pricing_snapshot.items)) {
        for (const oi of o.pricing_snapshot.items) {
          if (oi.order_item_id && oi.unit_price !== undefined) map.set(oi.order_item_id, oi.unit_price);
        }
      }
      offerItemsMap.set(o.id, map);
    }

    return orders.map((order: any) => {
      const orderAllocs = allocsByOrder.get(order.id) || [];
      const effectiveStatus = this.computeEffectiveStatus(order, orderAllocs);
      const view = this.governedView(order); // Use basic governedView, detail() will add async checks

      // Enrich items with catalogue flags and unit_price
      const offerPriceMap = offerItemsMap.get(order.id) || new Map();
      const itemsWithFlags = (order.items || []).map((it: any) => {
        const flags = catalogueFlags.get(it.id) || { requires_prescription: false, controlled: false, online_exclusive: false };
        const unitPrice = offerPriceMap.get(it.id);
        return { ...it, requires_prescription: flags.requires_prescription, controlled: flags.controlled, online_exclusive: flags.online_exclusive, ...(unitPrice !== undefined ? { unit_price: unitPrice } : {}) };
      });

      // Courier fields from allocation delivery
      const courierName = orderAllocs.find((a: any) => a.delivery?.courier_name)?.delivery?.courier_name ?? null;
      const courierPhone = orderAllocs.find((a: any) => a.delivery?.courier_phone)?.delivery?.courier_phone ?? null;

      // Pharmacy names for allocations
      const allocationsDetail = orderAllocs.map((a: any) => ({ ...a, ...(pharmacyNamesMap.get(a.pharmacy_account_id) ?? { pharmacy_name_ar: null, pharmacy_name_en: null }) }));
      const pharmacies = [...new Set(orderAllocs.map((a: any) => a.pharmacy_account_id).filter(Boolean))];
      const single = pharmacies.length === 1 ? pharmacyNamesMap.get(pharmacies[0] as string) : undefined;

      return {
        ...order,
        effective_status: effectiveStatus,
        items: itemsWithFlags,
        allocations_detail: allocationsDetail,
        pharmacy_name_ar: single?.pharmacy_name_ar ?? null,
        pharmacy_name_en: single?.pharmacy_name_en ?? null,
        courier_name: courierName,
        courier_phone: courierPhone,
        ...view,
      };
    });
  }

  /**
   * Compute effective_status from order and its allocations (shared by detail and list).
   */
  private computeEffectiveStatus(order: any, allocs: any[]): string {
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
    return effective_status;
  }

  async detail(user: any, id: string): Promise<any> {
    const order = await this.orders.findOne({ id }, { _id: 0, __v: 0 }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (user.role === 'patient' && order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    const allocs = await this.allocs.find({ order_id: id }, { _id: 0, __v: 0 }).lean();
    const effectiveStatus = this.computeEffectiveStatus(order, allocs);
    let view: any = this.governedView(order);
    // Q-3: unselected broadcasting orders derive ORDER_BROADCASTING / OFFERS_READY
    // from live offers (submitted, quote not expired). Draft/expired/cancelled and
    // other orders' offers never count; an expired offer flips back to BROADCASTING.
    if (!view.governed_state && String(order.status) === PharmacyOrderState.BROADCASTING) {
      view.governed_state = (await this.hasLiveOffer(id)) ? 'OFFERS_READY' : 'ORDER_BROADCASTING';
    }
    // Q-21: an accepted quote with a gateway payment under way reads PAYMENT_PENDING (the clients keep the pay screen,
    // and POST /payments/intent hands back the same active transaction, so the patient can resume it).
    if (view.governed_state === 'FINAL_QUOTE_ACCEPTED' && String(order.payment_status || '').toLowerCase() !== 'paid' && await this.hasActivePayment(id)) {
      view.governed_state = 'PAYMENT_PENDING';
    }
    // D-13 (owner decision 13): never an endless wait. While broadcasting, the patient sees the round,
    // the radius and when it ends; once the broadcast closed with no offer selected (the expiry command
    // moves the order to manual_review), the patient sees "no pharmacy available" (AUTO_CANCELLED).
    let searchState: any = null;
    const status = String(order.status);
    if (status === PharmacyOrderState.BROADCASTING || status === PharmacyOrderState.MANUAL_REVIEW) {
      const broadcast: any = await this.conn.collection('pharmacy_broadcasts').findOne({ order_id: { $eq: id } });
      const expired = (order.timeline || []).some((t: any) => t?.event === 'broadcast_expired_manual_review');
      if (status === PharmacyOrderState.BROADCASTING && broadcast?.lock_state === 'open') {
        searchState = {
          state: 'expanding',
          round: broadcast.current_round ?? 1,
          radius_km: broadcast.current_radius_km ?? null,
          ends_at: broadcast.round_expires_at || null,
        };
      } else if (!order.selected_offer_id && (broadcast?.lock_state === 'closed' || expired)) {
        searchState = { state: 'no_pharmacy_available' };
        view.governed_state = 'AUTO_CANCELLED';
      }
    }
    // #366/#375/#514: the patient sees which pharmacy is filling the order (its public display name only).
    const names = await this.pharmacyNames(allocs.map((a: any) => a.pharmacy_account_id));
    const allocationsDetail = allocs.map((a: any) => ({ ...a, ...(names.get(a.pharmacy_account_id) ?? { pharmacy_name_ar: null, pharmacy_name_en: null }) }));
    const pharmacies = [...new Set(allocs.map((a: any) => a.pharmacy_account_id).filter(Boolean))];
    const single = pharmacies.length === 1 ? names.get(pharmacies[0] as string) : undefined;

    // D-10: enrich order items with requires_prescription and controlled from catalogue
    const catalogueFlags = await this.enrichItemsWithCatalogueFlags(order.items || []);
    const itemsWithFlags = (order.items || []).map((it: any) => {
      const flags = catalogueFlags.get(it.id) || { requires_prescription: false, controlled: false, online_exclusive: false };
      return { ...it, requires_prescription: flags.requires_prescription, controlled: flags.controlled, online_exclusive: flags.online_exclusive };
    });

    // Courier fields from allocation delivery (when assigned)
    const courierName = allocs.find((a: any) => a.delivery?.courier_name)?.delivery?.courier_name ?? null;
    const courierPhone = allocs.find((a: any) => a.delivery?.courier_phone)?.delivery?.courier_phone ?? null;

    // Unit price per line from selected offer (pricing_snapshot or offer items)
    const offerItemsMap = new Map<string, number>();
    if (order.pricing_snapshot?.totals && Array.isArray(order.pricing_snapshot.items)) {
      for (const oi of order.pricing_snapshot.items) {
        if (oi.order_item_id && oi.unit_price !== undefined) offerItemsMap.set(oi.order_item_id, oi.unit_price);
      }
    } else if (order.selected_offer_id) {
      // Fallback: try to fetch from offer collection if not in snapshot
      const offer: any = await this.conn.collection('pharmacy_offers').findOne(
        { id: order.selected_offer_id },
        { projection: { _id: 0, items: 1 } }
      );
      if (offer?.items) {
        for (const oi of offer.items) {
          if (oi.order_item_id && oi.unit_price !== undefined) offerItemsMap.set(oi.order_item_id, oi.unit_price);
        }
      }
    }
    const itemsWithPrice = itemsWithFlags.map((it: any) => {
      const unitPrice = offerItemsMap.get(it.id);
      return { ...it, ...(unitPrice !== undefined ? { unit_price: unitPrice } : {}) };
    });

    // D-26: what a cancel right now would refund — before dispatch the full
    // total including the delivery fee, once out for delivery minus the fee.
    // Governed orders carry their prices in pricing_snapshot (same fallback as cancel()).
    const cancelTotal = Math.round(Number(order.totals?.total ?? order.pricing_snapshot?.totals?.total ?? 0) * 100) / 100;
    const cancelFee = Math.round(Number(order.totals?.delivery_fee ?? order.pricing_snapshot?.totals?.delivery_fee ?? 0) * 100) / 100;
    const cancelAfterDispatch = String(order.status).toLowerCase() === 'out_for_delivery';
    const cancelRefundNow = {
      percent: 100,
      amount: cancelAfterDispatch ? Math.max(0, Math.round((cancelTotal - cancelFee) * 100) / 100) : cancelTotal,
    };

    return {
      ...order,
      effective_status: effectiveStatus,
      items: itemsWithPrice,
      allocations_detail: allocationsDetail,
      pharmacy_name_ar: single?.pharmacy_name_ar ?? null,
      pharmacy_name_en: single?.pharmacy_name_en ?? null,
      courier_name: courierName,
      courier_phone: courierPhone,
      search: searchState,
      cancellation: { refund_now: cancelRefundNow },
      ...view,
    };
  }

  /** Display names of pharmacies by account id, from their profile (the same names the offers list shows). */
  private async pharmacyNames(accountIds: unknown[]): Promise<Map<string, { pharmacy_name_ar: string | null; pharmacy_name_en: string | null }>> {
    const ids = [...new Set(accountIds.filter((x): x is string => typeof x === 'string' && x.length > 0))];
    const out = new Map<string, { pharmacy_name_ar: string | null; pharmacy_name_en: string | null }>();
    if (!ids.length) return out;
    const rows: any[] = await this.conn.collection('provider_profiles')
      .find({ account_id: { $in: ids } }, { projection: { _id: 0, account_id: 1, display_name_ar: 1, display_name_en: 1, name_ar: 1, name_en: 1, business_name: 1, legal_name: 1 } })
      .toArray().catch(() => []);
    for (const p of rows) {
      const registered = p.business_name || p.legal_name || null;
      const ar = p.display_name_ar || p.name_ar || registered;
      const en = p.display_name_en || p.name_en || registered;
      // Use || for fallback so empty string falls back to the other language
      out.set(p.account_id, { pharmacy_name_ar: ar || en || null, pharmacy_name_en: en || ar || null });
    }
    return out;
  }

  /**
   * Fetch requires_prescription, controlled and online_exclusive flags for order items by matching
   * medicine_id, sku, or name with the medicines catalogue (D-10; decision 11: a reordered line keeps "online only").
   * Returns a map of item id -> { requires_prescription, controlled, online_exclusive }
   */
  private async enrichItemsWithCatalogueFlags(items: any[]): Promise<Map<string, { requires_prescription: boolean; controlled: boolean; online_exclusive: boolean }>> {
    const result = new Map<string, { requires_prescription: boolean; controlled: boolean; online_exclusive: boolean }>();
    if (!items?.length) return result;

    const ids = [...new Set(items.map((it) => (typeof it?.medicine_id === 'string' ? it.medicine_id.trim() : '')).filter(Boolean))];
    const skus = [...new Set(items.map((it) => {
      const v = it?.sku ?? it?.matched_sku;
      return v === undefined || v === null ? '' : String(v).trim();
    }).filter(Boolean))];
    const names = [...new Set(items.flatMap((it) => [it?.name, it?.name_ar, it?.name_en, it?.raw_name].map((n) => (typeof n === 'string' ? n.trim().toLowerCase() : '')).filter(Boolean)))];

    const or: any[] = [];
    if (ids.length) or.push({ id: { $in: ids } });
    if (skus.length) {
      const numeric = skus.map(Number).filter((n) => Number.isFinite(n));
      or.push({ sku: { $in: [...skus, ...numeric] } });
    }
    for (const n of names) {
      const exact = new RegExp(`^\\s*${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*$`, 'i');
      or.push({ name_ar: exact }, { name_en: exact });
    }

    if (!or.length) return result;

    const meds: any[] = await this.conn.collection('medicines')
      .find({ $or: or }, { projection: { _id: 0, id: 1, sku: 1, name_ar: 1, name_en: 1, requires_prescription: 1, controlled: 1, online_exclusive: 1 } })
      .toArray();

    for (const it of items) {
      const id = typeof it?.medicine_id === 'string' ? it.medicine_id.trim() : '';
      const sku = it?.sku ?? it?.matched_sku;
      const skuStr = sku === undefined || sku === null ? '' : String(sku).trim();
      const ln = [it?.name, it?.name_ar, it?.name_en, it?.raw_name].map((n) => (typeof n === 'string' ? n.trim().toLowerCase() : '')).filter(Boolean);
      const med = (id && meds.find((m) => m.id === id))
        || (skuStr && meds.find((m) => m.sku !== undefined && m.sku !== null && String(m.sku) === skuStr))
        || meds.find((m) => ln.includes(typeof m.name_ar === 'string' ? m.name_ar.trim().toLowerCase() : '') || ln.includes(typeof m.name_en === 'string' ? m.name_en.trim().toLowerCase() : ''));
      result.set(it.id, {
        requires_prescription: med?.requires_prescription === true,
        controlled: med?.controlled === true,
        online_exclusive: med?.online_exclusive === true,
      });
    }
    return result;
  }

  /** True when a gateway transaction for this order is still open (initiating, pending or authorized). */
  private async hasActivePayment(orderId: string): Promise<boolean> {
    try {
      const txn = await this.conn?.collection('transactions').findOne(
        { booking_kind: 'pharmacy', booking_id: orderId, status: { $in: ['initiating', 'pending', 'authorized'] } },
        { projection: { _id: 0, id: 1 } },
      );
      return !!txn;
    } catch {
      return false;
    }
  }

  /** True when >= 1 live offer (submitted, quote_expires_at in the future) exists for this order. */
  private async hasLiveOffer(orderId: string): Promise<boolean> {
    try {
      const coll = this.conn?.collection('pharmacy_offers');
      if (!coll) return false;
      const live = await coll.findOne({
        order_id: orderId,
        status: 'submitted',
        quote_expires_at: { $gt: new Date() },
      }, { projection: { _id: 0, id: 1 } });
      return !!live;
    } catch {
      return false;
    }
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
    // Once fulfilment starts the order status is the truth (the app shows governed_state first,
    // so it used to stay "COD_REGISTERED" through preparation, dispatch and delivery).
    const FULFILMENT = ['confirmed', 'in_fulfillment', 'out_for_delivery', 'delivered', 'completed', 'cancelled'];
    if (FULFILMENT.includes(String(order.status))) governed_state = String(order.status).toUpperCase();
    else if (selected) {
      if (method === 'insurance') {
        if (!decision) governed_state = 'INSURANCE_PROCESSING';
        else if (decision.outcome === 'full') governed_state = 'CONFIRMED';
        else if (decision?.patient_acceptance?.kind === 'co-pay' && String(order.payment_status).toLowerCase() === 'paid') governed_state = 'CONFIRMED';
        else if (decision?.patient_acceptance?.kind === 'co-pay') governed_state = 'CO_PAY_PENDING';
        else governed_state = 'INSURANCE_DECISION_READY';
      } else if (codRegistered) governed_state = 'COD_REGISTERED';
      else if (quoteAccepted) governed_state = 'FINAL_QUOTE_ACCEPTED';
      else governed_state = 'OFFER_SELECTED';
    }

    const view: any = {
      governed_state,
      coverage_mode: order.coverage_mode || (method === 'insurance' ? 'insurance' : selected ? 'cash' : undefined),
      selected_offer_snapshot: selected ? snapshot : undefined,
      selected_offer_hash: selected ? snapshot.hash : undefined,
      selected_offer_revision: selected ? Number(order.selected_offer_version) : undefined,
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
        // #523: what the patient already accepted, so a screen reopened after a reload says so instead of offering it again
        patient_acceptance: decision.patient_acceptance
          ? { kind: decision.patient_acceptance.kind, accepted_at: decision.patient_acceptance.accepted_at ?? null }
          : null,
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
    await this.assertCodAllowed(order, user.id);
    const now = new Date();
    await this.orders.updateOne({ id: order.id }, {
      $set: { payment_method: 'cod', cod_registered_at: now, cod_idempotency_key: idempotencyKey, status: PharmacyOrderState.COD_DUE_ON_DELIVERY },
      $push: { timeline: { ts: now, event: 'cod_registered', by: user.id, meta: { amount: order.pricing_snapshot?.totals?.total } } },
    } as any);
    return { ok: true, idempotent: false, status: PharmacyOrderState.COD_DUE_ON_DELIVERY };
  }

  /**
   * D-25 (owner decision 25): cash on delivery only when ALL hold, otherwise 400 with a `cod_*` code
   * and the order is left unchanged:
   *  - no prescription item (an attachment, a prescription_id, or a catalogue Rx line);
   *  - no insurance;
   *  - the order total is not above the admin cap (`GET /payment-rules`; no cap set = no COD);
   *  - the patient has at least one delivered/completed pharmacy order;
   *  - the selected pharmacy has not switched cash on delivery off for itself.
   */
  private async assertCodAllowed(order: any, patientId: string) {
    const db = this.conn;
    const items: any[] = Array.isArray(order.items) ? order.items : [];
    const hasAttachment = (Array.isArray(order.prescription_attachments) && order.prescription_attachments.length > 0) || !!order.prescription_id;
    let rxLine = items.some((i) => i?.requires_prescription === true);
    if (!rxLine && !hasAttachment) {
      const ids = items.map((i) => i?.medicine_id).filter((v) => typeof v === 'string');
      const skus = items.map((i) => i?.matched_sku).filter((v) => v !== undefined && v !== null && v !== '').map(String);
      const or: any[] = [];
      if (ids.length) or.push({ id: { $in: ids } });
      if (skus.length) or.push({ sku: { $in: [...skus, ...skus.filter((x) => /^\d+$/.test(x)).map(Number)] } });
      if (or.length) rxLine = !!(await db.collection('medicines').findOne({ $or: or, requires_prescription: true }, { projection: { _id: 1 } }));
    }
    if (hasAttachment || rxLine) throw new BadRequestException('cod_not_allowed_prescription');
    if (String(order.coverage_mode || '').toLowerCase() === 'insurance' || order.insurance_decision) throw new BadRequestException('cod_not_allowed_insurance');
    const rules: any = await db.collection('system_configs').findOne({ key: 'payment_rules' });
    const cap = Number(rules?.value?.pharmacy_cod_max_sar);
    const total = Number(order.pricing_snapshot?.totals?.total ?? order.totals?.total ?? 0);
    if (!(cap > 0) || !(total > 0) || total > cap) throw new BadRequestException('cod_over_limit');
    const returning = await db.collection('pharmacy_orders').findOne(
      { patient_account_id: patientId, status: { $in: [PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED] } },
      { projection: { _id: 1 } },
    );
    if (!returning) throw new BadRequestException('cod_first_order_not_allowed');
    let pharmacyId: string | undefined = order.pharmacy_account_id;
    if (!pharmacyId && order.selected_offer_id) {
      const offer: any = await db.collection('pharmacy_offers').findOne({ id: order.selected_offer_id }, { projection: { pharmacy_account_id: 1 } });
      pharmacyId = offer?.pharmacy_account_id;
    }
    if (pharmacyId) {
      const settings: any = await db.collection('provider_settings').findOne({ provider_id: pharmacyId }, { projection: { cod_enabled: 1 } });
      if (settings?.cod_enabled === false) throw new BadRequestException('cod_disabled_by_pharmacy');
    }
  }

  /**
   * Read-only payment status endpoint.
   * Returns the current payment state without creating any new records.
   * No raw documents — only the governed view fields the clients need.
   */
  async getPaymentStatus(user: any, id: string): Promise<any> {
    assertPatient(user);
    const order = await this.orders.findOne({ id, patient_account_id: user.id }, { _id: 0, __v: 0 }).lean();
    if (!order) throw new NotFoundException('order_not_found');

    const governed = this.governedView(order);
    const paymentMethod = String(order.payment_method || '').toLowerCase();
    const paymentStatus = String(order.payment_status || '').toLowerCase();
    const decision = order.insurance_decision || null;

    // Active payment intent?
    let activeIntent: any = null;
    if (paymentMethod === 'card' || paymentMethod === 'moyasar') {
      activeIntent = await this.conn.collection('pharmacy_payment_intents').findOne({
        order_id: id, status: { $in: ['requires_payment', 'initiating', 'pending', 'authorized'] }
      }, { projection: { _id: 0, intent_id: 1, status: 1, amount: 1, currency: 1, createdAt: 1 } });
    }

    // Confirmed evidence?
    let confirmedEvidence: any = null;
    if (['paid', 'covered_by_insurance', 'partially_refunded'].includes(paymentStatus)) {
      confirmedEvidence = await this.conn.collection('pharmacy_payment_evidence').findOne({
        order_id: id, status: 'confirmed'
      }, { projection: { _id: 0, gateway: 1, gateway_payment_id: 1, amount: 1, currency: 1, confirmed_at: 1 } });
    }

    // Retryable governed states
    const retryable = PAYMENT_RETRY_STATES.includes(governed.governed_state || '');
    const retryReason = retryable ? governed.governed_state : null;

    return {
      order_id: id,
      payment_method: order.payment_method || null,
      payment_status: order.payment_status || null,
      governed_state: governed.governed_state || null,
      amount: order.pricing_snapshot?.totals?.total ?? null,
      currency: order.pricing_snapshot?.totals?.currency || 'SAR',
      co_pay_amount: decision?.patient_share ?? null,
      insurer_share: decision?.insurer_share ?? null,
      active_intent: activeIntent ? { intent_id: activeIntent.intent_id, status: activeIntent.status, amount: activeIntent.amount, currency: activeIntent.currency, created_at: activeIntent.createdAt } : null,
      confirmed_evidence: confirmedEvidence ? { gateway: confirmedEvidence.gateway, payment_id: confirmedEvidence.gateway_payment_id, amount: confirmedEvidence.amount, currency: confirmedEvidence.currency, confirmed_at: confirmedEvidence.confirmed_at } : null,
      retryable,
      retry_reason: retryReason,
    };
  }

  /**
   * A-4: prepare a card payment retry. Card only (owner decision 25: no cash on delivery). Refuses while a
   * payment is already with the gateway (pending/authorized), so a retry can never charge twice; only
   * intents the patient never started are closed. The new intent is made by the one card-intent path
   * (PharmacyPaymentEvidenceService.createPaymentIntent), called by the controller.
   */
  async prepareCardRetry(user: any, id: string, idempotencyKey: string): Promise<void> {
    assertPatient(user);
    const order = await this.orders.findOne({ id, patient_account_id: user.id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (['cancelled', 'expired'].includes(String(order.status))) throw new BadRequestException('order_not_actionable');
    if (!PAYMENT_RETRY_STATES.includes(this.governedView(order).governed_state || '')) throw new BadRequestException('payment_not_retryable_in_current_state');
    const intents = this.conn.collection('pharmacy_payment_intents');
    if (await intents.findOne({ order_id: id, status: { $in: ['pending', 'authorized'] } })) throw new BadRequestException('payment_in_progress');
    // A replay of the same retry keeps its own intent (createPaymentIntent then returns it).
    await intents.updateMany({ order_id: id, idempotency_key: { $ne: idempotencyKey }, status: { $in: ['requires_payment', 'initiating'] } }, { $set: { status: 'cancelled', updatedAt: new Date() } });
  }

  async update(user: any, id: string, body: any): Promise<any> {
    assertPatient(user);
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    if (order.patient_account_id !== user.id) throw new ForbiddenException('not_yours');
    if (order.status !== PharmacyOrderState.DRAFT) throw new BadRequestException(`not_editable_in_${order.status}`);
    if (body.items) {
      const sanitize = (str: any) => String(str || '').replace(/[<>]/g, '').trim();
      order.items = body.items.map((it: any) => ({
        id: it.id || uuidv4(),
        raw_name: sanitize(it.raw_name || it.name || it.name_ar || 'unknown'),
        name_ar: it.name_ar, name_en: it.name_en, generic_name: it.generic_name,
        medicine_id: typeof it.medicine_id === 'string' ? it.medicine_id : undefined,
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
    // #544: changing the delivery mode or the saved address edits this draft; it never needs a second one.
    if (body.fulfillment === 'delivery' || body.fulfillment === 'pickup') (order as any).fulfillment = body.fulfillment;
    if (typeof body.delivery_address_id === 'string') (order as any).delivery_address_id = body.delivery_address_id.slice(0, 100);
    // D-10: a prescription can be attached after the draft was created (the cart adds an Rx item later).
    await this.assertOwnPrescriptionRefs(user, body);
    if (Array.isArray(body.prescription_attachments)) {
      const attachments = await this.resolvePrescriptionAttachments(user, body.prescription_attachments);
      order.prescription_attachments = attachments.files;
      if (typeof body.prescription_id !== 'string' && attachments.prescriptionId) order.prescription_id = attachments.prescriptionId;
    }
    if (typeof body.prescription_id === 'string') order.prescription_id = body.prescription_id;
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
    // D-10: Rx and controlled come from the catalogue; refused here, before any broadcast.
    const checked: any = { items: order.items, prescription_attachments: order.prescription_attachments, prescription_id: order.prescription_id };
    await enforceRxRules(this.conn, user.id, checked);
    order.items = checked.items;
    order.markModified('items');
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
    return this.cancelOrder(order, { id: user.id, role: 'patient' }, reason || 'patient_requested');
  }

  /** Admin orders console: same transition, allocation release and restock as a patient cancel. */
  async adminCancel(admin: { id: string }, id: string, reason: string) {
    const order = await this.orders.findOne({ id });
    if (!order) throw new NotFoundException('order_not_found');
    return this.cancelOrder(order, { id: admin.id, role: 'admin' }, reason);
  }

  private async cancelOrder(order: any, actor: { id: string; role: 'patient' | 'admin' }, reason: string) {
    if ([PharmacyOrderState.DELIVERED, PharmacyOrderState.COMPLETED, PharmacyOrderState.CANCELLED].includes(order.status)) {
      throw new BadRequestException(`cannot_cancel_in_${order.status}`);
    }
    const id = order.id;
    return await this.engine.transition({
      kind: 'pharmacy', entity_id: order.id, from_domain: order.status, to_domain: PharmacyOrderState.CANCELLED,
      actor_account_id: actor.id, actor_role: actor.role, patient_account_id: order.patient_account_id, reason,
      mutate: async () => {
        const priorStatus = String(order.status);
        const refundTotal = Math.round(Number(order.totals?.total ?? order.pricing_snapshot?.totals?.total ?? 0) * 100) / 100;
        const refundDeliveryFee = Math.round(Number(order.totals?.delivery_fee ?? order.pricing_snapshot?.totals?.delivery_fee ?? 0) * 100) / 100;
        order.status = PharmacyOrderState.CANCELLED;
        order.cancellation_reason = reason;
        order.timeline.push({ ts: new Date(), event: `cancelled_by_${actor.role}`, by: actor.id, meta: { reason } });
        await order.save();
        // Release any open allocations + restock
        const openAllocs = await this.allocs.find({ order_id: id });
        for (const a of openAllocs) {
          if (![PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED, PharmacyAllocationState.REJECTED].includes(a.status as any)) {
            await this.split.releaseStockForAllocation(a);
            a.status = PharmacyAllocationState.CANCELLED;
            a.cancellation_reason = `order_cancelled_by_${actor.role}`;
            a.timeline.push({ ts: new Date(), event: `cancelled_by_${actor.role}` });
            await a.save();
          }
        }
        this.bus.emit({ type: 'pharmacy.allocations_released', entity_type: 'order', entity_id: id, actor_account_id: actor.id, actor_role: actor.role, patient_account_id: order.patient_account_id, reason_code: reason, meta: { released_allocations: openAllocs.length } }).catch(() => null);
        // D-26: fan out for the refund listener (before dispatch: full total;
        // once out for delivery: total minus the delivery fee).
        this.bus.emit({ type: 'pharmacy.order.cancelled', entity_type: 'order', entity_id: id, actor_account_id: actor.id, actor_role: actor.role, patient_account_id: order.patient_account_id, reason_code: reason, meta: { prior_status: priorStatus, total: refundTotal, delivery_fee: refundDeliveryFee } }).catch(() => null);
        return { ok: true };
      },
    });
  }
}
