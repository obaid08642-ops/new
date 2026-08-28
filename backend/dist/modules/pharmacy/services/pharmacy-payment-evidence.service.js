"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PharmacyPaymentEvidenceService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const crypto = __importStar(require("crypto"));
let PharmacyPaymentEvidenceService = class PharmacyPaymentEvidenceService {
    constructor(conn) {
        this.conn = conn;
    }
    async createPaymentIntent(user, orderId, idempotencyKey) {
        if (!user?.id)
            throw new common_1.ForbiddenException('patient_identity_required');
        if (!/^[A-Za-z0-9._:-]{16,128}$/.test(String(idempotencyKey || '')))
            throw new common_1.BadRequestException('idempotency_key_required');
        const order = await this.conn.collection('pharmacy_orders').findOne({ id: orderId, patient_account_id: user.id });
        if (!order)
            throw new common_1.NotFoundException('pharmacy_order_not_found');
        if (!order.selected_offer_id || !Number.isInteger(Number(order.selected_offer_version)) || !order.pricing_snapshot?.hash)
            throw new common_1.BadRequestException('selected_quote_required');
        if (['cancelled', 'expired'].includes(String(order.status)))
            throw new common_1.BadRequestException('payment_order_not_collectable');
        const paymentMethod = String(order.payment_method || '').toLowerCase();
        if (!['card', 'credit_card', 'moyasar'].includes(paymentMethod))
            throw new common_1.BadRequestException('card_payment_intent_required');
        const total = Math.round(Number(order.pricing_snapshot.totals?.total || 0) * 100) / 100;
        const currency = String(order.pricing_snapshot.totals?.currency || 'SAR').toUpperCase();
        const intents = this.conn.collection('pharmacy_payment_intents');
        const existing = await intents.findOne({ order_id: orderId, idempotency_key: idempotencyKey });
        if (existing)
            return { intent_id: existing.intent_id, status: existing.status, amount: existing.amount, currency: existing.currency, adapter: 'sandbox_disabled' };
        const intent = {
            intent_id: `pi_${crypto.randomUUID()}`, order_id: orderId, selected_offer_id: order.selected_offer_id,
            selected_offer_version: Number(order.selected_offer_version), quote_snapshot_hash: order.pricing_snapshot.hash,
            amount: total, currency, payer_account_id: user.id, idempotency_key: idempotencyKey,
            status: 'requires_payment', adapter: 'sandbox_disabled', createdAt: new Date(), updatedAt: new Date(),
        };
        try {
            await intents.insertOne(intent);
        }
        catch (err) {
            if (err?.code !== 11000)
                throw err;
            const replay = await intents.findOne({ order_id: orderId, idempotency_key: idempotencyKey });
            if (!replay)
                throw new common_1.ConflictException('payment_intent_conflict');
            return { intent_id: replay.intent_id, status: replay.status, amount: replay.amount, currency: replay.currency, adapter: 'sandbox_disabled' };
        }
        return { intent_id: intent.intent_id, status: intent.status, amount: intent.amount, currency: intent.currency, adapter: 'sandbox_disabled' };
    }
    async onMoyasarPaid(payload) {
        return this.recordVerifiedGatewayPayment('moyasar', payload);
    }
    async recordVerifiedGatewayPayment(gateway, payload) {
        const eventId = String(payload?.webhook_event_id || payload?.event_id || payload?.id || '').trim();
        const paymentId = String(payload?.gateway_payment_id || payload?.payment_id || payload?.id || '').trim();
        const metadata = payload?.metadata || payload?.meta || {};
        const orderId = String(metadata.order_id || payload?.order_id || payload?.booking_id || '').trim();
        const offerId = String(metadata.selected_offer_id || payload?.selected_offer_id || '').trim();
        const offerVersion = Number(metadata.selected_offer_version ?? payload?.selected_offer_version);
        const snapshotHash = String(metadata.quote_snapshot_hash || payload?.quote_snapshot_hash || '').trim();
        const payerId = String(metadata.payer_account_id || payload?.payer_account_id || '').trim();
        const currency = String(payload?.currency || metadata.currency || 'SAR').toUpperCase();
        const amountHalalas = Number(payload?.amount_halalas ?? payload?.amount_minor ?? NaN);
        if (!eventId || !paymentId || !orderId || !offerId || !Number.isInteger(offerVersion) || !snapshotHash || !payerId || !Number.isFinite(amountHalalas) || amountHalalas < 0) {
            throw new common_1.BadRequestException('payment_evidence_metadata_incomplete');
        }
        const amount = Math.round((amountHalalas / 100) * 100) / 100;
        const orders = this.conn.collection('pharmacy_orders');
        const order = await orders.findOne({ id: orderId });
        if (!order)
            throw new common_1.NotFoundException('pharmacy_order_not_found');
        if (String(order.patient_account_id) !== payerId)
            throw new common_1.BadRequestException('payment_payer_mismatch');
        if (String(order.selected_offer_id) !== offerId || Number(order.selected_offer_version) !== offerVersion)
            throw new common_1.BadRequestException('payment_selected_offer_mismatch');
        if (String(order.pricing_snapshot?.offer_id) !== offerId || Number(order.pricing_snapshot?.offer_version) !== offerVersion)
            throw new common_1.BadRequestException('payment_quote_binding_mismatch');
        if (String(order.pricing_snapshot?.hash || '') !== snapshotHash)
            throw new common_1.BadRequestException('payment_quote_hash_mismatch');
        if (String(order.pricing_snapshot?.totals?.currency || 'SAR').toUpperCase() !== currency)
            throw new common_1.BadRequestException('payment_currency_mismatch');
        const expected = Math.round(Number(order.pricing_snapshot?.totals?.total || 0) * 100) / 100;
        if (amount !== expected)
            throw new common_1.BadRequestException('payment_amount_mismatch');
        if (['cancelled', 'expired'].includes(String(order.status)))
            throw new common_1.BadRequestException('payment_order_not_collectable');
        const evidence = {
            order_id: orderId, selected_offer_id: offerId, selected_offer_version: offerVersion,
            quote_snapshot_hash: snapshotHash, amount, currency, payer_account_id: payerId,
            gateway, gateway_payment_id: paymentId, webhook_event_id: eventId,
            status: 'confirmed', confirmed_at: new Date(), updatedAt: new Date(),
            evidence_fingerprint: crypto.createHash('sha256').update(`${gateway}:${paymentId}:${eventId}:${orderId}:${offerId}:${offerVersion}:${snapshotHash}:${amount}:${currency}:${payerId}`).digest('hex'),
        };
        const collection = this.conn.collection('pharmacy_payment_evidence');
        try {
            await collection.updateOne({ gateway, gateway_payment_id: paymentId, webhook_event_id: eventId }, { $setOnInsert: { ...evidence, createdAt: new Date() } }, { upsert: true });
        }
        catch (err) {
            if (err?.code !== 11000)
                throw err;
            const existing = await collection.findOne({ gateway, gateway_payment_id: paymentId, webhook_event_id: eventId });
            if (!existing || existing.evidence_fingerprint !== evidence.evidence_fingerprint)
                throw new common_1.BadRequestException('payment_evidence_replay_conflict');
        }
        return { recorded: true, idempotent: true, order_id: orderId, gateway_payment_id: paymentId };
    }
};
exports.PharmacyPaymentEvidenceService = PharmacyPaymentEvidenceService;
__decorate([
    (0, event_emitter_1.OnEvent)('moyasar.payment.paid', { async: true }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], PharmacyPaymentEvidenceService.prototype, "onMoyasarPaid", null);
exports.PharmacyPaymentEvidenceService = PharmacyPaymentEvidenceService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection])
], PharmacyPaymentEvidenceService);
//# sourceMappingURL=pharmacy-payment-evidence.service.js.map