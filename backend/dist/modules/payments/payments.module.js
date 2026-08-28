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
exports.PaymentsModule = exports.PaymentsWebhookController = exports.PaymentsController = exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const transaction_schema_1 = require("../../schemas/transaction.schema");
const order_schema_1 = require("../../schemas/order.schema");
const lab_schema_1 = require("../../schemas/lab.schema");
const radiology_schema_1 = require("../../schemas/radiology.schema");
const home_care_schema_1 = require("../../schemas/home-care.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const insurance_engine_module_1 = require("../insurance-engine/insurance-engine.module");
const auth_guard_1 = require("../../common/auth.guard");
const workflow_engine_module_1 = require("../workflow-engine/workflow-engine.module");
const realtime_service_1 = require("../realtime/realtime.service");
const realtime_module_1 = require("../realtime/realtime.module");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const crypto = __importStar(require("crypto"));
function selectAdapter() {
    if (process.env.STRIPE_SECRET_KEY)
        return new StripeAdapter();
    if (process.env.TAP_API_KEY)
        return new TapAdapter();
    if (process.env.MOYASAR_API_KEY)
        return new MoyasarAdapter();
    throw new Error('NO_PAYMENT_GATEWAY_CONFIGURED');
}
class StripeAdapter {
    constructor() {
        this.name = 'stripe';
        this.base = 'https://api.stripe.com/v1';
    }
    headers() { return { Authorization: `Bearer ${process.env.STRIPE_SECRET_KEY}`, 'Content-Type': 'application/x-www-form-urlencoded' }; }
    async createIntent(o) {
        const body = new URLSearchParams({ amount: String(Math.round(o.amount * 100)), currency: (o.currency || 'sar').toLowerCase(), description: o.description || 'Nabd booking', 'automatic_payment_methods[enabled]': 'true' });
        const r = await fetch(`${this.base}/payment_intents`, { method: 'POST', headers: this.headers(), body });
        const j = await r.json();
        if (!r.ok)
            throw new Error(j.error?.message || 'stripe_intent_failed');
        return { intent_id: j.id, client_secret: j.client_secret };
    }
    async verify(id) {
        const r = await fetch(`${this.base}/payment_intents/${id}`, { headers: this.headers() });
        const j = await r.json();
        const map = { succeeded: 'paid', requires_payment_method: 'failed', canceled: 'cancelled', processing: 'pending' };
        return { status: map[j.status] || 'pending', charge_id: j.latest_charge, raw: j };
    }
    async refund(chargeId, amount) {
        const body = new URLSearchParams({ charge: chargeId, ...(amount ? { amount: String(Math.round(amount * 100)) } : {}) });
        const r = await fetch(`${this.base}/refunds`, { method: 'POST', headers: this.headers(), body });
        const j = await r.json();
        return { refunded: r.ok, raw: j };
    }
}
class TapAdapter {
    constructor() {
        this.name = 'tap';
        this.base = 'https://api.tap.company/v2';
    }
    headers() { return { Authorization: `Bearer ${process.env.TAP_API_KEY}`, 'Content-Type': 'application/json' }; }
    async createIntent(o) {
        const body = JSON.stringify({ amount: o.amount, currency: o.currency || 'SAR', description: o.description, source: { id: 'src_all' }, redirect: { url: process.env.PUBLIC_APP_URL || 'https://example.com/payment/return' } });
        const r = await fetch(`${this.base}/charges`, { method: 'POST', headers: this.headers(), body });
        const j = await r.json();
        if (!r.ok)
            throw new Error(j.errors?.[0]?.description || 'tap_intent_failed');
        return { intent_id: j.id, checkout_url: j.transaction?.url };
    }
    async verify(id) {
        const r = await fetch(`${this.base}/charges/${id}`, { headers: this.headers() });
        const j = await r.json();
        const map = { CAPTURED: 'paid', INITIATED: 'pending', FAILED: 'failed', CANCELLED: 'cancelled' };
        return { status: map[j.status] || 'pending', charge_id: j.id, raw: j };
    }
    async refund(id, amount) {
        const r = await fetch(`${this.base}/refunds`, { method: 'POST', headers: this.headers(), body: JSON.stringify({ charge_id: id, amount }) });
        const j = await r.json();
        return { refunded: r.ok, raw: j };
    }
}
class MoyasarAdapter {
    constructor() {
        this.name = 'moyasar';
        this.base = 'https://api.moyasar.com/v1';
    }
    headers() {
        const b = Buffer.from(`${process.env.MOYASAR_API_KEY}:`).toString('base64');
        return { Authorization: `Basic ${b}`, 'Content-Type': 'application/json' };
    }
    async createIntent(o) {
        const body = JSON.stringify({ amount: Math.round(o.amount * 100), currency: o.currency || 'SAR', description: o.description, callback_url: process.env.PUBLIC_APP_URL });
        const r = await fetch(`${this.base}/payments`, { method: 'POST', headers: this.headers(), body });
        const j = await r.json();
        if (!r.ok)
            throw new Error(j.message || 'moyasar_intent_failed');
        return { intent_id: j.id, checkout_url: j.source?.transaction_url };
    }
    async verify(id) {
        const r = await fetch(`${this.base}/payments/${id}`, { headers: this.headers() });
        const j = await r.json();
        const map = { paid: 'paid', initiated: 'pending', failed: 'failed', authorized: 'pending' };
        return { status: map[j.status] || 'pending', charge_id: j.id, raw: j };
    }
    async refund(id, amount) {
        const body = JSON.stringify(amount ? { amount: Math.round(amount * 100) } : {});
        const r = await fetch(`${this.base}/payments/${id}/refund`, { method: 'POST', headers: this.headers(), body });
        const j = await r.json();
        return { refunded: r.ok, raw: j };
    }
}
const KIND_TO_MODEL = { pharmacy: 'Order', lab: 'LabBooking', radiology: 'RadiologyBooking', nursing: 'HomeCareBooking', consultation: appointment_schema_1.Appointment.name };
function normalizeKind(k) {
    const m = { orders: 'pharmacy', pharmacy: 'pharmacy', lab: 'lab', labs: 'lab', radiology: 'radiology', rads: 'radiology', nursing: 'nursing', 'home-care': 'nursing', homecare: 'nursing', consultation: 'consultation', appt: 'consultation', insurance: 'insurance', 'insurance-copay': 'insurance', copay: 'insurance' };
    return m[k];
}
let PaymentsService = class PaymentsService {
    constructor(txns, orders, labs, rads, home, appts, insReqs, engine, events, realtime, fraud) {
        this.txns = txns;
        this.orders = orders;
        this.labs = labs;
        this.rads = rads;
        this.home = home;
        this.appts = appts;
        this.insReqs = insReqs;
        this.engine = engine;
        this.events = events;
        this.realtime = realtime;
        this.fraud = fraud;
        this.logger = new common_1.Logger('PaymentsService');
        this.adapter = selectAdapter();
        this.logger.log(`Payment adapter: ${this.adapter.name}`);
    }
    modelFor(k) {
        const kind = normalizeKind(k);
        if (!kind)
            throw new common_1.BadRequestException('invalid_booking_kind');
        if (kind === 'insurance')
            return this.insReqs;
        return kind === 'pharmacy' ? this.orders : kind === 'lab' ? this.labs : kind === 'radiology' ? this.rads : kind === 'nursing' ? this.home : this.appts;
    }
    assertBookingOwnerOrAdmin(user, booking) {
        if (!user?.id || (booking.patient_id !== user.id && user.role !== 'admin')) {
            throw new common_1.BadRequestException('not_authorized');
        }
    }
    assertTransactionVerifier(user, transaction) {
        if (!user?.id || (transaction.patient_id !== user.id && !['admin', 'system'].includes(user.role))) {
            throw new common_1.BadRequestException('not_authorized');
        }
    }
    async createPaymentIntent(user, type, id, idempotencyKey) {
        const requestKey = String(idempotencyKey || '').trim();
        if (!requestKey || requestKey.length > 128)
            throw new common_1.BadRequestException('idempotency_key_required');
        const kind = normalizeKind(type);
        const M = this.modelFor(type);
        const booking = await M.findOne({ id }).lean();
        if (!booking)
            throw new common_1.NotFoundException('booking_not_found');
        this.assertBookingOwnerOrAdmin(user, booking);
        if (booking.payment_status === 'paid')
            throw new common_1.BadRequestException('booking_already_paid');
        let amount = kind === 'insurance' ? (booking.copay_amount || 0) : (booking.total || booking.totals?.total || booking.price || 0);
        if (kind === 'pharmacy' && booking.payment_method === 'insurance'
            && ['APPROVED', 'PARTIAL_APPROVAL'].includes(booking.insurance_status)) {
            amount = Number(booking.insurance_copay || 0);
        }
        if (kind === 'pharmacy' && Number(booking.wallet_applied || 0) > 0) {
            amount = Math.max(0, Math.round((amount - Number(booking.wallet_applied)) * 100) / 100);
        }
        if (amount <= 0)
            throw new common_1.BadRequestException('invalid_amount');
        const existing = await this.txns.findOne({ booking_kind: kind, booking_id: id, status: { $in: ['initiating', 'pending', 'authorized'] } }).lean();
        if (existing)
            return existing;
        let txn;
        try {
            txn = await this.txns.create({ booking_kind: kind, booking_id: id, patient_id: booking.patient_id, amount, gateway: this.adapter.name, method: booking.payment_method || 'card', status: 'initiating', idempotency_key: requestKey });
        }
        catch (error) {
            if (error?.code === 11000) {
                const active = await this.txns.findOne({ booking_kind: kind, booking_id: id, status: { $in: ['initiating', 'pending', 'authorized'] } }).lean();
                if (active)
                    return active;
            }
            throw error;
        }
        let intent;
        try {
            intent = await this.adapter.createIntent({ amount, currency: 'SAR', description: `Nabd ${kind} #${id.slice(0, 8)}`, metadata: { booking_id: id, kind } });
        }
        catch (error) {
            const reason = error instanceof Error ? error.message : String(error);
            this.logger.error(`Payment gateway intent failed adapter=${this.adapter.name} booking=${id} reason=${reason}`);
            await this.txns.updateOne({ id: txn.id }, { $set: { status: 'failed', failure_reason: 'payment_gateway_unavailable' } });
            throw new common_1.BadGatewayException({ code: 'payment_gateway_unavailable', message: 'الدفع غير متاح حالياً' });
        }
        const persisted = await this.txns.findOneAndUpdate({ id: txn.id, status: 'initiating' }, { $set: { status: 'pending', gateway_intent_id: intent.intent_id, client_secret: intent.client_secret, checkout_url: intent.checkout_url } }, { new: true });
        return persisted?.toObject ? persisted.toObject() : persisted;
    }
    async verifyPayment(user, transactionId) {
        const t = await this.txns.findOne({ id: transactionId });
        if (!t)
            throw new common_1.NotFoundException('txn_not_found');
        this.assertTransactionVerifier(user, t);
        const result = await this.adapter.verify(t.gateway_intent_id);
        t.status = result.status;
        if (result.charge_id)
            t.gateway_charge_id = result.charge_id;
        if (result.status === 'paid') {
            t.paid_at = new Date();
            await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } });
            this.events.emit('payment.completed', {
                kind: t.booking_kind,
                id: t.booking_id,
                booking_kind: t.booking_kind,
                booking_id: t.booking_id,
                patient_id: t.patient_id,
                amount: t.amount,
                transaction_id: t.id
            });
            this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'paid', booking_id: t.booking_id });
            await this.fraud.detectDuplicatePayments(t.booking_id).catch(() => null);
        }
        else if (result.status === 'failed') {
            t.failure_reason = result.raw?.last_payment_error?.message || 'gateway_failure';
            this.events.emit('payment.failed', {
                kind: t.booking_kind,
                id: t.booking_id,
                booking_kind: t.booking_kind,
                booking_id: t.booking_id,
                patient_id: t.patient_id,
                amount: t.amount,
                transaction_id: t.id,
                reason: t.failure_reason
            });
            this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'failed', booking_id: t.booking_id });
            await this.fraud.checkPaymentVelocity(t.patient_id).catch(() => false);
        }
        t.webhook_payload = result.raw;
        await t.save();
        return t.toObject();
    }
    async retryPayment(user, type, id, idempotencyKey) {
        const kind = normalizeKind(type);
        const booking = await this.modelFor(type).findOne({ id }).lean();
        if (!booking)
            throw new common_1.NotFoundException('booking_not_found');
        this.assertBookingOwnerOrAdmin(user, booking);
        if (booking.payment_status === 'paid')
            throw new common_1.BadRequestException('booking_already_paid');
        await this.txns.updateMany({ booking_kind: kind, booking_id: id, status: { $in: ['pending', 'failed'] } }, { $set: { status: 'cancelled' } });
        return this.createPaymentIntent(user, type, id, idempotencyKey);
    }
    async refundPayment(user, transactionId, amount, reason) {
        if (user.role !== 'admin')
            throw new common_1.BadRequestException('not_authorized');
        const t = await this.txns.findOne({ id: transactionId });
        if (!t)
            throw new common_1.NotFoundException();
        if (t.status !== 'paid' && t.status !== 'partially_refunded')
            throw new common_1.BadRequestException('cannot_refund');
        const r = await this.adapter.refund(t.gateway_charge_id, amount);
        if (!r.refunded)
            throw new common_1.BadRequestException('refund_failed');
        const full = !amount || amount >= t.amount;
        t.status = full ? 'refunded' : 'partially_refunded';
        t.refunded_amount = (t.refunded_amount || 0) + (amount || t.amount);
        t.refunded_at = new Date();
        t.refund_reason = reason;
        await t.save();
        await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'refunded' } });
        this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: t.status });
        return t.toObject();
    }
    async capturePayment(user, transactionId) {
        if (user.role !== 'admin')
            throw new common_1.BadRequestException('not_authorized');
        const t = await this.txns.findOne({ id: transactionId });
        if (!t)
            throw new common_1.NotFoundException('txn_not_found');
        if (t.status !== 'authorized')
            throw new common_1.BadRequestException(`cannot_capture_status_${t.status}`);
        if (t.gateway !== 'moyasar')
            throw new common_1.BadRequestException('capture_supported_for_moyasar_only');
        const key = process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || process.env.MOYASAR_API_KEY;
        if (!key)
            throw new common_1.BadRequestException('payment_gateway_not_configured');
        const r = await fetch(`https://api.moyasar.com/v1/payments/${t.gateway_intent_id}/capture`, {
            method: 'POST',
            headers: { Authorization: `Basic ${Buffer.from(`${key}:`).toString('base64')}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({}),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
            t.webhook_payload = j;
            await t.save();
            throw new common_1.BadRequestException(`capture_failed: ${j?.message || r.status}`);
        }
        t.status = 'paid';
        t.paid_at = new Date();
        t.webhook_payload = j;
        await t.save();
        await this.modelFor(t.booking_kind).updateOne({ id: t.booking_id }, { $set: { payment_status: 'paid', transaction_id: t.id, paid_at: t.paid_at } });
        this.events.emit('payment.completed', {
            kind: t.booking_kind, id: t.booking_id, booking_kind: t.booking_kind, booking_id: t.booking_id,
            patient_id: t.patient_id, amount: t.amount, transaction_id: t.id,
        });
        this.realtime.emitToUser(t.patient_id, 'payment.updated', { transaction_id: t.id, status: 'paid', booking_id: t.booking_id });
        return t.toObject();
    }
    async listForBooking(user, type, id) {
        const kind = normalizeKind(type);
        const booking = await this.modelFor(type).findOne({ id }).lean();
        if (!booking)
            throw new common_1.NotFoundException('booking_not_found');
        const staffRoles = ['admin', 'finance'];
        if (booking.patient_id !== user.id && !staffRoles.includes(user.role)) {
            throw new common_1.BadRequestException('not_authorized');
        }
        return this.txns.find({ booking_kind: kind, booking_id: id }).sort({ createdAt: -1 }).lean();
    }
    async handleWebhook(provider, payload, signature, rawBody) {
        if (!this.verifyWebhookSignature(provider, signature, rawBody ?? JSON.stringify(payload))) {
            throw new common_1.BadRequestException('invalid_webhook_signature');
        }
        const intentId = payload.data?.object?.id || payload.id || payload.payment_intent;
        if (!intentId)
            return { ok: false, reason: 'no_intent_id' };
        const t = await this.txns.findOne({ gateway_intent_id: intentId });
        if (!t)
            return { ok: false, reason: 'no_match' };
        await this.verifyPayment({ id: t.patient_id, role: 'system' }, t.id);
        return { ok: true };
    }
    verifyWebhookSignature(provider, signature, rawBody) {
        if (provider !== 'moyasar')
            return false;
        const secret = process.env.MOYASAR_WEBHOOK_SECRET;
        if (!secret || !signature)
            return false;
        const expected = crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
        const received = Buffer.from(signature, 'utf8');
        const expectedBuffer = Buffer.from(expected, 'utf8');
        return received.length === expectedBuffer.length && crypto.timingSafeEqual(received, expectedBuffer);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)('Transaction')),
    __param(1, (0, mongoose_1.InjectModel)('Order')),
    __param(2, (0, mongoose_1.InjectModel)('LabBooking')),
    __param(3, (0, mongoose_1.InjectModel)('RadiologyBooking')),
    __param(4, (0, mongoose_1.InjectModel)('HomeCareBooking')),
    __param(5, (0, mongoose_1.InjectModel)(appointment_schema_1.Appointment.name)),
    __param(6, (0, mongoose_1.InjectModel)('InsuranceServiceRequest')),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model,
        workflow_engine_module_1.WorkflowEngineService,
        event_emitter_1.EventEmitter2,
        realtime_service_1.RealtimeService,
        finance_engine_module_1.FraudService])
], PaymentsService);
let PaymentsController = class PaymentsController {
    constructor(svc) {
        this.svc = svc;
    }
    intent(u, t, id, key) { return this.svc.createPaymentIntent(u, t, id, key); }
    verify(u, txn) { return this.svc.verifyPayment(u, txn); }
    retry(u, t, id, key) { return this.svc.retryPayment(u, t, id, key); }
    refund(u, txn, b) { return this.svc.refundPayment(u, txn, b.amount, b.reason); }
    capture(u, txn) { return this.svc.capturePayment(u, txn); }
    list(u, t, id) { return this.svc.listForBooking(u, t, id); }
};
exports.PaymentsController = PaymentsController;
__decorate([
    (0, common_1.Post)('intent/:type/:id'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "intent", null);
__decorate([
    (0, common_1.Post)('verify/:txn'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('txn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "verify", null);
__decorate([
    (0, common_1.Post)('retry/:type/:id'),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __param(3, (0, common_1.Headers)('idempotency-key')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "retry", null);
__decorate([
    (0, common_1.Post)('refund/:txn'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('txn')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "refund", null);
__decorate([
    (0, common_1.Post)('capture/:txn'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('txn')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "capture", null);
__decorate([
    (0, common_1.Get)('booking/:type/:id'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", void 0)
], PaymentsController.prototype, "list", null);
exports.PaymentsController = PaymentsController = __decorate([
    (0, common_1.Controller)('payments'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __metadata("design:paramtypes", [PaymentsService])
], PaymentsController);
let PaymentsWebhookController = class PaymentsWebhookController {
    constructor(svc) {
        this.svc = svc;
    }
    async webhook(p, b, signature, req) {
        const rawBody = req.rawBody || JSON.stringify(b);
        return this.svc.handleWebhook(p, b, signature, rawBody);
    }
};
exports.PaymentsWebhookController = PaymentsWebhookController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)(':provider'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Param)('provider')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('moyasar-signature')),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, String, Object]),
    __metadata("design:returntype", Promise)
], PaymentsWebhookController.prototype, "webhook", null);
exports.PaymentsWebhookController = PaymentsWebhookController = __decorate([
    (0, common_1.Controller)('payments/webhook'),
    __metadata("design:paramtypes", [PaymentsService])
], PaymentsWebhookController);
let PaymentsModule = class PaymentsModule {
};
exports.PaymentsModule = PaymentsModule;
exports.PaymentsModule = PaymentsModule = __decorate([
    (0, common_1.Module)({
        imports: [
            workflow_engine_module_1.WorkflowEngineModule, realtime_module_1.RealtimeModule,
            mongoose_1.MongooseModule.forFeature([
                { name: 'Transaction', schema: transaction_schema_1.TransactionSchema },
                { name: 'Order', schema: order_schema_1.OrderSchema },
                { name: 'LabBooking', schema: lab_schema_1.LabBookingSchema },
                { name: 'RadiologyBooking', schema: radiology_schema_1.RadiologyBookingSchema },
                { name: 'HomeCareBooking', schema: home_care_schema_1.HomeCareBookingSchema },
                { name: appointment_schema_1.Appointment.name, schema: appointment_schema_1.AppointmentSchema },
                { name: 'InsuranceServiceRequest', schema: insurance_engine_module_1.InsuranceServiceRequestSchema },
            ]),
        ],
        controllers: [PaymentsController, PaymentsWebhookController],
        providers: [PaymentsService, idempotency_interceptor_1.IdempotencyInterceptor],
        exports: [PaymentsService],
    })
], PaymentsModule);
//# sourceMappingURL=payments.module.js.map