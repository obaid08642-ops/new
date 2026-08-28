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
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransactionSchema = exports.Transaction = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let Transaction = class Transaction {
};
exports.Transaction = Transaction;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], Transaction.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Transaction.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Transaction.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Transaction.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Transaction.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], Transaction.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['stripe', 'tap', 'moyasar'], default: 'moyasar' }),
    __metadata("design:type", String)
], Transaction.prototype, "gateway", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'card' }),
    __metadata("design:type", String)
], Transaction.prototype, "method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['initiating', 'pending', 'authorized', 'paid', 'failed', 'refunded', 'partially_refunded', 'cancelled'], default: 'pending', index: true }),
    __metadata("design:type", String)
], Transaction.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "idempotency_key", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "gateway_intent_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "gateway_charge_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "client_secret", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "checkout_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Transaction.prototype, "webhook_payload", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "failure_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Transaction.prototype, "refund_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Transaction.prototype, "refunded_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Transaction.prototype, "paid_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Transaction.prototype, "refunded_at", void 0);
exports.Transaction = Transaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], Transaction);
exports.TransactionSchema = mongoose_1.SchemaFactory.createForClass(Transaction);
exports.TransactionSchema.index({ booking_kind: 1, booking_id: 1, createdAt: -1 });
exports.TransactionSchema.index({ booking_kind: 1, booking_id: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['initiating', 'pending', 'authorized'] } }, name: 'transaction_one_active_intent_per_booking' });
exports.TransactionSchema.index({ patient_id: 1, booking_kind: 1, booking_id: 1, idempotency_key: 1 }, { unique: true, partialFilterExpression: { idempotency_key: { $type: 'string' } }, name: 'transaction_booking_idempotency_key' });
exports.TransactionSchema.index({ gateway: 1, gateway_intent_id: 1 }, { unique: true, partialFilterExpression: { gateway_intent_id: { $type: 'string' } }, name: 'transaction_gateway_intent_reference' });
//# sourceMappingURL=transaction.schema.js.map