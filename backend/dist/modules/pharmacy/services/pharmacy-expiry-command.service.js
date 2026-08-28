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
exports.PharmacyExpiryCommandService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const pharmacy_schema_1 = require("../schemas/pharmacy.schema");
const pharmacy_broadcast_service_1 = require("./pharmacy-broadcast.service");
const LEASE_MS = 60_000;
const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 100;
let PharmacyExpiryCommandService = class PharmacyExpiryCommandService {
    constructor(connection, offers, broadcasts, orders, broadcastService) {
        this.connection = connection;
        this.offers = offers;
        this.broadcasts = broadcasts;
        this.orders = orders;
        this.broadcastService = broadcastService;
    }
    limit(value) {
        const parsed = Number(value ?? DEFAULT_LIMIT);
        if (!Number.isInteger(parsed) || parsed < 1 || parsed > MAX_LIMIT)
            throw new common_1.BadRequestException(`expiry_limit_must_be_integer_1_to_${MAX_LIMIT}`);
        return parsed;
    }
    modified(result) { return Number(result?.modifiedCount ?? result?.nModified ?? result?.n ?? 0) === 1; }
    claimFilter(id, dueField, now) {
        return { id, [dueField]: { $lte: now }, $or: [{ expiry_claim: { $exists: false } }, { 'expiry_claim.lease_expires_at': { $lte: now } }] };
    }
    async withTransaction(work) {
        const session = await this.connection.startSession();
        try {
            await session.withTransaction(async () => work(session));
        }
        finally {
            await session.endSession();
        }
    }
    async upsertOutbox(event, now, session) {
        try {
            await this.connection.collection('domain_outbox').updateOne({ aggregate_type: 'pharmacy', aggregate_id: event.aggregate_id, event_type: event.type, idempotency_key: event.idempotency_key }, { $setOnInsert: { aggregate_type: 'pharmacy', aggregate_id: event.aggregate_id, event_type: event.type, idempotency_key: event.idempotency_key, payload: event.payload, state: 'pending', created_at: now } }, { upsert: true, session });
        }
        catch (error) {
            if (Number(error?.code) === 11000)
                return;
            throw error;
        }
    }
    async expireOffer(candidate, now) {
        const token = (0, uuid_1.v4)();
        const lease = new Date(now.getTime() + LEASE_MS);
        const claimed = await this.offers.findOneAndUpdate({ ...this.claimFilter(candidate.id, 'quote_expires_at', now), status: { $in: ['draft', 'submitted'] } }, { $set: { expiry_claim: { token, claimed_at: now, lease_expires_at: lease } } }, { new: true }).lean();
        if (!claimed)
            return 'claimed';
        await this.withTransaction(async (session) => {
            const result = await this.offers.updateOne({ id: claimed.id, status: { $in: ['draft', 'submitted'] }, 'expiry_claim.token': token, quote_expires_at: { $lte: now } }, { $set: { status: 'expired', expired_at: now }, $unset: { expiry_claim: 1 }, $push: { timeline: { ts: now, event: 'expired_by_durable_command', meta: { command: 'expireDuePharmacyOffers' } } } }, { session });
            if (!this.modified(result))
                throw new common_1.BadRequestException('offer_expiry_claim_lost');
            await this.upsertOutbox({ type: 'pharmacy.offer.expired', aggregate_id: claimed.order_id, idempotency_key: `pharmacy-offer-expired:${claimed.id}:${claimed.version}`, payload: { offer_id: claimed.id, order_id: claimed.order_id, pharmacy_account_id: claimed.pharmacy_account_id, quote_expires_at: claimed.quote_expires_at } }, now, session);
        });
        return 'expired';
    }
    async createRecipientIntent(broadcast, recipientId, round, now, session) {
        try {
            const result = await this.connection.collection('pharmacy_broadcast_recipients').updateOne({ broadcast_id: broadcast.id, pharmacy_account_id: recipientId }, { $setOnInsert: { broadcast_id: broadcast.id, order_id: broadcast.order_id, pharmacy_account_id: recipientId, first_notified_round: round, created_at: now } }, { upsert: true, session });
            const inserted = Number(result?.upsertedCount ?? (result?.upsertedId ? 1 : 0)) === 1;
            if (!inserted)
                return false;
        }
        catch (error) {
            if (Number(error?.code) === 11000)
                return false;
            throw error;
        }
        await this.upsertOutbox({
            type: 'pharmacy.broadcast.recipient_added', aggregate_id: broadcast.order_id,
            idempotency_key: `pharmacy-broadcast-recipient:${broadcast.id}:${recipientId}`,
            payload: { broadcast_id: broadcast.id, order_id: broadcast.order_id, pharmacy_account_id: recipientId, round },
        }, now, session);
        return true;
    }
    async closeBroadcast(claimed, token, now, reason) {
        await this.withTransaction(async (session) => {
            const result = await this.broadcasts.updateOne({ id: claimed.id, lock_state: 'open', 'expiry_claim.token': token, round_expires_at: { $lte: now } }, { $set: { lock_state: 'closed' }, $unset: { expiry_claim: 1, round_expires_at: 1 }, $push: { timeline: { ts: now, event: 'broadcast_closed_by_durable_command', meta: { selection_required: true, reason } } } }, { session });
            if (!this.modified(result))
                throw new common_1.BadRequestException('broadcast_expiry_claim_lost');
            await this.orders.updateOne({ id: claimed.order_id, $or: [{ selected_offer_id: { $exists: false } }, { selected_offer_id: null }] }, { $set: { status: pharmacy_schema_1.PharmacyOrderState.MANUAL_REVIEW }, $push: { timeline: { ts: now, event: 'broadcast_expired_manual_review', meta: { broadcast_id: claimed.id, reason } } } }, { session });
            await this.upsertOutbox({
                type: 'pharmacy.broadcast.closed', aggregate_id: claimed.order_id,
                idempotency_key: `pharmacy-broadcast-closed:${claimed.id}:${claimed.current_round}`,
                payload: { broadcast_id: claimed.id, order_id: claimed.order_id, current_round: claimed.current_round, selection_required: true, reason },
            }, now, session);
        });
    }
    async expireBroadcast(candidate, now) {
        const token = (0, uuid_1.v4)();
        const lease = new Date(now.getTime() + LEASE_MS);
        const claimed = await this.broadcasts.findOneAndUpdate({ ...this.claimFilter(candidate.id, 'round_expires_at', now), lock_state: 'open' }, { $set: { expiry_claim: { token, claimed_at: now, lease_expires_at: lease } } }, { new: true }).lean();
        if (!claimed)
            return { outcome: 'claimed', recipient_intents: 0 };
        let stages;
        try {
            stages = await this.broadcastService.getBroadcastStages();
        }
        catch (error) {
            if (error instanceof common_1.ServiceUnavailableException || String(error?.message).includes('validated_pharmacy_broadcast_policy_required')) {
                await this.closeBroadcast(claimed, token, now, 'validated_broadcast_policy_unavailable');
                return { outcome: 'closed', recipient_intents: 0 };
            }
            throw error;
        }
        const nextStage = stages[Number(claimed.current_round || 1)];
        if (!nextStage) {
            await this.closeBroadcast(claimed, token, now, 'final_round_elapsed_without_selected_offer');
            return { outcome: 'closed', recipient_intents: 0 };
        }
        const order = await this.orders.findOne({ id: claimed.order_id }).lean();
        const eligible = await this.broadcastService.findEligiblePharmaciesWithin(order?.delivery_address?.geo, nextStage.radius_km);
        const knownRecipients = new Set(Array.isArray(claimed.notified_pharmacies) ? claimed.notified_pharmacies : []);
        const candidateRecipients = eligible.map((profile) => String(profile.account_id)).filter((accountId) => accountId && !knownRecipients.has(accountId));
        const nextRound = Number(claimed.current_round || 1) + 1;
        const deadline = new Date(now.getTime() + nextStage.timeout_seconds * 1000);
        let recipientIntents = 0;
        await this.withTransaction(async (session) => {
            const uniqueRecipients = [];
            for (const recipientId of candidateRecipients) {
                if (await this.createRecipientIntent(claimed, recipientId, nextRound, now, session))
                    uniqueRecipients.push(recipientId);
            }
            const result = await this.broadcasts.updateOne({ id: claimed.id, lock_state: 'open', 'expiry_claim.token': token, round_expires_at: { $lte: now } }, { $set: { current_round: nextRound, current_radius_km: nextStage.radius_km, round_expires_at: deadline }, $addToSet: { notified_pharmacies: { $each: uniqueRecipients } }, $unset: { expiry_claim: 1 }, $push: { timeline: { ts: now, event: 'round_advanced_by_durable_command', meta: { round: nextRound, radius_km: nextStage.radius_km, round_expires_at: deadline, recipient_intents: uniqueRecipients.length } } } }, { session });
            if (!this.modified(result))
                throw new common_1.BadRequestException('broadcast_expiry_claim_lost');
            await this.upsertOutbox({
                type: 'pharmacy.broadcast.round_advanced', aggregate_id: claimed.order_id,
                idempotency_key: `pharmacy-broadcast-round:${claimed.id}:${nextRound}`,
                payload: { broadcast_id: claimed.id, order_id: claimed.order_id, prior_round: claimed.current_round, next_round: nextRound, recipient_intents: uniqueRecipients.length },
            }, now, session);
            recipientIntents = uniqueRecipients.length;
        });
        return { outcome: 'advanced', recipient_intents: recipientIntents };
    }
    async expireDuePharmacyOffers(now = new Date(), cursor = {}, requestedLimit) {
        const limit = this.limit(requestedLimit);
        const offerRows = await this.offers.find({ status: { $in: ['draft', 'submitted'] }, quote_expires_at: { $lte: now }, ...(cursor.offer_id ? { id: { $gt: cursor.offer_id } } : {}) }).sort({ id: 1 }).limit(limit).lean();
        const broadcastRows = await this.broadcasts.find({ lock_state: 'open', round_expires_at: { $lte: now }, ...(cursor.broadcast_id ? { id: { $gt: cursor.broadcast_id } } : {}) }).sort({ id: 1 }).limit(limit).lean();
        const result = { now, scanned_offers: offerRows.length, expired_offers: 0, scanned_broadcasts: broadcastRows.length, advanced_rounds: 0, closed_broadcasts: 0, recipient_intents: 0, skipped_claimed: 0, next_cursor: null };
        for (const offer of offerRows) {
            const outcome = await this.expireOffer(offer, now);
            if (outcome === 'expired')
                result.expired_offers++;
            else
                result.skipped_claimed++;
        }
        for (const broadcast of broadcastRows) {
            const outcome = await this.expireBroadcast(broadcast, now);
            if (outcome.outcome === 'advanced')
                result.advanced_rounds++;
            if (outcome.outcome === 'closed')
                result.closed_broadcasts++;
            if (outcome.outcome === 'claimed')
                result.skipped_claimed++;
            result.recipient_intents += outcome.recipient_intents;
        }
        if (offerRows.length === limit || broadcastRows.length === limit)
            result.next_cursor = { offer_id: offerRows.length ? offerRows[offerRows.length - 1].id : cursor.offer_id, broadcast_id: broadcastRows.length ? broadcastRows[broadcastRows.length - 1].id : cursor.broadcast_id };
        return result;
    }
};
exports.PharmacyExpiryCommandService = PharmacyExpiryCommandService;
exports.PharmacyExpiryCommandService = PharmacyExpiryCommandService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(1, (0, mongoose_1.InjectModel)('PharmacyOffer')),
    __param(2, (0, mongoose_1.InjectModel)('PharmacyBroadcast')),
    __param(3, (0, mongoose_1.InjectModel)('PharmacyOrder')),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        pharmacy_broadcast_service_1.PharmacyBroadcastService])
], PharmacyExpiryCommandService);
//# sourceMappingURL=pharmacy-expiry-command.service.js.map