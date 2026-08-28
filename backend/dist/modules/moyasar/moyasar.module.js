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
exports.MoyasarModule = exports.MoyasarController = exports.MoyasarService = exports.MoyasarPaymentSchema = exports.MoyasarPayment = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const event_emitter_1 = require("@nestjs/event-emitter");
const crypto = __importStar(require("crypto"));
let MoyasarPayment = class MoyasarPayment {
};
exports.MoyasarPayment = MoyasarPayment;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], MoyasarPayment.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "moyasar_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        default: 'initiated',
        enum: ['initiated', 'paid', 'failed', 'refunded', 'authorized'],
    }),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "payment_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "source_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MoyasarPayment.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "failure_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MoyasarPayment.prototype, "paid_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MoyasarPayment.prototype, "refunded_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MoyasarPayment.prototype, "refunded_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MoyasarPayment.prototype, "raw_response", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "callback_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MoyasarPayment.prototype, "description", void 0);
exports.MoyasarPayment = MoyasarPayment = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'moyasar_payments' })
], MoyasarPayment);
exports.MoyasarPaymentSchema = mongoose_1.SchemaFactory.createForClass(MoyasarPayment);
exports.MoyasarPaymentSchema.index({ booking_id: 1, status: 1 });
exports.MoyasarPaymentSchema.index({ patient_id: 1, createdAt: -1 });
exports.MoyasarPaymentSchema.index({ moyasar_id: 1 }, { sparse: true });
let MoyasarService = class MoyasarService {
    constructor(paymentModel, conn, events) {
        this.paymentModel = paymentModel;
        this.conn = conn;
        this.events = events;
        this.logger = new common_1.Logger('MoyasarService');
        this.baseUrl = 'https://api.moyasar.com/v1';
        this.apiKey = process.env.MOYASAR_API_KEY || process.env.MOYASAR_SECRET_KEY || process.env.MOYASAR_SECRET || '';
        if (!this.apiKey) {
            this.logger.warn('MOYASAR_API_KEY not set — payment calls will run in sandbox mode');
        }
    }
    async resolveBookingAmount(bookingKind, bookingId) {
        const kindMap = {
            pharmacy: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
            order: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
            orders: { collection: 'orders', amounts: ['total', 'totals.total', 'amount'] },
            consultation: { collection: 'appointments', amounts: ['total_price', 'price', 'amount'] },
            appointment: { collection: 'appointments', amounts: ['total_price', 'price', 'amount'] },
            lab: { collection: 'labbookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            labs: { collection: 'labbookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            radiology: { collection: 'radiologybookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            nursing: { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            'home-care': { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            homecare: { collection: 'homecarebookings', amounts: ['total', 'total_price', 'price', 'amount'] },
            insurance: { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
            'insurance-copay': { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
            copay: { collection: 'insuranceservicerequests', amounts: ['copay_amount', 'price'] },
        };
        const cfg = kindMap[bookingKind];
        if (!cfg)
            throw new common_1.BadRequestException('invalid_booking_kind');
        const doc = await this.conn.collection(cfg.collection).findOne({ id: bookingId });
        if (!doc)
            throw new common_1.NotFoundException('booking_not_found');
        let amount = 0;
        for (const path of cfg.amounts) {
            const val = path.split('.').reduce((o, k) => (o != null ? o[k] : undefined), doc);
            if (Number(val) > 0) {
                amount = Number(val);
                break;
            }
        }
        if (!(amount > 0))
            throw new common_1.BadRequestException('booking_has_no_payable_amount');
        return { amount: Math.round(amount * 100) / 100, patient_id: doc.patient_id || doc.user_id || null };
    }
    authHeaders() {
        const b64 = Buffer.from(`${this.apiKey}:`).toString('base64');
        return {
            Authorization: `Basic ${b64}`,
            'Content-Type': 'application/json',
        };
    }
    async createPayment(params) {
        if (!params.skipBookingValidation) {
            const resolved = await this.resolveBookingAmount(params.bookingKind, params.bookingId);
            if (resolved.patient_id && resolved.patient_id !== params.patientId) {
                throw new common_1.ForbiddenException('not_your_booking');
            }
            params.amount = resolved.amount;
        }
        if (!(Number(params.amount) > 0))
            throw new common_1.BadRequestException('invalid_amount');
        const amountHalalas = Math.round(params.amount * 100);
        const callbackUrl = params.callbackUrl ||
            (process.env.PUBLIC_APP_URL || '') + '/api/v1/moyasar/callback';
        const existing = await this.paymentModel.findOne({
            booking_id: params.bookingId,
            status: { $in: ['initiated', 'authorized'] },
        });
        if (existing)
            return existing;
        const requestBody = {
            amount: amountHalalas,
            currency: 'SAR',
            description: params.description ||
                `Nabd ${params.bookingKind} #${params.bookingId.slice(0, 8)}`,
            callback_url: callbackUrl,
            source: { type: 'creditcard' },
            metadata: {
                booking_id: params.bookingId,
                booking_kind: params.bookingKind,
                patient_id: params.patientId,
                ...(params.metadata || {}),
            },
        };
        let moyasarResponse;
        if (this.apiKey) {
            try {
                const resp = await fetch(`${this.baseUrl}/payments`, {
                    method: 'POST',
                    headers: this.authHeaders(),
                    body: JSON.stringify(requestBody),
                });
                moyasarResponse = await resp.json();
                if (!resp.ok) {
                    throw new common_1.BadRequestException(moyasarResponse?.message || 'moyasar_create_failed');
                }
            }
            catch (e) {
                this.logger.error('Moyasar createPayment error', e?.message);
                throw new common_1.BadRequestException(e?.message || 'payment_create_failed');
            }
        }
        else {
            moyasarResponse = {
                id: `sandbox_${Date.now()}`,
                status: 'initiated',
                source: {
                    transaction_url: `nabd://payment/sandbox?booking=${params.bookingId}&amount=${amountHalalas}`,
                },
            };
            this.logger.warn('Running in sandbox payment mode — set MOYASAR_API_KEY for live payments');
        }
        const payment = await this.paymentModel.create({
            booking_id: params.bookingId,
            booking_kind: params.bookingKind,
            patient_id: params.patientId,
            amount: params.amount,
            currency: 'SAR',
            moyasar_id: moyasarResponse?.id,
            status: moyasarResponse?.status || 'initiated',
            payment_url: moyasarResponse?.source?.transaction_url,
            description: params.description,
            callback_url: callbackUrl,
            raw_response: moyasarResponse,
        });
        return payment;
    }
    async syncPaymentStatus(moyasarId) {
        const payment = await this.paymentModel.findOne({ moyasar_id: moyasarId });
        if (!payment)
            return null;
        const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');
        if (!isSandbox) {
            try {
                const resp = await fetch(`${this.baseUrl}/payments/${moyasarId}`, {
                    headers: this.authHeaders(),
                });
                const data = await resp.json();
                const statusMap = {
                    paid: 'paid',
                    failed: 'failed',
                    authorized: 'authorized',
                    initiated: 'initiated',
                    refunded: 'refunded',
                };
                payment.status = statusMap[data?.status] ?? payment.status;
                if (data?.source?.type)
                    payment.source_type = data.source.type;
                if (data?.source)
                    payment.source = data.source;
                payment.raw_response = data;
                if (data?.status === 'paid' && !payment.paid_at) {
                    payment.paid_at = new Date();
                }
                if (data?.status === 'failed' && data?.source?.message) {
                    payment.failure_reason = data.source.message;
                }
                await payment.save();
            }
            catch (e) {
                this.logger.error('Moyasar syncStatus error', e?.message);
            }
        }
        return payment;
    }
    async refundPayment(moyasarId, amount) {
        const isSandbox = !this.apiKey || moyasarId.startsWith('sandbox_');
        if (isSandbox) {
            const p = await this.paymentModel.findOne({ moyasar_id: moyasarId });
            if (p) {
                p.status = 'refunded';
                p.refunded_at = new Date();
                p.refunded_amount = amount ?? p.amount;
                await p.save();
            }
            return { ok: true, sandbox: true };
        }
        const payment = await this.paymentModel.findOne({ moyasar_id: moyasarId });
        if (!payment)
            throw new common_1.BadRequestException('payment_not_found');
        try {
            const amountHalalas = amount ? Math.round(amount * 100) : undefined;
            const resp = await fetch(`${this.baseUrl}/payments/${moyasarId}/refunds`, {
                method: 'POST',
                headers: this.authHeaders(),
                body: JSON.stringify(amountHalalas ? { amount: amountHalalas } : {}),
            });
            const data = await resp.json();
            if (!resp.ok)
                throw new common_1.BadRequestException(data?.message || 'refund_failed');
            payment.status = 'refunded';
            payment.refunded_at = new Date();
            payment.refunded_amount =
                (payment.refunded_amount || 0) + (amount ?? payment.amount);
            await payment.save();
            this.events.emit('payment.refund', {
                actor_id: 'admin', transaction_id: payment.moyasar_id,
                booking_id: payment.booking_id, booking_kind: payment.booking_kind,
                patient_id: payment.patient_id, amount: amount ?? payment.amount,
            });
            return { ok: true, refund: data };
        }
        catch (e) {
            this.logger.error('Refund error', e?.message);
            throw new common_1.BadRequestException(e?.message || 'refund_failed');
        }
    }
    verifyWebhookSignature(payload, signature) {
        const secret = process.env.MOYASAR_WEBHOOK_SECRET || '';
        if (!secret) {
            if (process.env.NODE_ENV === 'production') {
                this.logger.error('MOYASAR_WEBHOOK_SECRET is not set — rejecting webhook (fail-closed)');
                return false;
            }
            return true;
        }
        if (!signature)
            return false;
        const hmac = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        try {
            const a = Buffer.from(hmac, 'hex');
            const b = Buffer.from(signature, 'hex');
            return a.length === b.length && crypto.timingSafeEqual(a, b);
        }
        catch {
            return false;
        }
    }
    async handleWebhook(payload) {
        const moyasarId = payload?.id ?? payload?.data?.id;
        if (moyasarId) {
            await this.syncPaymentStatus(moyasarId);
        }
        return { ok: true };
    }
    async getPaymentsByBooking(bookingId) {
        return this.paymentModel
            .find({ booking_id: bookingId }, { _id: 0, __v: 0 })
            .sort({ createdAt: -1 })
            .lean();
    }
    async getPaymentsByUser(patientId, page = 1, limit = 20) {
        const filter = { patient_id: patientId };
        const [total, payments] = await Promise.all([
            this.paymentModel.countDocuments(filter),
            this.paymentModel
                .find(filter, { _id: 0, __v: 0 })
                .sort({ createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
        ]);
        return { payments, total, page, limit };
    }
};
exports.MoyasarService = MoyasarService;
exports.MoyasarService = MoyasarService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(MoyasarPayment.name)),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Connection,
        event_emitter_1.EventEmitter2])
], MoyasarService);
let MoyasarController = class MoyasarController {
    constructor(svc) {
        this.svc = svc;
    }
    createPayment(user, body) {
        return this.svc.createPayment({
            bookingId: body.booking_id,
            bookingKind: body.booking_kind,
            patientId: user.id,
            amount: body.amount,
            description: body.description,
            callbackUrl: body.callback_url,
        });
    }
    async getByBooking(user, bookingId) {
        const payments = await this.svc.getPaymentsByBooking(bookingId);
        if (user.role !== 'admin' && payments.some((p) => p.patient_id && p.patient_id !== user.id)) {
            throw new common_1.ForbiddenException('not_your_booking');
        }
        return payments;
    }
    getMyPayments(user) {
        return this.svc.getPaymentsByUser(user.id);
    }
    syncStatus(id) {
        return this.svc.syncPaymentStatus(id);
    }
    refund(id, body) {
        return this.svc.refundPayment(id, body.amount);
    }
    webhook(body, signature, req) {
        const rawBody = req?.rawBody || JSON.stringify(body);
        if (!this.svc.verifyWebhookSignature(rawBody, signature)) {
            throw new common_1.BadRequestException('invalid_signature');
        }
        return this.svc.handleWebhook(body);
    }
    callback() {
        return { ok: true, message: 'Payment callback received' };
    }
};
exports.MoyasarController = MoyasarController;
__decorate([
    (0, common_1.Post)('payments'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_1.UseInterceptors)(idempotency_interceptor_1.IdempotencyInterceptor),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "createPayment", null);
__decorate([
    (0, common_1.Get)('payments/booking/:bookingId'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('bookingId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], MoyasarController.prototype, "getByBooking", null);
__decorate([
    (0, common_1.Get)('payments/me'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "getMyPayments", null);
__decorate([
    (0, common_1.Get)('payments/sync/:moyasarId'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('moyasarId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "syncStatus", null);
__decorate([
    (0, common_1.Post)('payments/:moyasarId/refund'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('moyasarId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "refund", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('x-moyasar-signature')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "webhook", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('callback'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], MoyasarController.prototype, "callback", null);
exports.MoyasarController = MoyasarController = __decorate([
    (0, common_1.Controller)('moyasar'),
    __metadata("design:paramtypes", [MoyasarService])
], MoyasarController);
let MoyasarModule = class MoyasarModule {
};
exports.MoyasarModule = MoyasarModule;
exports.MoyasarModule = MoyasarModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: MoyasarPayment.name, schema: exports.MoyasarPaymentSchema },
            ]),
        ],
        controllers: [MoyasarController],
        providers: [MoyasarService],
        exports: [MoyasarService],
    })
], MoyasarModule);
//# sourceMappingURL=moyasar.module.js.map