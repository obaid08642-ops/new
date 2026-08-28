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
exports.PharmacyBroadcastService = void 0;
const common_1 = require("@nestjs/common");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const requests_schema_1 = require("../../provider/schemas/requests.schema");
const geo_engine_service_1 = require("../../provider/services/geo-engine.service");
const smart_split_service_1 = require("./smart-split.service");
const pharmacy_notification_service_1 = require("./pharmacy-notification.service");
const event_bus_service_1 = require("../../events/event-bus.service");
const pharmacy_shortage_service_1 = require("./pharmacy-shortage.service");
const pharmacy_chat_service_1 = require("./pharmacy-chat.service");
const redis_service_1 = require("../../redis/redis.service");
const pharmacyorder_repository_1 = require("./repositories/pharmacyorder.repository");
const pharmacyallocation_repository_1 = require("./repositories/pharmacyallocation.repository");
const pharmacybroadcast_repository_1 = require("./repositories/pharmacybroadcast.repository");
const pharmacyinventoryitem_repository_1 = require("./repositories/pharmacyinventoryitem.repository");
const provideraccountprofile_repository_1 = require("./repositories/provideraccountprofile.repository");
const provideravailability_repository_1 = require("./repositories/provideravailability.repository");
const systemconfig_repository_1 = require("./repositories/systemconfig.repository");
const drugrejectionlog_repository_1 = require("./repositories/drugrejectionlog.repository");
const medicine_repository_1 = require("./repositories/medicine.repository");
const REVIEW_TIMEOUT_MINUTES = 12;
let PharmacyBroadcastService = class PharmacyBroadcastService {
    constructor(orders, allocs, broadcasts, inv, profiles, avails, configs, rejections, medicines, geo, split, notif, bus, shortage, chatService, redisService) {
        this.orders = orders;
        this.allocs = allocs;
        this.broadcasts = broadcasts;
        this.inv = inv;
        this.profiles = profiles;
        this.avails = avails;
        this.configs = configs;
        this.rejections = rejections;
        this.medicines = medicines;
        this.geo = geo;
        this.split = split;
        this.notif = notif;
        this.bus = bus;
        this.shortage = shortage;
        this.chatService = chatService;
        this.redisService = redisService;
        this.logger = new common_1.Logger('PharmacyBroadcast');
    }
    async assertActiveNotifiedPharmacy(user, broadcast) {
        if (!user?.id)
            throw new common_1.ForbiddenException('pharmacy_identity_required');
        const account = await this.profiles.db.collection('provider_accounts').findOne({
            id: user.id, provider_type: 'pharmacy', status: { $in: ['approved', 'active'] },
        });
        if (!account)
            throw new common_1.ForbiddenException('approved_pharmacy_account_required');
        if (broadcast && (!Array.isArray(broadcast.notified_pharmacies) || !broadcast.notified_pharmacies.includes(user.id))) {
            throw new common_1.ForbiddenException('pharmacy_not_notified_for_broadcast');
        }
        return account;
    }
    providerBroadcastDto(broadcast, order) {
        const method = String(order?.payment_method || order?.payment?.method || (order?.insurance_details ? 'insurance' : 'cash')).toLowerCase();
        return {
            id: broadcast.id,
            order_id: broadcast.order_id,
            current_round: broadcast.current_round,
            current_radius_km: broadcast.current_radius_km,
            lock_state: broadcast.lock_state,
            offer_deadline_hint: broadcast.round_expires_at || null,
            payment_summary: { method, insurance_required: method === 'insurance' },
            items: (order?.items || []).map((item) => ({
                order_item_id: item.id,
                name_ar: item.name_ar || item.raw_name || null,
                name_en: item.name_en || null,
                qty_requested: Number(item.qty || 0),
                matched_sku: item.matched_sku || null,
            })),
        };
    }
    async getBroadcastStages() {
        const config = await this.configs.findOne({ key: 'pharmacy_broadcast_stages' }).lean();
        const stages = config?.value;
        const valid = Array.isArray(stages) && stages.length > 0 && stages.every((stage, index) => Number(stage?.stage) === index + 1 && Number.isFinite(Number(stage?.radius_km)) && Number(stage.radius_km) > 0 &&
            Number.isFinite(Number(stage?.timeout_seconds)) && Number(stage.timeout_seconds) > 0);
        if (!valid)
            throw new common_1.ServiceUnavailableException('validated_pharmacy_broadcast_policy_required');
        return stages.map((stage) => ({ stage: Number(stage.stage), radius_km: Number(stage.radius_km), timeout_seconds: Number(stage.timeout_seconds) }));
    }
    async start(order) {
        const existing = await this.broadcasts.findOne({ order_id: order.id });
        if (existing && existing.lock_state !== 'closed') {
            if (!Array.isArray(existing.notified_pharmacies) || existing.notified_pharmacies.length === 0 || order.status !== pharmacy_schema_1.PharmacyOrderState.BROADCASTING) {
                await this.broadcastRound(existing, order);
                if (order.status !== pharmacy_schema_1.PharmacyOrderState.BROADCASTING) {
                    order.status = pharmacy_schema_1.PharmacyOrderState.BROADCASTING;
                    order.timeline.push({ ts: new Date(), event: 'broadcasting_round_1_recovered', meta: { radius: existing.current_radius_km } });
                    await order.save();
                }
            }
            return existing;
        }
        const stages = await this.getBroadcastStages();
        const round1 = stages[0];
        const startedAt = new Date();
        const roundDeadline = new Date(startedAt.getTime() + (round1.timeout_seconds * 1000));
        const bc = await this.broadcasts.create({
            id: (0, uuid_1.v4)(),
            order_id: order.id,
            patient_account_id: order.patient_account_id,
            current_round: 1,
            current_radius_km: round1.radius_km,
            max_radius_km: stages[stages.length - 1].radius_km,
            round_radii_km: stages.map(s => s.radius_km),
            lock_state: 'open',
            round_expires_at: roundDeadline,
            timeline: [{ ts: startedAt, event: 'broadcast_started', meta: { radius: round1.radius_km, round_expires_at: roundDeadline } }],
        });
        await this.broadcastRound(bc, order);
        order.status = pharmacy_schema_1.PharmacyOrderState.BROADCASTING;
        order.timeline.push({ ts: new Date(), event: 'broadcasting_round_1', meta: { radius: round1.radius_km } });
        await order.save();
        return bc;
    }
    async broadcastRound(bc, order) {
        const center = order.delivery_address?.geo;
        const pharms = await this.findEligiblePharmaciesWithin(center, bc.current_radius_km);
        const alreadyNotified = new Set(Array.isArray(bc.notified_pharmacies) ? bc.notified_pharmacies : []);
        const candidates = pharms.map((pharmacy) => String(pharmacy.account_id)).filter((id) => id && !alreadyNotified.has(id));
        const now = new Date();
        const connection = this.broadcasts.model.db;
        const session = await connection.startSession();
        const inserted = [];
        try {
            await session.withTransaction(async () => {
                const recipients = connection.collection('pharmacy_broadcast_recipients');
                const outbox = connection.collection('domain_outbox');
                for (const pharmacyAccountId of candidates) {
                    try {
                        const membership = await recipients.updateOne({ broadcast_id: bc.id, pharmacy_account_id: pharmacyAccountId }, { $setOnInsert: { broadcast_id: bc.id, order_id: order.id, pharmacy_account_id: pharmacyAccountId, first_notified_round: bc.current_round, created_at: now } }, { upsert: true, session });
                        if (Number(membership?.upsertedCount ?? (membership?.upsertedId ? 1 : 0)) !== 1)
                            continue;
                    }
                    catch (error) {
                        if (Number(error?.code) === 11000)
                            continue;
                        throw error;
                    }
                    inserted.push(pharmacyAccountId);
                    try {
                        await outbox.updateOne({ aggregate_type: 'pharmacy', aggregate_id: order.id, event_type: 'pharmacy.broadcast.recipient_added', idempotency_key: `pharmacy-broadcast-recipient:${bc.id}:${pharmacyAccountId}` }, { $setOnInsert: { aggregate_type: 'pharmacy', aggregate_id: order.id, event_type: 'pharmacy.broadcast.recipient_added', idempotency_key: `pharmacy-broadcast-recipient:${bc.id}:${pharmacyAccountId}`, payload: { broadcast_id: bc.id, order_id: order.id, pharmacy_account_id: pharmacyAccountId, round: bc.current_round }, state: 'pending', created_at: now } }, { upsert: true, session });
                    }
                    catch (error) {
                        if (Number(error?.code) !== 11000)
                            throw error;
                    }
                }
                const result = await this.broadcasts.model.updateOne({ id: bc.id, lock_state: 'open' }, { $addToSet: { notified_pharmacies: { $each: inserted } }, $push: { timeline: { ts: now, event: 'round_recipients_recorded', meta: { round: bc.current_round, radius: bc.current_radius_km, new_pharmacies: inserted.length } } } }, { session });
                if (Number(result?.matchedCount ?? result?.n ?? 0) !== 1)
                    throw new common_1.BadRequestException('broadcast_recipient_transition_conflict');
            });
        }
        finally {
            await session.endSession();
        }
        bc.notified_pharmacies = Array.from(new Set([...(bc.notified_pharmacies || []), ...inserted]));
    }
    async claimHaveAll() {
        throw new common_1.BadRequestException('legacy_broadcast_acceptance_disabled_use_offer_draft');
    }
    async respondPartial() {
        throw new common_1.BadRequestException('legacy_broadcast_acceptance_disabled_use_offer_draft');
    }
    async respondReject(user, order_id, body) {
        await this.assertActiveNotifiedPharmacy(user);
        const bc = await this.broadcasts.findOne({ order_id });
        if (!bc)
            throw new common_1.NotFoundException('broadcast_not_found');
        await this.assertActiveNotifiedPharmacy(user, bc);
        if (bc.lock_state === 'locked')
            throw new common_1.BadRequestException('already_locked');
        bc.responses = bc.responses.filter(r => r.pharmacy_account_id !== user.id);
        bc.responses.push({ pharmacy_account_id: user.id, response: 'declined', items: [], responded_at: new Date() });
        bc.markModified('responses');
        bc.timeline.push({ ts: new Date(), event: 'declined', meta: { pharmacy_account_id: user.id, reason: body?.reason } });
        await bc.save();
        const order = await this.orders.findOne({ id: order_id });
        if (order) {
            for (const item of order.items) {
                const med = await this.medicines.findOne({ $or: [{ barcode: item.matched_sku }, { name_ar: item.raw_name }] });
                if (med) {
                    await this.shortage.logRejection(med.id, order_id, user.id);
                }
            }
        }
        return { ok: true };
    }
    async advanceRound(order_id, now = new Date()) {
        const bc = await this.broadcasts.findOne({ order_id });
        if (!bc)
            throw new common_1.NotFoundException('broadcast_not_found');
        if (bc.lock_state !== 'open')
            throw new common_1.BadRequestException(`cannot_advance_${bc.lock_state}`);
        if (!bc.round_expires_at || new Date(bc.round_expires_at).getTime() > now.getTime()) {
            throw new common_1.BadRequestException('broadcast_round_not_due');
        }
        const stages = await this.getBroadcastStages();
        const nextIdx = bc.current_round;
        if (nextIdx >= stages.length) {
            const order = await this.orders.findOne({ id: order_id });
            if (order) {
                return this.runBestPartialMatch(bc, order);
            }
            return this.fallbackSplit(order_id);
        }
        const nextStage = stages[nextIdx];
        const advancedAt = new Date();
        const nextDeadline = new Date(advancedAt.getTime() + (nextStage.timeout_seconds * 1000));
        bc.current_round = nextIdx + 1;
        bc.current_radius_km = nextStage.radius_km;
        bc.round_expires_at = nextDeadline;
        bc.timeline.push({ ts: advancedAt, event: 'round_advanced', meta: { round: bc.current_round, radius: bc.current_radius_km, round_expires_at: nextDeadline } });
        await bc.save();
        const order = await this.orders.findOne({ id: order_id });
        if (order)
            await this.broadcastRound(bc, order);
        return bc.toObject();
    }
    async runBestPartialMatch(bc, order) {
        bc.lock_state = 'closed';
        bc.timeline.push({ ts: new Date(), event: 'automatic_matching_disabled_selection_required' });
        await bc.save();
        if (!order.selected_offer_id) {
            order.status = pharmacy_schema_1.PharmacyOrderState.MANUAL_REVIEW;
            order.timeline.push({ ts: new Date(), event: 'no_auto_allocation_after_broadcast', meta: { broadcast_id: bc.id } });
            await order.save();
        }
        await this.notif.notifyPatientSplitCompleted(order).catch(() => null);
        return { broadcast: typeof bc.toObject === 'function' ? bc.toObject() : bc, selection_required: true, reason: 'automatic_allocation_disabled' };
    }
    async fallbackSplit(order_id) {
        const bc = await this.broadcasts.findOne({ order_id });
        const order = await this.orders.findOne({ id: order_id });
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        if (bc) {
            bc.lock_state = 'closed';
            bc.timeline.push({ ts: new Date(), event: 'fallback_split_disabled_manual_review' });
            await bc.save();
        }
        if (!order.selected_offer_id) {
            order.status = pharmacy_schema_1.PharmacyOrderState.MANUAL_REVIEW;
            order.timeline.push({ ts: new Date(), event: 'fallback_requires_manual_review', meta: { broadcast_id: bc?.id || null } });
            await order.save();
        }
        return { order_id, selection_required: true, reason: 'automatic_split_disabled' };
    }
    async findEligiblePharmaciesWithin(center, radius_km) {
        const accs = await this.profiles.db.collection('provider_accounts').find({ provider_type: 'pharmacy', status: { $in: ['approved', 'active'] } }).project({ id: 1 }).toArray();
        if (!accs.length || !Number.isFinite(Number(center?.lat)) || !Number.isFinite(Number(center?.lng)) || !Number.isFinite(Number(radius_km)) || Number(radius_km) <= 0)
            return [];
        const ids = accs.map((a) => a.id);
        const profs = await this.profiles.find({ account_id: { $in: ids }, provider_type: 'pharmacy' }).lean();
        const avs = await this.avails.find({ provider_account_id: { $in: ids }, status: { $in: [requests_schema_1.ProviderAvailabilityStatus.ACCEPTING_ORDERS, requests_schema_1.ProviderAvailabilityStatus.ONLINE] } }).lean();
        const okIds = new Set(avs.map(a => a.provider_account_id));
        const out = [];
        for (const p of profs) {
            if (!okIds.has(p.account_id))
                continue;
            if (!Number.isFinite(Number(p.geo?.lat)) || !Number.isFinite(Number(p.geo?.lng)))
                continue;
            const pharm = p;
            const providerRadius = Number(pharm.max_delivery_radius_km ?? pharm.delivery_radius_km);
            const policyDoc = await this.configs.findOne({ key: 'pharmacy_platform_radius_km' }).lean();
            const platformRadius = Number(policyDoc?.value);
            const effectiveRadius = Math.min(Number(radius_km), Number.isFinite(providerRadius) && providerRadius > 0 ? providerRadius : Number(radius_km), Number.isFinite(platformRadius) && platformRadius > 0 ? platformRadius : Number(radius_km));
            const d = this.geo.distanceKm({ lat: Number(p.geo.lat), lng: Number(p.geo.lng) }, center);
            if (Number.isFinite(d) && d <= effectiveRadius)
                out.push({ ...p, _distance: d });
        }
        return out;
    }
    async listForPharmacy(user) {
        await this.assertActiveNotifiedPharmacy(user);
        const bcs = await this.broadcasts.find({ notified_pharmacies: user.id, lock_state: { $in: ['open'] } }).sort({ createdAt: -1 }).lean();
        const orders = await this.orders.find({ id: { $in: bcs.map(b => b.order_id) } }).lean();
        const ordersMap = new Map(orders.map(o => [o.id, o]));
        return bcs.map((broadcast) => this.providerBroadcastDto(broadcast, ordersMap.get(broadcast.order_id)));
    }
    async detail(user, broadcast_id) {
        await this.assertActiveNotifiedPharmacy(user);
        const bc = await this.broadcasts.findOne({ id: broadcast_id }).lean();
        if (!bc)
            throw new common_1.NotFoundException('broadcast_not_found');
        await this.assertActiveNotifiedPharmacy(user, bc);
        const order = await this.orders.findOne({ id: bc.order_id }).lean();
        if (!order)
            throw new common_1.NotFoundException('order_not_found');
        return this.providerBroadcastDto(bc, order);
    }
    async expireStaleBroadcasts() {
        throw new common_1.ServiceUnavailableException('legacy_expiry_sweep_disabled_use_expire_due_command');
    }
};
exports.PharmacyBroadcastService = PharmacyBroadcastService;
exports.PharmacyBroadcastService = PharmacyBroadcastService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Inject)('PharmacyOrderRepository')),
    __param(1, (0, common_1.Inject)('PharmacyAllocationRepository')),
    __param(2, (0, common_1.Inject)('PharmacyBroadcastRepository')),
    __param(3, (0, common_1.Inject)('PharmacyInventoryItemRepository')),
    __param(4, (0, common_1.Inject)('ProviderAccountProfileRepository')),
    __param(5, (0, common_1.Inject)('ProviderAvailabilityRepository')),
    __param(6, (0, common_1.Inject)('SystemConfigRepository')),
    __param(7, (0, common_1.Inject)('DrugRejectionLogRepository')),
    __param(8, (0, common_1.Inject)('MedicineRepository')),
    __metadata("design:paramtypes", [pharmacyorder_repository_1.PharmacyOrderRepository,
        pharmacyallocation_repository_1.PharmacyAllocationRepository,
        pharmacybroadcast_repository_1.PharmacyBroadcastRepository,
        pharmacyinventoryitem_repository_1.PharmacyInventoryItemRepository,
        provideraccountprofile_repository_1.ProviderAccountProfileRepository,
        provideravailability_repository_1.ProviderAvailabilityRepository,
        systemconfig_repository_1.SystemConfigRepository,
        drugrejectionlog_repository_1.DrugRejectionLogRepository,
        medicine_repository_1.MedicineRepository,
        geo_engine_service_1.GeoEngineService,
        smart_split_service_1.SmartSplitService,
        pharmacy_notification_service_1.PharmacyNotificationService,
        event_bus_service_1.EventBusService,
        pharmacy_shortage_service_1.PharmacyShortageService,
        pharmacy_chat_service_1.PharmacyChatService,
        redis_service_1.RedisService])
], PharmacyBroadcastService);
//# sourceMappingURL=pharmacy-broadcast.service.js.map