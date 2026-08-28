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
exports.PharmacyBidSchema = exports.PharmacyBid = exports.OrderSchema = exports.Order = exports.StateTransitionSchema = exports.StateTransition = exports.OrderItemSchema = exports.OrderItem = exports.OrderResultSchema = exports.OrderResult = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
const insurance_schema_1 = require("./insurance.schema");
let OrderResult = class OrderResult {
};
exports.OrderResult = OrderResult;
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderResult.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderResult.prototype, "result", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderResult.prototype, "reference", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], OrderResult.prototype, "isAbnormal", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderResult.prototype, "unit", void 0);
exports.OrderResult = OrderResult = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], OrderResult);
exports.OrderResultSchema = mongoose_1.SchemaFactory.createForClass(OrderResult);
let OrderItem = class OrderItem {
};
exports.OrderItem = OrderItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "medicine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OrderItem.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "qty", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], OrderItem.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "is_manual_entry", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "is_substitute", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "substituted_from", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "unavailable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Boolean }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "isCovered", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OrderItem.prototype, "rejectReason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], OrderItem.prototype, "cashPrice", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], OrderItem.prototype, "optInCash", void 0);
exports.OrderItem = OrderItem = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], OrderItem);
exports.OrderItemSchema = mongoose_1.SchemaFactory.createForClass(OrderItem);
let StateTransition = class StateTransition {
};
exports.StateTransition = StateTransition;
__decorate([
    (0, mongoose_1.Prop)({ default: '' }),
    __metadata("design:type", String)
], StateTransition.prototype, "from", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StateTransition.prototype, "to", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StateTransition.prototype, "by_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StateTransition.prototype, "by_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StateTransition.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], StateTransition.prototype, "at", void 0);
exports.StateTransition = StateTransition = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], StateTransition);
exports.StateTransitionSchema = mongoose_1.SchemaFactory.createForClass(StateTransition);
let Order = class Order {
};
exports.Order = Order;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Order.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Order.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "prescription_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.OrderItemSchema], default: [] }),
    __metadata("design:type", Array)
], Order.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "subtotal", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "delivery_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.OrderState), default: enums_1.OrderState.NEW, index: true }),
    __metadata("design:type", String)
], Order.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.StateTransitionSchema], default: [] }),
    __metadata("design:type", Array)
], Order.prototype, "state_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ ts: Date, event: String, by: String }],
        default: []
    }),
    __metadata("design:type", Array)
], Order.prototype, "timeline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['PICKUP', 'DELIVERY'], default: 'DELIVERY' }),
    __metadata("design:type", String)
], Order.prototype, "delivery_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, address: String, district: String, city: String }, _id: false }),
    __metadata("design:type", Object)
], Order.prototype, "delivery_address", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "delivery_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Order.prototype, "escalated", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.OrderRejectionReason) }),
    __metadata("design:type", String)
], Order.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "rejected_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'cash' }),
    __metadata("design:type", String)
], Order.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending' }),
    __metadata("design:type", String)
], Order.prototype, "payment_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "wallet_applied", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "coupon_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "coupon_discount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "loyalty_points_used", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "loyalty_discount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "price_before_discounts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "refund_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Order.prototype, "paid_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "paid_via", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Order.prototype, "refunded_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "cancellation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "cancellation_fee_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: null }),
    __metadata("design:type", Object)
], Order.prototype, "dispatch", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Order.prototype, "is_split", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "parent_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Order.prototype, "sub_order_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['none', 'pending_pharmacy_review', 'submitted_for_patient_approval', 'patient_approved', 'patient_rejected'], default: 'none', index: true }),
    __metadata("design:type", String)
], Order.prototype, "basket_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.OrderItemSchema], default: [] }),
    __metadata("design:type", Array)
], Order.prototype, "pre_review_items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "pre_review_total", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Order.prototype, "basket_submitted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Order.prototype, "basket_decided_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "pharmacy_basket_note", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "transaction_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['NONE', 'PENDING', 'APPROVED', 'PARTIAL', 'REJECTED'], default: 'NONE' }),
    __metadata("design:type", String)
], Order.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "insurance_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "insurance_member_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "insurance_card_image", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Order.prototype, "insurance_reject_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Order.prototype, "insurance_decided_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Order.prototype, "insurance_copay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], Order.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [exports.OrderResultSchema], default: [] }),
    __metadata("design:type", Array)
], Order.prototype, "results", void 0);
exports.Order = Order = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'orders' })
], Order);
exports.OrderSchema = mongoose_1.SchemaFactory.createForClass(Order);
exports.OrderSchema.index({ patient_id: 1, createdAt: -1 });
exports.OrderSchema.index({ pharmacy_id: 1, state: 1 });
let PharmacyBid = class PharmacyBid extends mongoose_2.Document {
};
exports.PharmacyBid = PharmacyBid;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyBid.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyBid.prototype, "prescription_request_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyBid.prototype, "pharmacy_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                medicine_id: String,
                name_ar: String,
                price: Number,
                available: Boolean,
                alternative_name: String
            }],
        _id: false,
        default: []
    }),
    __metadata("design:type", Array)
], PharmacyBid.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PharmacyBid.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], PharmacyBid.prototype, "expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'accepted', 'rejected', 'expired'], default: 'pending' }),
    __metadata("design:type", String)
], PharmacyBid.prototype, "status", void 0);
exports.PharmacyBid = PharmacyBid = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_bids' })
], PharmacyBid);
exports.PharmacyBidSchema = mongoose_1.SchemaFactory.createForClass(PharmacyBid);
//# sourceMappingURL=order.schema.js.map