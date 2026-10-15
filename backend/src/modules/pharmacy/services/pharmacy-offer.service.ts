import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { PharmacyAllocationState, PharmacyOrderState } from '../schemas/pharmacy.schema';
import { EventBusService } from '../../events/event-bus.service';
import { BusinessRulesService } from '../../business-rules/business-rules.module';
import { PharmacyNotificationService } from './pharmacy-notification.service';
import { CATALOGUE_PROJECTION, cataloguePrice, catalogueSku } from './catalogue-lines';
import { assertSubstituteInsidePrescription } from './rx-rules';

const OFFER_TTL_MS = 10 * 60_000;
const ACTIVE_PHARMACY_STATUSES = ['approved', 'active'];

type ProviderOfferItemInput = {
  order_item_id: string;
  availability: 'available' | 'unavailable' | 'substitute';
  qty_offered?: number;
  inventory_item_id?: string;
  substitute_inventory_item_id?: string;
  medicine_id?: string;
  unit_price_override?: number;
  price_override_reason?: string;
};

type ProviderOfferInput = {
  items: ProviderOfferItemInput[];
  /** Reserved for a server policy; client values are never accepted as authority. */
  delivery_option?: 'delivery' | 'pickup';
  eta_minutes?: number;
  /** #507: the pharmacy's own preparation estimate in minutes (5-240), or none. */
  preparation_minutes?: number;
  /** Optional pharmacy note to the patient (max 500 chars). */
  provider_note?: string;
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
    @Optional() private readonly pricing?: BusinessRulesService,
    @Optional() private readonly pharmacyNotif?: PharmacyNotificationService,
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

  /**
   * P3 "My offers": this pharmacy's offers with the state it sees: draft, sent, chosen, not_chosen
   * (the patient picked another pharmacy), expired or cancelled, and the quote expiry.
   */
  async listForPharmacy(user: any, status?: string) {
    await this.assertActivePharmacy(user);
    const rows: any[] = await this.offers.find({ pharmacy_account_id: { $eq: user.id } }, { _id: 0, __v: 0, expiry_claim: 0 })
      .sort({ updatedAt: -1 }).limit(200).lean();
    const orderIds = [...new Set(rows.map((o) => o.order_id))];
    const orders: any[] = orderIds.length
      ? await this.orders.find({ id: { $in: orderIds } }, { _id: 0, id: 1, selected_offer_id: 1, status: 1 }).lean()
      : [];
    const byId = new Map(orders.map((o) => [o.id, o]));
    const now = Date.now();
    const view = (o: any) => {
      const order = byId.get(o.order_id);
      if (o.status === 'draft') return 'draft';
      if (o.status === 'selected') return 'chosen';
      if (o.status === 'cancelled') return 'cancelled';
      if (o.status === 'expired') return 'expired';
      if (order?.selected_offer_id && order.selected_offer_id !== o.id) return 'not_chosen';
      if (o.quote_expires_at && new Date(o.quote_expires_at).getTime() <= now) return 'expired';
      return 'sent';
    };
    const out = rows.map((o) => ({
      id: o.id, order_id: o.order_id, version: o.version, status: o.status, view_status: view(o),
      totals: o.totals, items_count: Array.isArray(o.items) ? o.items.length : 0,
      quote_expires_at: o.quote_expires_at, estimated_preparation_minutes: o.estimated_preparation_minutes ?? null,
      allocation_id: o.allocation_id ?? null, created_at: o.createdAt, updated_at: o.updatedAt,
    }));
    const wanted = typeof status === 'string' && status.trim() ? status.trim() : null;
    return wanted ? out.filter((o) => o.view_status === wanted) : out;
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

    let inventoryId = input.availability === 'substitute'
      ? input.substitute_inventory_item_id
      : input.inventory_item_id || orderItem.matched_inventory_id;
    // The broadcast shows the pharmacy only order lines (matched_sku), not its own inventory ids, so the
    // app cannot send one. Resolve the pharmacy's own live item for that sku (same filter as below).
    if (!inventoryId && input.availability !== 'substitute' && orderItem.matched_sku) {
      const own: any = await this.inventory.findOne({
        provider_account_id: userId, sku: orderItem.matched_sku, available: true, stock: { $gt: 0 },
        $or: [{ expiry_date: { $exists: false } }, { expiry_date: null }, { expiry_date: { $gt: new Date() } }],
      }).lean();
      inventoryId = own?.id;
    }
    // provider-journeys 1: no inventory row for the line yet: price it from the national catalogue (the item the pharmacy
    // picked, else the catalogue item the line already names), which adds it to the pharmacy's inventory.
    if (!inventoryId) inventoryId = await this.adoptCatalogueItem(userId, orderItem, input);
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
      await assertSubstituteInsidePrescription(this.connection, orderItem, inventoryItem);
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
      // D-10: no discount on prescription-only lines (the flag is stamped from the catalogue at submit).
      if (orderItem.requires_prescription === true && rounded < Number(inventoryItem.price)) {
        throw new BadRequestException({ code: 'rx_discount_not_allowed', message: 'rx_discount_not_allowed' });
      }
      if (rounded !== result.unit_price) {
        result.catalog_price = result.unit_price;
        result.unit_price = rounded;
        result.price_source = 'provider_override';
        result.price_override_reason = String(input.price_override_reason || '').slice(0, 500);
      }
    }
    await this.markCataloguePrice(result, inventoryItem);
    return result;
  }

  /**
   * provider-journeys 1: a catalogue item becomes a row of the pharmacy's inventory when the pharmacy prices an order line
   * with it (a new pharmacy has no inventory to answer from). The row takes the catalogue's names, sku and reference price
   * (D-12: the SFDA price, else the catalogue price; the pharmacy's own price is the line's override and is flagged when it
   * is above the reference) and the quantity offered as stock. An existing row for that item is made available with at
   * least that stock. Returns the row id, or undefined when the line names no catalogue item.
   */
  private async adoptCatalogueItem(userId: string, orderItem: any, input: ProviderOfferItemInput): Promise<string | undefined> {
    const or: any[] = [];
    const pickedId = typeof input.medicine_id === 'string' && input.medicine_id.trim() ? input.medicine_id.trim() : null;
    if (pickedId) or.push({ id: pickedId });
    else if (input.availability === 'available') {
      if (orderItem.medicine_id) or.push({ id: String(orderItem.medicine_id) });
      const sku = orderItem.matched_sku;
      // the cart sends the catalogue id as the line's sku; a retail sku is matched too
      if (sku !== undefined && sku !== null && sku !== '') {
        or.push({ id: String(sku) });
        if (/^\d+$/.test(String(sku))) or.push({ sku: Number(sku) });
      }
    }
    if (!or.length) return undefined;
    const medicine: any = await this.connection.collection('medicines').findOne({ $or: or, is_deleted: { $ne: true } }, { projection: CATALOGUE_PROJECTION });
    if (!medicine) {
      if (pickedId) throw new BadRequestException('catalogue_item_not_found');
      return undefined;
    }
    const override = Number(input.unit_price_override);
    const price = cataloguePrice(medicine) ?? (Number.isFinite(override) && override > 0 ? Math.round(override * 100) / 100 : null);
    if (price === null) throw new BadRequestException('price_required');
    const qty = Math.max(1, Math.floor(Number(input.qty_offered) || Number(orderItem.qty) || 1));
    const sku = catalogueSku(medicine);
    const existing: any = await this.inventory.findOne({ provider_account_id: userId, sku }).lean();
    if (existing) {
      await this.inventory.updateOne({ id: existing.id, provider_account_id: userId }, {
        // an expired row stays expired (the availability check below refuses it); nothing here dates it again
        $set: { available: true, medicine_id: medicine.id },
        $max: { stock: qty },
      });
      return existing.id;
    }
    const created: any = await this.inventory.create({
      id: uuidv4(),
      provider_account_id: userId,
      sku,
      medicine_id: medicine.id,
      name_ar: medicine.name_ar || medicine.name_en || sku,
      name_en: medicine.name_en,
      barcode: medicine.barcode,
      generic_name: medicine.generic_name || medicine.active_ingredient,
      form: medicine.form,
      dosage: medicine.strength,
      pack_size: medicine.package_size,
      stock: qty,
      price,
      currency: 'SAR',
      available: true,
      notes: 'added from the catalogue when pricing an order line',
    });
    return created.id;
  }

  /**
   * D-12 (owner decision 12, revised 2026-10-10): the catalogue price (`sfda_price`) is a reference,
   * not a block. A line priced above it is accepted and flagged (the pharmacy is warned, the admin is
   * told); a line that maps to no catalogue item (cosmetics, local items, photo lines) is kept and
   * marked `not_verified`. Mapping: the inventory row's `medicine_id`, else its sku against the
   * catalogue id (items added from the catalogue) or the catalogue sku (stored as a number or a string).
   */
  private async markCataloguePrice(line: any, inventoryItem: any) {
    const sku = inventoryItem.sku;
    const or: any[] = [];
    if (inventoryItem.medicine_id) or.push({ id: String(inventoryItem.medicine_id) });
    if (sku !== undefined && sku !== null && sku !== '') {
      // provider-app ActiveInventoryScreen adds a catalogue item with sku = the catalogue medicine id (issue 331):
      // without this match every such line was "not verified" and the ceiling never applied
      or.push({ id: String(sku) });
      or.push({ sku: String(sku) });
      if (/^\d+$/.test(String(sku))) or.push({ sku: Number(sku) });
    }
    const medicine: any = or.length
      ? await this.connection.collection('medicines').findOne({ $or: or, is_deleted: { $ne: true } }, { projection: { _id: 0, id: 1, sku: 1, sfda_price: 1 } })
      : null;
    const ceiling = Number(medicine?.sfda_price);
    if (!medicine || !Number.isFinite(ceiling) || ceiling <= 0) {
      line.price_check = 'not_verified';
      return;
    }
    line.medicine_id = medicine.id;
    line.price_check = 'verified';
    if (Number(line.unit_price) > ceiling) {
      line.above_catalogue_price = true;
      line.catalogue_price = ceiling;
    }
  }

  /**
   * D-12: the admin review list holds one row per offer (kept current as the draft changes and on
   * submit) and the admin gets one notice per offer with a line above the catalogue price.
   * A draft with nothing to check clears its open row.
   */
  private async reportPriceReview(offer: any, orderId: string) {
    const reviews = this.connection.collection('pharmacy_price_reviews');
    const lines = (offer.items || []).filter((i: any) => i.above_catalogue_price === true || i.price_check === 'not_verified');
    if (!lines.length) {
      await reviews.deleteOne({ offer_id: offer.id, status: 'open' });
      return;
    }
    const now = new Date();
    const res: any = await reviews.findOneAndUpdate(
      { offer_id: offer.id },
      {
        $set: {
          order_id: orderId, offer_version: offer.version, offer_status: offer.status, pharmacy_account_id: offer.pharmacy_account_id,
          lines: lines.map((i: any) => ({
            order_item_id: i.order_item_id, medicine_id: i.medicine_id || null, sku: i.sku ?? null, name_ar: i.name_ar ?? null,
            reason: i.above_catalogue_price ? 'price_above_catalogue' : 'not_verified',
            catalogue_price: i.catalogue_price ?? null, offered_price: i.unit_price ?? null,
          })),
          status: 'open', updatedAt: now,
        },
        $setOnInsert: { id: uuidv4(), createdAt: now },
      },
      { upsert: true, returnDocument: 'after' },
    );
    const reviewId = (res?.value ?? res)?.id;
    if (lines.some((i: any) => i.above_catalogue_price === true)) {
      await this.connection.collection('notifications').updateOne(
        { role: 'admin', type: 'pharmacy_price_review', 'body.offer_id': offer.id },
        { $setOnInsert: { id: uuidv4(), user_id: 'admin', role: 'admin', type: 'pharmacy_price_review', title_key: 'admin.pharmacy.price_above_catalogue',
          body: { order_id: orderId, offer_id: offer.id, review_id: reviewId }, read: false, createdAt: now } },
        { upsert: true },
      );
    }
  }

  private async serverQuote(userId: string, order: any, inputs: ProviderOfferItemInput[], preparationMinutes?: number) {
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
    // R6-4: delivery fee comes from the saved platform pricing (admin config-portal).
    let deliveryFee = 0;
    let feeSource = 'no_active_server_delivery_policy';
    try {
      const fees = await this.pricing?.platformFees();
      if (fees && Number.isFinite(fees.delivery_fee) && fees.delivery_fee > 0) {
        deliveryFee = Math.round(fees.delivery_fee * 100) / 100;
        feeSource = 'platform_pricing_config';
      }
    } catch { /* quote never fails on pricing config */ }
    // #507: the preparation time is the pharmacy's own estimate when it gives one; without it there is none (the
    // patient sees no time and "fastest" sorts it last), never a number computed from the line count.
    const prep = Number(preparationMinutes);
    const estimatedPreparationMinutes = Number.isInteger(prep) && prep >= 5 && prep <= 240 ? prep : null;
    return {
      items,
      totals: { subtotal: Math.round(subtotal * 100) / 100, delivery_fee: deliveryFee, total: Math.round((subtotal + deliveryFee) * 100) / 100, currency: 'SAR' },
      estimated_preparation_minutes: estimatedPreparationMinutes,
      fulfillment: {
        policy_status: 'unavailable_read_only',
        delivery_option: null,
        eta_minutes: null,
        delivery_fee_source: feeSource,
      },
    };
  }

  async previewQuote(user: any, orderId: string, body: ProviderOfferInput) {
    const { order } = await this.loadBroadcastForPharmacy(user, orderId);
    const quote = await this.serverQuote(user.id, order, body?.items || [], body?.preparation_minutes);
    return {
      ...quote,
      quote_ttl_seconds: Math.floor(OFFER_TTL_MS / 1000),
      quote_generated_at: new Date(),
      delivery_client_fields_ignored: Boolean(body?.delivery_option || body?.eta_minutes),
    };
  }

  async upsertDraft(user: any, orderId: string, body: ProviderOfferInput) {
    const { broadcast, order } = await this.loadBroadcastForPharmacy(user, orderId);
    const quote = await this.serverQuote(user.id, order, body?.items || [], body?.preparation_minutes);
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
      provider_note: typeof body?.provider_note === 'string' ? body.provider_note.slice(0, 500) : undefined,
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
    const saved = offer.toObject ? offer.toObject() : offer;
    await this.reportPriceReview(saved, orderId);
    return this.providerDto(saved);
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
    await this.reportPriceReview(offer, orderId);
    return this.providerDto(offer.toObject());
  }

  async listForPatient(user: any, orderId: string, includeClosed = false) {
    if (!user?.id) throw new ForbiddenException('patient_identity_required');
    const order: any = await this.orders.findOne({ id: orderId, patient_account_id: user.id }).lean();
    if (!order) throw new NotFoundException('order_not_found');
    const broadcast: any = await this.broadcasts.findOne({ order_id: orderId }).lean();
    // A-2: by default only the live offers the patient can choose (as before), so the clients' offer
    // count and live refresh stay right. ?include=closed adds expired and withdrawn offers, latest version per
    // pharmacy, so the client can show why one is gone. Drafts were never sent and are never returned.
    // AC-3 (agent commerce, acceptance case 7): offers are children of the order, and order
    // ownership is verified above — so scope by order_id, not by the denormalized
    // patient_account_id on each offer row. The extra condition hid submitted offers whose
    // row lacks the field (and hid them in the apps' offer screens too, same service).
    const all: any[] = await this.offers.find({ order_id: orderId, status: { $ne: 'draft' } })
      .sort({ version: -1, submitted_at: -1 }).lean();
    const seen = new Set<string>();
    const latest = all.filter((o) => !seen.has(o.pharmacy_account_id) && !!seen.add(o.pharmacy_account_id));
    const offers = includeClosed ? latest : latest.filter((o) => this.offerState(o, order) === 'submitted');
    return Promise.all(offers.map((offer) => this.patientDtoAsync(offer, order, broadcast)));
  }

  /** A-2: one state per offer — submitted (live), selected, expired or withdrawn. */
  private offerState(offer: any, order: any): 'submitted' | 'selected' | 'expired' | 'withdrawn' {
    if (offer.status === 'selected' || (order?.selected_offer_id && offer.id === order.selected_offer_id)) return 'selected';
    if (offer.status === 'cancelled') return 'withdrawn';
    if (offer.status === 'expired' || (offer.quote_expires_at && new Date(offer.quote_expires_at) <= new Date())) return 'expired';
    return 'submitted';
  }

  private async patientDtoAsync(offer: any, order: any, broadcast?: any) {
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
    // Needs-review #509: registered pharmacies carry business_name / legal_name (provider schema).
    const registeredName = profile?.business_name || profile?.legal_name || null;
    const pharmacyNameAr = profile?.display_name_ar || profile?.name_ar || registeredName;
    const pharmacyNameEn = profile?.display_name_en || profile?.name_en || registeredName;
    // Q-4: no constants. Insurance readiness from the profile (flag, or its accepted insurers); no cash on delivery
    // (owner decision 25); no delivery-time source exists, so the ETA is null and the clients hide it.
    const profileInsuranceReady: boolean | null = typeof profile?.insurance_ready === 'boolean' ? profile.insurance_ready
      : Array.isArray(profile?.accepted_insurance) ? profile.accepted_insurance.length > 0 : null;
    const state = this.offerState(offer, order);
    // The insurer's decision is made on the chosen offer, so its patient share is that offer's co-pay only.
    const share = order?.insurance_decision?.patient_share;
    const expectedCopay = state === 'selected' && order?.coverage_mode === 'insurance' && typeof share === 'number' ? share : null;
    return {
      ...base,
      // Shared governed contract: patient-app reads `lines` + status 'open' (a live offer it can choose).
      status: state === 'submitted' ? 'open' : state,
      offer_state: state,
      // A-2: the broadcast round the patient is waiting on, as stored; null when there is none.
      broadcast: broadcast ? {
        current_round: broadcast.current_round ?? null,
        current_radius_km: broadcast.current_radius_km ?? null,
        round_expires_at: broadcast.round_expires_at ?? null,
      } : null,
      pharmacy_accepts_insurance: profileInsuranceReady === true,
      expected_copay: expectedCopay,
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
      // #512: the server's clock with the expiry, so a client with a wrong clock can still count down correctly.
      server_time: new Date().toISOString(),
      insurance_ready: profileInsuranceReady,
      cod_allowed: false,
      quote_revision: Number(offer.version || 1),
      // Deterministic quote hash — identical to the one stored in
      // pricing_snapshot.hash at selection time.
      snapshot_hash: crypto
        .createHash('sha256')
        .update(JSON.stringify({ offer_id: offer.id, offer_version: offer.version, totals: offer.totals }))
        .digest('hex'),
      approx_distance_km: approx,
      approx_delivery: { eta_minutes: null, label_ar: null, label_en: null },
      provider_note: typeof offer.provider_note === 'string' ? offer.provider_note : null,
    };
  }

  // Inventory tracking is OPTIONAL per provider (default off — no-balances model).
  async tracksInventory(pharmacy_account_id: string): Promise<boolean> {
    try {
      const doc: any = await this.connection.collection('provider_settings').findOne({ provider_id: pharmacy_account_id });
      return doc?.inventory_tracking === true;
    } catch {
      return false;
    }
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
            selected = { offer: replayOffer, allocation: replayAllocation, next_status: order.status, replay: true };
            return;
          }
          throw new BadRequestException('another_offer_already_selected');
        }
        const offer: any = await this.offers.findOne({ id: offerId, order_id: orderId, patient_account_id: user.id, status: 'submitted', quote_expires_at: { $gt: now } }).session(session);
        if (!offer) throw new BadRequestException('offer_not_selectable');

        const tracking = await this.tracksInventory(offer.pharmacy_account_id);
        for (const item of offer.items.filter((item: any) => item.action !== 'unavailable')) {
          if (!tracking) continue;
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
          status: PharmacyAllocationState.PENDING_REVIEW, stock_reserved: tracking,
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
      // P5: tell the chosen pharmacy at once (push + in-app); best effort, never blocks the patient's choice.
      if (!selected.replay) await this.pharmacyNotif?.notifyPharmacyNewAllocation(selected.allocation);
      return { offer: this.patientDto(selected.offer), allocation_id: selected.allocation.id, next_status: selected.next_status };
    } finally {
      await session.endSession();
    }
  }

  private providerDto(offer: any) {
    const hasAboveCatalogue = (offer.items || []).some((item: any) => item.above_catalogue_price === true);
    return {
      id: offer.id, order_id: offer.order_id, status: offer.status, version: offer.version,
      items: offer.items, totals: offer.totals, quote_expires_at: offer.quote_expires_at,
      estimated_preparation_minutes: offer.estimated_preparation_minutes, fulfillment: offer.fulfillment || { policy_status: 'unavailable_read_only' }, pricing_source: offer.pricing_source,
      // D-12: a code the provider app translates (no sentence in one language).
      ...(hasAboveCatalogue ? { warnings: [{ code: 'price_above_catalogue' }] } : {}),
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
