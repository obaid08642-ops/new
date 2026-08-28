"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyOfferService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const event_bus_service_1 = require("../../events/event-bus.service");
const OFFER_TTL_MS = 10 * 60_000;
const ACTIVE_PHARMACY_STATUSES = ['approved', 'active'];
let PharmacyOfferService = class PharmacyOfferService {
    constructor(connection, offers, orders, allocations, broadcasts, inventory, accounts, bus) {
        this.connection = connection;
        this.offers = offers;
        this.orders = orders;
        this.allocations = allocations;
        this.broadcasts = broadcasts;
        this.inventory = inventory;
        this.accounts = accounts;
        this.bus = bus;
    }
    async assertActivePharmacy(user) {
        if (!user?.id)
            throw new common_1.ForbiddenException('provider_identity_required');
        const account = await this.accounts.findOne({
            id: user.id,
            provider_type: 'pharmacy',
            status: { $in: ACTIVE_PHARMACY_STATUSES },
        }).lean();
        if (!account)
            throw new common_1.ForbiddenException('approved_pharmacy_account_required');
        return account;
    }
    async loadBroadcastForPharmacy(user, orderId) {
        await this.assertActivePharmacy(user);
        const broadcast = await this.broadcasts.findOne({ order_id: orderId }).lean();
        if (!broadcast)
            throw new common_1.NotFoundException('broadcast_not_found');
        if (broadcast.lock_state !== 'open')
            throw new common_1.BadRequestException('broadcast_not_accepting_offers');
        if (!Array.isArray(broadcast.notified_pharmacies) || !broadcast.notified_pharmacies.includes(user.id)) {
            throw new common_1.ForbiddenException('pharmacy_not_notified_for_broadcast');
        }
        const order = await this.orders.findOne({ id: orderId }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (order.selected_offer_id)
            throw new common_1.BadRequestException('offer_already_selected');
        return { broadcast, order };
    }
    async inventoryForOffer(userId, orderItem, input) {
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
        if (!inventoryId)
            throw new common_1.BadRequestException('inventory_item_id_required');
        const inventoryItem = await this.inventory.findOne({
            id: inventoryId,
            provider_account_id: userId,
            available: true,
            stock: { $gt: 0 },
            $or: [{ expiry_date: { $exists: false } }, { expiry_date: null }, { expiry_date: { $gt: new Date() } }],
        }).lean();
        if (!inventoryItem)
            throw new common_1.BadRequestException('inventory_item_not_available');
        if (input.availability === 'substitute') {
            const permitted = (inventoryItem.substitute_skus || []).includes(orderItem.matched_sku)
                || (!!inventoryItem.generic_name && inventoryItem.generic_name === orderItem.generic_name);
            if (!permitted)
                throw new common_1.BadRequestException('unapproved_substitute');
        }
        else if (orderItem.matched_sku && inventoryItem.sku !== orderItem.matched_sku) {
            throw new common_1.BadRequestException('inventory_item_does_not_match_order_item');
        }
        const requested = Math.max(1, Number(orderItem.qty) || 1);
        const offered = Math.min(requested, Math.max(1, Math.floor(Number(input.qty_offered) || requested)), Number(inventoryItem.stock));
        const result = {
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
        if (input.unit_price_override !== undefined && input.unit_price_override !== null) {
            const override = Number(input.unit_price_override);
            if (!Number.isFinite(override) || override <= 0 || override > 100000)
                throw new common_1.BadRequestException('invalid_price_override');
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
    async serverQuote(userId, order, inputs) {
        if (!Array.isArray(inputs) || inputs.length === 0)
            throw new common_1.BadRequestException('offer_items_required');
        const byOrderItem = new Map(inputs.map((item) => [item.order_item_id, item]));
        if (byOrderItem.size !== order.items.length || order.items.some((item) => !byOrderItem.has(item.id))) {
            throw new common_1.BadRequestException('offer_must_cover_every_order_item');
        }
        const items = [];
        for (const orderItem of order.items) {
            items.push(await this.inventoryForOffer(userId, orderItem, byOrderItem.get(orderItem.id)));
        }
        const subtotal = items.reduce((sum, item) => sum + (item.action === 'unavailable' ? 0 : item.unit_price * item.qty_offered), 0);
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
    async previewQuote(user, orderId, body) {
        const { order } = await this.loadBroadcastForPharmacy(user, orderId);
        const quote = await this.serverQuote(user.id, order, body?.items || []);
        return {
            ...quote,
            quote_ttl_seconds: Math.floor(OFFER_TTL_MS / 1000),
            quote_generated_at: new Date(),
            delivery_client_fields_ignored: Boolean(body?.delivery_option || body?.eta_minutes),
        };
    }
    async upsertDraft(user, orderId, body) {
        const { broadcast, order } = await this.loadBroadcastForPharmacy(user, orderId);
        const quote = await this.serverQuote(user.id, order, body?.items || []);
        const now = new Date();
        const prior = await this.offers.findOne({ order_id: orderId, pharmacy_account_id: user.id, status: { $in: ['draft', 'submitted'] } }).lean();
        if (prior?.status === 'submitted')
            throw new common_1.BadRequestException('submitted_offer_cannot_be_edited_create_new_version');
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
        const offer = prior
            ? await this.offers.findOneAndUpdate({ id: prior.id, status: 'draft' }, { $set: values }, { new: true })
            : await this.offers.create({ id: (0, uuid_1.v4)(), ...values, created_at: now, timeline: [{ ts: now, event: 'draft_created', by: user.id }] });
        return this.providerDto(offer.toObject ? offer.toObject() : offer);
    }
    async submitDraft(user, orderId, offerId) {
        await this.assertActivePharmacy(user);
        const now = new Date();
        const offer = await this.offers.findOneAndUpdate({ id: offerId, order_id: orderId, pharmacy_account_id: user.id, status: 'draft', quote_expires_at: { $gt: now } }, { $set: { status: 'submitted', submitted_at: now, updated_by: user.id }, $push: { timeline: { ts: now, event: 'submitted', by: user.id } } }, { new: true });
        if (!offer)
            throw new common_1.BadRequestException('offer_not_submittable');
        const overridden = (offer.items || []).filter((item) => item.price_source === 'provider_override');
        if (overridden.length) {
            await this.connection.collection('pharmacy_price_override_audit').insertMany(overridden.map((item) => ({
                id: (0, uuid_1.v4)(),
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
    async listForPatient(user, orderId) {
        if (!user?.id)
            throw new common_1.ForbiddenException('patient_identity_required');
        const order = await this.orders.findOne({ id: orderId, patient_account_id: user.id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        const offers = await this.offers.find({ order_id: orderId, patient_account_id: user.id, status: 'submitted', quote_expires_at: { $gt: new Date() } })
            .sort({ submitted_at: -1 }).lean();
        return Promise.all(offers.map((offer) => this.patientDtoAsync(offer, order)));
    }
    async patientDtoAsync(offer, order) {
        const base = this.patientDto(offer);
        const profile = await this.connection.collection('provider_profiles').findOne({ account_id: offer.pharmacy_account_id });
        let approx = null;
        const pg = profile?.geo;
        const og = order?.delivery_address?.geo;
        if (pg && og && Number.isFinite(Number(pg.lat)) && Number.isFinite(Number(og.lat))) {
            const toRad = (v) => (v * Math.PI) / 180;
            const dLat = toRad(Number(og.lat) - Number(pg.lat));
            const dLng = toRad(Number(og.lng) - Number(pg.lng));
            const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(Number(pg.lat))) * Math.cos(toRad(Number(og.lat))) * Math.sin(dLng / 2) ** 2;
            const d = 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            if (Number.isFinite(d))
                approx = Math.round(d * 2) / 2;
        }
        return {
            ...base,
            pharmacy_name_ar: profile?.display_name_ar || profile?.name_ar || null,
            pharmacy_name_en: profile?.display_name_en || profile?.name_en || null,
            approx_distance_km: approx,
            approx_delivery: { eta_minutes: 60, label_ar: 'خلال ساعة تقريباً', label_en: 'Approximately within 1 hour' },
        };
    }
    async selectByPatient(user, orderId, offerId, idempotencyKey) {
        if (!user?.id)
            throw new common_1.ForbiddenException('patient_identity_required');
        if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || ''))) {
            throw new common_1.BadRequestException('idempotency_key_required');
        }
        const session = await this.connection.startSession();
        try {
            let selected;
            await session.withTransaction(async () => {
                const now = new Date();
                const order = await this.orders.findOne({ id: orderId, patient_account_id: user.id }).session(session);
                if (!order)
                    throw new common_1.NotFoundException('order_not_found');
                if (order.selected_offer_id) {
                    if (order.selected_offer_id === offerId && order.offer_selection_idempotency_key === idempotencyKey) {
                        const replayOffer = await this.offers.findOne({ id: offerId }).session(session);
                        const replayAllocation = await this.allocations.findOne({ id: order.selected_allocation_id }).session(session);
                        if (!replayOffer || !replayAllocation)
                            throw new common_1.BadRequestException('selection_replay_incomplete');
                        selected = { offer: replayOffer, allocation: replayAllocation, next_status: order.status };
                        return;
                    }
                    throw new common_1.BadRequestException('another_offer_already_selected');
                }
                const offer = await this.offers.findOne({ id: offerId, order_id: orderId, patient_account_id: user.id, status: 'submitted', quote_expires_at: { $gt: now } }).session(session);
                if (!offer)
                    throw new common_1.BadRequestException('offer_not_selectable');
                for (const item of offer.items.filter((item) => item.action !== 'unavailable')) {
                    const reserved = await this.inventory.findOneAndUpdate({ id: item.inventory_item_id, provider_account_id: offer.pharmacy_account_id, available: true, stock: { $gte: item.qty_offered } }, { $inc: { stock: -item.qty_offered } }, { new: true, session });
                    if (!reserved)
                        throw new common_1.BadRequestException('offer_stock_changed_requote_required');
                }
                const paymentMethod = String(order.payment_method || order.payment?.method || (order.insurance_details ? 'insurance' : 'cash')).toLowerCase();
                const nextStatus = paymentMethod === 'insurance'
                    ? pharmacy_schema_1.PharmacyOrderState.INSURANCE_DECISION_PENDING
                    : paymentMethod === 'cod'
                        ? pharmacy_schema_1.PharmacyOrderState.COD_DUE_ON_DELIVERY
                        : pharmacy_schema_1.PharmacyOrderState.CASH_CARD_PAYMENT_PENDING;
                const allocation = await this.allocations.create([{
                        id: (0, uuid_1.v4)(), order_id: orderId, pharmacy_account_id: offer.pharmacy_account_id,
                        offer_id: offer.id, offer_version: offer.version,
                        status: pharmacy_schema_1.PharmacyAllocationState.PENDING_REVIEW,
                        items: offer.items.map((item) => ({ id: (0, uuid_1.v4)(), order_item_id: item.order_item_id, action: item.action, inventory_id: item.inventory_item_id, sku: item.sku, name: item.name_ar || item.name_en, qty_requested: item.qty_requested, qty_offered: item.qty_offered, unit_price: item.unit_price, updated_at: now })),
                        totals: offer.totals, estimated_preparation_minutes: offer.estimated_preparation_minutes,
                        timeline: [{ ts: now, event: 'created_after_patient_offer_selection', by: user.id, meta: { offer_id: offer.id, offer_version: offer.version } }],
                    }], { session });
                await this.offers.updateOne({ id: offer.id, status: 'submitted' }, { $set: { status: 'selected', selected_at: now, selected_by_patient_account_id: user.id, allocation_id: allocation[0].id } }, { session });
                const orderUpdate = await this.orders.updateOne({ id: orderId, patient_account_id: user.id, $or: [{ selected_offer_id: { $exists: false } }, { selected_offer_id: null }] }, {
                    $set: {
                        selected_offer_id: offer.id,
                        selected_offer_version: offer.version,
                        offer_selection_idempotency_key: idempotencyKey,
                        selected_allocation_id: allocation[0].id,
                        status: nextStatus,
                        totals: offer.totals,
                        pricing_snapshot: { offer_id: offer.id, offer_version: offer.version, totals: offer.totals, captured_at: now },
                    },
                    $push: { timeline: { ts: now, event: 'patient_offer_selected', by: user.id, meta: { offer_id: offer.id, offer_version: offer.version, payment_method: paymentMethod } } },
                }, { session });
                if ((orderUpdate?.modifiedCount ?? orderUpdate?.nModified ?? 0) !== 1) {
                    throw new common_1.BadRequestException('offer_selection_conflict');
                }
                selected = { offer, allocation: allocation[0], next_status: nextStatus };
            });
            await this.bus.emit({
                type: 'pharmacy.offer.selected', entity_type: 'pharmacy_offer', entity_id: offerId,
                actor_account_id: user.id, actor_role: 'patient', reason_code: 'patient_explicit_selection', meta: { order_id: orderId },
            });
            return { offer: this.patientDto(selected.offer), allocation_id: selected.allocation.id, next_status: selected.next_status };
        }
        finally {
            await session.endSession();
        }
    }
    providerDto(offer) {
        return {
            id: offer.id, order_id: offer.order_id, status: offer.status, version: offer.version,
            items: offer.items, totals: offer.totals, quote_expires_at: offer.quote_expires_at,
            estimated_preparation_minutes: offer.estimated_preparation_minutes, fulfillment: offer.fulfillment || { policy_status: 'unavailable_read_only' }, pricing_source: offer.pricing_source,
        };
    }
    patientDto(offer) {
        return {
            id: offer.id, pharmacy_account_id: offer.pharmacy_account_id, version: offer.version,
            items: offer.items.map((item) => ({ order_item_id: item.order_item_id, action: item.action, qty_requested: item.qty_requested, qty_offered: item.qty_offered, unit_price: item.unit_price, currency: item.currency, substitute: item.action === 'substitute' ? { sku: item.sku, name_ar: item.name_ar, name_en: item.name_en } : undefined })),
            totals: offer.totals, quote_expires_at: offer.quote_expires_at,
            estimated_preparation_minutes: offer.estimated_preparation_minutes,
            fulfillment: offer.fulfillment || { policy_status: 'unavailable_read_only' },
        };
    }
};
exports.PharmacyOfferService = PharmacyOfferService;
exports.PharmacyOfferService = PharmacyOfferService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(1, (0, mongoose_1.InjectModel)('PharmacyOffer')),
    __param(2, (0, mongoose_1.InjectModel)('PharmacyOrder')),
    __param(3, (0, mongoose_1.InjectModel)('PharmacyAllocation')),
    __param(4, (0, mongoose_1.InjectModel)('PharmacyBroadcast')),
    __param(5, (0, mongoose_1.InjectModel)('PharmacyInventoryItem')),
    __param(6, (0, mongoose_1.InjectModel)('ProviderAccount')),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        event_bus_service_1.EventBusService])
], PharmacyOfferService);
//# sourceMappingURL=pharmacy-offer.service.js.map