import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';

const OFFER_TTL_MS = 10 * 60_000;
const ACTIVE_PHARMACY_STATUSES = ['approved', 'active'];

type ProviderOfferItemInput = {
  order_item_id: string;
  availability: 'available' | 'unavailable' | 'substitute';
  qty_offered?: number;
  inventory_item_id?: string;
  substitute_inventory_item_id?: string;
  unit_price_override?: number;
  price_override_reason?: string;
};

type ProviderOfferInput = {
  items: ProviderOfferItemInput[];
  /** Reserved for a server policy; client values are never accepted as authority. */
  delivery_option?: 'delivery' | 'pickup';
  eta_minutes?: number;
};

@Injectable()
export class PharmacyOfferService {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    @InjectModel('PharmacyOffer') private readonly offers: Model<any>,
    @InjectModel('PharmacyOrder') private readonly orders: Model<any>,
    @InjectModel('PharmacyAllocation') private readonly allocations: Model<any>,
    @InjectModel('PharmacyBroadcast') private readonly broadcasts: Model<any>,
    @InjectModel('PharmacyInventoryItem') private readonly inventory: Model<any>,
    @InjectModel('ProviderAccount') private readonly accounts: Model<any>,
    private readonly bus: EventBusService,
  ) {}

  private async assertActivePharmacy(user: any) {
    if (!user?.id) throw new ForbiddenException('provider_identity_required');
    const account: any = await this.accounts.findOne({
      id: user.id,
      provider_type: 'pharmacy',
      status: { $in: ACTIVE_PHARMACY_STATUSES },
    }).lean();
    if (!account) throw new ForbiddenException('approved_pharmacy_account_required');
    return account;
  }

  private async loadBroadcastForPharmacy(user: any, orderId: string) {
    await this.assertActivePharmacy(user);
    const broadcast: any = await this.broadcasts.findOne({ order_id: orderId }).lean();
    if (!broadcast) throw new NotFoundException('broadcast_not_found');
    if (broadcast.lock_state !== 'open') throw new BadRequestException('broadcast_not_accepting_offers');
    if (!Array.isArray(broadcast.notified_pharmacies) || !broadcast.notified_pharmacies.includes(user.id)) {
      throw new ForbiddenException('pharmacy_not_notified_for_broadcast');
    }
    const order: any = await this.orders.findOne({ id: orderId }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    if (order.selected_offer_id) throw new BadRequestException('offer_already_selected');
    return { broadcast, order };
  }

  private async inventoryForOffer(userId: string, orderItem: any, input: ProviderOfferItemInput) {
    if (input.availability === 'unavailable') {
      return {
        order_item_id: orderItem.id,
        action: 'unavailable',
        qty_requested: orderItem.qty,
        qty_offered: 0,
      };
    }

    const inventoryId = input.availability === 'substitute'
      ? input.substitute_inventory_item_id
      : input.inventory_item_id || orderItem.matched_inventory_id;
    if (!inventoryId) throw new BadRequestException('inventory_item_id_required');
    const inventoryItem: any = await this.inventory.findOne({
      id: inventoryId,
      provider_account_id: userId,
      available: true,
      stock: { $gt: 0 },
      $or: [{ expiry_date: { $exists: false } }, { expiry_date: null }, { expiry_date: { $gt: new Date() } }],
    }).lean();
    if (!inventoryItem) throw new BadRequestException('inventory_item_not_available');

    if (input.availability === 'substitute') {
      const permitted = (inventoryItem.substitute_skus || []).includes(orderItem.matched_sku)
        || (!!inventoryItem.generic_name && inventoryItem.generic_name === orderItem.generic_name);
      if (!permitted) throw new BadRequestException('unapproved_substitute');
    } else if (orderItem.matched_sku && inventoryItem.sku !== orderItem.matched_sku) {
      throw new BadRequestException('inventory_item_does_not_match_order_item');
    }

    const requested = Math.max(1, Number(orderItem.qty) || 1);
    const offered = Math.min(requested, Math.max(1, Math.floor(Number(input.qty_offered) || requested)), Number(inventoryItem.stock));
    const result: any = {
      order_item_id: orderItem.id,
      action: input.availability,
      qty_requested: requested,
      qty_offered: offered,
      inventory_item_id: inventoryItem.id,
      sku: inventoryItem.sku,
      name_ar: inventoryItem.name_ar,
      name_en: inventoryItem.name_en,
      unit_price: Number(inventoryItem.price),
      currency: inventoryItem.currency || 'SAR',
      inventory_price_updated_at: inventoryItem.updatedAt || null,
    };
    // Master spec: provider may override the item price; the catalog price is preserved for admin audit.
    if (input.unit_price_override !== undefined && input.unit_price_override !== null) {
      const override = Number(input.unit_price_override);
      if (!Number.isFinite(override) || override <= 0 || override > 100000) throw new BadRequestException('invalid_price_override');
      const rounded = Math.round(override * 100) / 100;
      if (rounded !== result.unit_price) {
        result.catalog_price = result.unit_price;
        result.unit_price = rounded;
        result.price_source = 'provider_override';
        result.price_override_reason = String(input.price_override_reason || '').slice(0, 500);
      }
    }
    return result;
  }

  private async serverQuote(userId: string, order: any, inputs: ProviderOfferItemInput[]) {
    if (!Array.isArray(inputs) || inputs.length === 0) throw new BadRequestException('offer_items_required');
    const byOrderItem = new Map(inputs.map((item) => [item.order_item_id, item]));
    if (byOrderItem.size !== order.items.length || order.items.some((item: any) => !byOrderItem.has(item.id))) {
      throw new BadRequestException('offer_must_cover_every_order_item');
    }
    const items: any[] = [];
    for (const orderItem of order.items) {
      items.push(await this.inventoryForOffer(userId, orderItem, byOrderItem.get(orderItem.id)!));
    }
    const subtotal = items.reduce((sum, item) => sum + (item.action === 'unavailable' ? 0 : item.unit_price * item.qty_offered), 0);
    // Delivery fees/options/ETA are policy-owned. No configured server policy exists yet, so they are explicit read-only/unavailable values.
    const deliveryFee = 0;
    const estimatedPreparationMinutes = Math.max(15, Math.min(60, 10 + items.filter((item) => item.action !== 'unavailable').length * 5));
    return {
      items,
      totals: { subtotal: Math.round(subtotal * 100) / 100, delivery_fee: deliveryFee, total: Math.round((subtotal + deliveryFee) * 100) / 100, currency: 'SAR' },
      estimated_preparation_minutes: estimatedPreparationMinutes,
      fulfillment: {
        policy_status: 'unavailable_read_only',
        delivery_option: null,
        eta_minutes: null,
        delivery_fee_source: 'no_active_server_delivery_policy',
      },
    };
  }

  async previewQuote(user: any, orderId: string, body: ProviderOfferInput) {
    const { order } = await this.loadBroadcastForPharmacy(user, orderId);
    const quote = await this.serverQuote(user.id, order, body?.items || []);
    return {
      ...quote,
      quote_ttl_seconds: Math.floor(OFFER_TTL_MS / 1000),
      quote_generated_at: new Date(),
      delivery_client_fields_ignored: Boolean(body?.delivery_option || body?.eta_minutes),
    };
  }

  async upsertDraft(user: any, orderId: string, body: ProviderOfferInput) {
    const { broadcast, order } = await this.loadBroadcastForPharmacy(user, orderId);
    const quote = await this.serverQuote(user.id, order, body?.items || []);
    const now = new Date();
    const prior: any = await this.offers.findOne({ order_id: orderId, pharmacy_account_id: user.id, status: { $in: ['draft', 'submitted'] } }).lean();
    if (prior?.status === 'submitted') throw new BadRequestException('submitted_offer_cannot_be_edited_create_new_version');
    const values = {
      order_id: orderId,
      broadcast_id: broadcast.id,
      patient_account_id: order.patient_account_id,
      pharmacy_account_id: user.id,
      status: 'draft',
      version: Number(prior?.version || 0) + 1,
      items: quote.items,
      totals: quote.totals,
      estimated_preparation_minutes: quote.estimated_preparation_minutes,
      fulfillment: quote.fulfillment,
      quote_expires_at: new Date(now.getTime() + OFFER_TTL_MS),
      pricing_source: 'provider_capabilities_pharmacy',
      created_by: user.id,
      updated_by: user.id,
    };
    const offer: any = prior
      ? await this.offers.findOneAndUpdate({ id: prior.id, status: 'draft' }, { $set: values }, { new: true })
      : await this.offers.create({ id: uuidv4(), ...values, created_at: now, timeline: [{ ts: now, event: 'draft_created', by: user.id }] });
    return this.providerDto(offer.toObject ? offer.toObject() : offer);
  }

  async submitDraft(user: any, orderId: string, offerId: string) {
    await this.assertActivePharmacy(user);
    const now = new Date();
    const offer: any = await this.offers.findOneAndUpdate(
      { id: offerId, order_id: orderId, pharmacy_account_id: user.id, status: 'draft', quote_expires_at: { $gt: now } },
      { $set: { status: 'submitted', submitted_at: now, updated_by: user.id }, $push: { timeline: { ts: now, event: 'submitted', by: user.id } } },
      { new: true },
    );
    if (!offer) throw new BadRequestException('offer_not_submittable');
    // Master spec: every provider price override lands in an admin-visible audit collection.
    const overridden = (offer.items || []).filter((item: any) => item.price_source === 'provider_override');
    if (overridden.length) {
      await this.connection.collection('pharmacy_price_override_audit').insertMany(overridden.map((item: any) => ({
        id: uuidv4(),
        order_id: orderId,
        offer_id: offer.id,
        offer_version: offer.version,
        pharmacy_account_id: user.id,
        order_item_id: item.order_item_id,
        sku: item.sku || null,
        name_ar: item.name_ar || null,
        name_en: item.name_en || null,
        catalog_price: item.catalog_price ?? null,
        override_price: item.unit_price,
        currency: item.currency || 'SAR',
        reason: item.price_override_reason || '',
        changed_by: user.id,
        changed_at: now,
      })));
    }
    await this.bus.emit({
      type: 'pharmacy.offer.submitted', entity_type: 'pharmacy_offer', entity_id: offer.id,
      actor_account_id: user.id, actor_role: 'pharmacy', patient_account_id: offer.patient_account_id,
      reason_code: 'provider_offer_submitted', meta: { order_id: orderId, offer_id: offer.id, version: offer.version },
    });
    return this.providerDto(offer.toObject());
  }

  async listForPatient(user: any, orderId: string) {
    if (!user?.id) throw new ForbiddenException('patient_identity_required');
    const order: any = await this.orders.findOne({ id: orderId, patient_account_id: user.id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    const offers: any[] = await this.offers.find({ order_id: orderId, patient_account_id: user.id, status: 'submitted', quote_expires_at: { $gt: new Date() } })
      .sort({ submitted_at: -1 }).lean();
    return Promise.all(offers.map((offer) => this.patientDtoAsync(offer, order)));
  }

  private async patientDtoAsync(offer: any, order: any) {
    const base = this.patientDto(offer);
    const profile: any = await this.connection.collection('provider_profiles').findOne({ account_id: offer.pharmacy_account_id });
    let approx: number | null = null;
    const pg = profile?.geo; const og = order?.delivery_address?.geo;
    if (pg && og && Number.isFinite(Number(pg.lat)) && Number.isFinite(Number(og.lat))) {
      const toRad = (v: number) => (v * Math.PI) / 180;
      const dLat = toRad(Number(og.lat) - Number(pg.lat));
      const dLng = toRad(Number(og.lng) - Number(pg.lng));
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(Number(pg.lat))) * Math.cos(toRad(Number(og.lat))) * Math.sin(dLng / 2) ** 2;
      const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      if (Number.isFinite(d)) approx = Math.round(d * 2) / 2; // 0.5km rounding — approximate only
    }
    const pharmacyNameAr = profile?.display_name_ar || profile?.name_ar || null;
    const pharmacyNameEn = profile?.display_name_en || profile?.name_en || null;
    return {
      ...base,
      // Shared governed contract: patient-app reads `lines` + status 'open'.
      status: offer.status === 'submitted' ? 'open' : offer.status,
      lines: (offer.items || []).map((item: any) => ({
        order_item_id: item.order_item_id,
        sku: item.sku,
        name: item.name_ar || item.name_en || item.sku || null,
        available: item.action !== 'unavailable',
        requested_qty: item.qty_requested,
        offered_qty: item.qty_offered,
        unit_price: item.unit_price,
        currency: item.currency,
        alternative: item.action === 'substitute' ? (item.name_ar || item.name_en || item.sku || null) : null,
      })),
      pharmacy_name_ar: pharmacyNameAr,
      pharmacy_name_en: pharmacyNameEn,
      pharmacy_name: pharmacyNameAr || pharmacyNameEn,
      preparation_minutes: offer.estimated_preparation_minutes ?? null,
      expires_at: offer.quote_expires_at || null,
      insurance_ready: true,
      cod_allowed: true,
      quote_revision: Number(offer.version || 1),
      // Deterministic quote hash — identical to the one stored in
      // pricing_snapshot.hash at selection time.
      snapshot_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ offer_id: offer.id, offer_version: offer.version, totals: offer.totals }))
        .digest('hex'),
      approx_distance_km: approx,
      approx_delivery: { eta_minutes: 60, label_ar: 'خلال ساعة تقريباً', label_en: 'Approximately within 1 hour' },
    };
  }

  async selectByPatient(user: any, orderId: string, offerId: string, idempotencyKey: string, coverageMode?: string) {
    if (!user?.id) throw new ForbiddenException('patient_identity_required');
    if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || ''))) {
      throw new BadRequestException('idempotency_key_required');
    }
    const coverage = String(coverageMode || '').toLowerCase();
    if (coverage && !['cash', 'cod', 'card', 'insurance'].includes(coverage)) {
      throw new BadRequestException('invalid_coverage_mode');
    }
    const session = await this.connection.startSession();
    try {
      let selected: any;
      await session.withTransaction(async () => {
        const now = new Date();
        const order: any = await this.orders.findOne({ id: orderId, patient_account_id: user.id }).session(session);
        if (!order) throw new NotFoundException('order_not_found');
        if (order.selected_offer_id) {
          if (order.selected_offer_id === offerId && order.offer_selection_idempotency_key === idempotencyKey) {
            const replayOffer: any = await this.offers.findOne({ id: offerId }).session(session);
            const replayAllocation: any = await this.allocations.findOne({ id: order.selected_allocation_id }).session(session);
            if (!replayOffer || !replayAllocation) throw new BadRequestException('selection_replay_incomplete');
            selected = { offer: replayOffer, allocation: replayAllocation, next_status: order.status };
            return;
          }
          throw new BadRequestException('another_offer_already_selected');
        }
        const offer: any = await this.offers.findOne({ id: offerId, order_id: orderId, patient_account_id: user.id, status: 'submitted', quote_expires_at: { $gt: now } }).session(session);
        if (!offer) throw new BadRequestException('offer_not_selectable');

        for (const item of offer.items.filter((item: any) => item.action !== 'unavailable')) {
          const reserved = await this.inventory.findOneAndUpdate(
            { id: item.inventory_item_id, provider_account_id: offer.pharmacy_account_id, available: true, stock: { $gte: item.qty_offered } },
            { $inc: { stock: -item.qty_offered } }, { new: true, session },
          );
          if (!reserved) throw new BadRequestException('offer_stock_changed_requote_required');
        }

        // Coverage mode chosen at selection time overrides the order's payment method.
        let paymentMethod = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
        if (coverage === 'insurance') paymentMethod = 'insurance';
        else if (coverage === 'cod') paymentMethod = 'cod';
        else if (coverage === 'cash' || coverage === 'card') paymentMethod = 'card';
        // Master spec: a prescription is mandatory for insurance pharmacy orders.
        if (paymentMethod === 'insurance') {
          const hasRx = Array.isArray(order.prescription_attachments) && order.prescription_attachments.some((a: any) => a && a.uri && (a.type === 'image' || a.type === 'pdf'));
          if (!hasRx) throw new BadRequestException('prescription_required_for_insurance_orders');
        }
        const nextStatus = paymentMethod === 'insurance'
          ? PharmacyOrderState.INSURANCE_DECISION_PENDING
          : paymentMethod === 'cod'
            ? PharmacyOrderState.COD_DUE_ON_DELIVERY
            : PharmacyOrderState.CASH_CARD_PAYMENT_PENDING;
        const allocation = await this.allocations.create([{
          id: uuidv4(), order_id: orderId, pharmacy_account_id: offer.pharmacy_account_id,
          offer_id: offer.id, offer_version: offer.version,
          status: PharmacyAllocationState.PENDING_REVIEW,
          items: offer.items.map((item: any) => ({ id: uuidv4(), order_item_id: item.order_item_id, action: item.action, inventory_id: item.inventory_item_id, sku: item.sku, name: item.name_ar || item.name_en, qty_requested: item.qty_requested, qty_offered: item.qty_offered, unit_price: item.unit_price, updated_at: now })),
          totals: offer.totals, estimated_preparation_minutes: offer.estimated_preparation_minutes,
          timeline: [{ ts: now, event: 'created_after_patient_offer_selection', by: user.id, meta: { offer_id: offer.id, offer_version: offer.version } }],
        }], { session });
        await this.offers.updateOne({ id: offer.id, status: 'submitted' }, { $set: { status: 'selected', selected_at: now, selected_by_patient_account_id: user.id, allocation_id: allocation[0].id } }, { session });
        const quoteHash = crypto
          .createHash('sha256')
          .update(JSON.stringify({ offer_id: offer.id, offer_version: offer.version, totals: offer.totals }))
          .digest('hex');
        const orderUpdate: any = await this.orders.updateOne({ id: orderId, patient_account_id: user.id, $or: [{ selected_offer_id: { $exists: false } }, { selected_offer_id: null }] }, {
          $set: {
            selected_offer_id: offer.id,
            selected_offer_version: offer.version,
            offer_selection_idempotency_key: idempotencyKey,
            selected_allocation_id: allocation[0].id,
            status: nextStatus,
            payment_method: paymentMethod,
            coverage_mode: coverage === 'insurance' ? 'insurance' : 'cash',
            totals: offer.totals,
            pricing_snapshot: { offer_id: offer.id, offer_version: offer.version, totals: offer.totals, hash: quoteHash, captured_at: now },
          },
          $push: { timeline: { ts: now, event: 'patient_offer_selected', by: user.id, meta: { offer_id: offer.id, offer_version: offer.version, payment_method: paymentMethod } } },
        }, { session });
        if ((orderUpdate?.modifiedCount ?? orderUpdate?.nModified ?? 0) !== 1) {
          throw new BadRequestException('offer_selection_conflict');
        }
        selected = { offer, allocation: allocation[0], next_status: nextStatus };
      });
      await this.bus.emit({
        type: 'pharmacy.offer.selected', entity_type: 'pharmacy_offer', entity_id: offerId,
        actor_account_id: user.id, actor_role: 'patient', reason_code: 'patient_explicit_selection', meta: { order_id: orderId },
      });
      return { offer: this.patientDto(selected.offer), allocation_id: selected.allocation.id, next_status: selected.next_status };
    } finally {
      await session.endSession();
    }
  }

  private providerDto(offer: any) {
    return {
      id: offer.id, order_id: offer.order_id, status: offer.status, version: offer.version,
      items: offer.items, totals: offer.totals, quote_expires_at: offer.quote_expires_at,
      estimated_preparation_minutes: offer.estimated_preparation_minutes, fulfillment: offer.fulfillment || { policy_status: 'unavailable_read_only' }, pricing_source: offer.pricing_source,
    };
  }

  private patientDto(offer: any) {
    return {
      id: offer.id, pharmacy_account_id: offer.pharmacy_account_id, version: offer.version,
      items: offer.items.map((item: any) => ({ order_item_id: item.order_item_id, action: item.action, qty_requested: item.qty_requested, qty_offered: item.qty_offered, unit_price: item.unit_price, currency: item.currency, substitute: item.action === 'substitute' ? { sku: item.sku, name_ar: item.name_ar, name_en: item.name_en } : undefined })),
      totals: offer.totals, quote_expires_at: offer.quote_expires_at,
      estimated_preparation_minutes: offer.estimated_preparation_minutes,
      fulfillment: offer.fulfillment || { policy_status: 'unavailable_read_only' },
    };
  }
}
