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
exports.PHARMACY_SCHEMAS = exports.DrugShortageFlagSchema = exports.DrugShortageFlag = exports.PharmacyChatMessageSchema = exports.PharmacyChatMessage = exports.PharmacyChatThreadSchema = exports.PharmacyChatThread = exports.PharmacyOfferSchema = exports.PharmacyOffer = exports.PharmacyBroadcastSchema = exports.PharmacyBroadcast = exports.PharmacyLowStockAlertSchema = exports.PharmacyLowStockAlert = exports.PharmacySubstituteMapSchema = exports.PharmacySubstituteMap = exports.PrescriptionIntakeSchema = exports.PrescriptionIntake = exports.PharmacyAllocationSchema = exports.PharmacyAllocation = exports.PharmacyOrderSchema = exports.PharmacyOrder = exports.ALLOCATION_TRANSITIONS = exports.ORDER_TRANSITIONS = exports.OrderItemMatchStatus = exports.AllocationItemAction = exports.PrescriptionIntakeState = exports.PharmacyAllocationState = exports.PharmacyOrderState = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const insurance_schema_1 = require("../../../schemas/insurance.schema");
var PharmacyOrderState;
(function (PharmacyOrderState) {
    PharmacyOrderState["DRAFT"] = "draft";
    PharmacyOrderState["INTAKE_PROCESSING"] = "intake_processing";
    PharmacyOrderState["READY_FOR_SPLIT"] = "ready_for_split";
    PharmacyOrderState["BROADCASTING"] = "broadcasting";
    PharmacyOrderState["AWAITING_FULL_ACCEPTANCE"] = "awaiting_full_acceptance";
    PharmacyOrderState["NEGOTIATING_SUBSTITUTES"] = "negotiating_substitutes";
    PharmacyOrderState["ALLOCATING"] = "allocating";
    PharmacyOrderState["PARTIALLY_ALLOCATED"] = "partially_allocated";
    PharmacyOrderState["FULLY_ALLOCATED"] = "fully_allocated";
    PharmacyOrderState["OFFER_SELECTION_PENDING"] = "offer_selection_pending";
    PharmacyOrderState["CASH_CARD_PAYMENT_PENDING"] = "cash_card_payment_pending";
    PharmacyOrderState["COD_DUE_ON_DELIVERY"] = "cod_due_on_delivery";
    PharmacyOrderState["INSURANCE_DECISION_PENDING"] = "insurance_decision_pending";
    PharmacyOrderState["WAITING_COPAY"] = "waiting_copay";
    PharmacyOrderState["MANUAL_REVIEW"] = "manual_review";
    PharmacyOrderState["CONFIRMED"] = "confirmed";
    PharmacyOrderState["IN_FULFILLMENT"] = "in_fulfillment";
    PharmacyOrderState["OUT_FOR_DELIVERY"] = "out_for_delivery";
    PharmacyOrderState["DELIVERED"] = "delivered";
    PharmacyOrderState["COMPLETED"] = "completed";
    PharmacyOrderState["CANCELLED"] = "cancelled";
})(PharmacyOrderState || (exports.PharmacyOrderState = PharmacyOrderState = {}));
var PharmacyAllocationState;
(function (PharmacyAllocationState) {
    PharmacyAllocationState["PENDING_REVIEW"] = "pending_review";
    PharmacyAllocationState["PARTIALLY_CONFIRMED"] = "partially_confirmed";
    PharmacyAllocationState["CONFIRMED"] = "confirmed";
    PharmacyAllocationState["PREPARING"] = "preparing";
    PharmacyAllocationState["READY_FOR_PICKUP"] = "ready_for_pickup";
    PharmacyAllocationState["OUT_FOR_DELIVERY"] = "out_for_delivery";
    PharmacyAllocationState["DELIVERED"] = "delivered";
    PharmacyAllocationState["REJECTED"] = "rejected";
    PharmacyAllocationState["CANCELLED"] = "cancelled";
    PharmacyAllocationState["EXPIRED"] = "expired";
})(PharmacyAllocationState || (exports.PharmacyAllocationState = PharmacyAllocationState = {}));
var PrescriptionIntakeState;
(function (PrescriptionIntakeState) {
    PrescriptionIntakeState["QUEUED"] = "queued";
    PrescriptionIntakeState["PROCESSING"] = "processing";
    PrescriptionIntakeState["PARSED"] = "parsed";
    PrescriptionIntakeState["FAILED"] = "failed";
    PrescriptionIntakeState["MANUAL_REVIEW"] = "manual_review";
    PrescriptionIntakeState["COMPLETED"] = "completed";
})(PrescriptionIntakeState || (exports.PrescriptionIntakeState = PrescriptionIntakeState = {}));
var AllocationItemAction;
(function (AllocationItemAction) {
    AllocationItemAction["AVAILABLE"] = "available";
    AllocationItemAction["SUBSTITUTE"] = "substitute";
    AllocationItemAction["UNAVAILABLE"] = "unavailable";
})(AllocationItemAction || (exports.AllocationItemAction = AllocationItemAction = {}));
var OrderItemMatchStatus;
(function (OrderItemMatchStatus) {
    OrderItemMatchStatus["UNRESOLVED"] = "unresolved";
    OrderItemMatchStatus["MATCHED"] = "matched";
    OrderItemMatchStatus["MANUAL"] = "manual";
})(OrderItemMatchStatus || (exports.OrderItemMatchStatus = OrderItemMatchStatus = {}));
exports.ORDER_TRANSITIONS = {
    [PharmacyOrderState.DRAFT]: [PharmacyOrderState.INTAKE_PROCESSING, PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.INTAKE_PROCESSING]: [PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.READY_FOR_SPLIT]: [PharmacyOrderState.BROADCASTING, PharmacyOrderState.ALLOCATING, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.BROADCASTING]: [PharmacyOrderState.AWAITING_FULL_ACCEPTANCE, PharmacyOrderState.OFFER_SELECTION_PENDING, PharmacyOrderState.ALLOCATING, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.AWAITING_FULL_ACCEPTANCE]: [PharmacyOrderState.BROADCASTING, PharmacyOrderState.OFFER_SELECTION_PENDING, PharmacyOrderState.ALLOCATING, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.NEGOTIATING_SUBSTITUTES]: [PharmacyOrderState.ALLOCATING, PharmacyOrderState.PARTIALLY_ALLOCATED, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.ALLOCATING]: [PharmacyOrderState.PARTIALLY_ALLOCATED, PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.PARTIALLY_ALLOCATED]: [PharmacyOrderState.FULLY_ALLOCATED, PharmacyOrderState.NEGOTIATING_SUBSTITUTES, PharmacyOrderState.CONFIRMED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.FULLY_ALLOCATED]: [PharmacyOrderState.OFFER_SELECTION_PENDING, PharmacyOrderState.CONFIRMED, PharmacyOrderState.MANUAL_REVIEW, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.OFFER_SELECTION_PENDING]: [PharmacyOrderState.CASH_CARD_PAYMENT_PENDING, PharmacyOrderState.COD_DUE_ON_DELIVERY, PharmacyOrderState.INSURANCE_DECISION_PENDING, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.CASH_CARD_PAYMENT_PENDING]: [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.COD_DUE_ON_DELIVERY]: [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.INSURANCE_DECISION_PENDING]: [PharmacyOrderState.WAITING_COPAY, PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.WAITING_COPAY]: [PharmacyOrderState.CONFIRMED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.MANUAL_REVIEW]: [PharmacyOrderState.READY_FOR_SPLIT, PharmacyOrderState.BROADCASTING, PharmacyOrderState.CANCELLED, PharmacyOrderState.CONFIRMED],
    [PharmacyOrderState.CONFIRMED]: [PharmacyOrderState.IN_FULFILLMENT, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.IN_FULFILLMENT]: [PharmacyOrderState.OUT_FOR_DELIVERY, PharmacyOrderState.DELIVERED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.OUT_FOR_DELIVERY]: [PharmacyOrderState.DELIVERED, PharmacyOrderState.CANCELLED],
    [PharmacyOrderState.DELIVERED]: [PharmacyOrderState.COMPLETED],
    [PharmacyOrderState.COMPLETED]: [],
    [PharmacyOrderState.CANCELLED]: [],
};
exports.ALLOCATION_TRANSITIONS = {
    [PharmacyAllocationState.PENDING_REVIEW]: [PharmacyAllocationState.PARTIALLY_CONFIRMED, PharmacyAllocationState.CONFIRMED, PharmacyAllocationState.REJECTED, PharmacyAllocationState.CANCELLED, PharmacyAllocationState.EXPIRED],
    [PharmacyAllocationState.PARTIALLY_CONFIRMED]: [PharmacyAllocationState.CONFIRMED, PharmacyAllocationState.REJECTED, PharmacyAllocationState.CANCELLED],
    [PharmacyAllocationState.CONFIRMED]: [PharmacyAllocationState.PREPARING, PharmacyAllocationState.CANCELLED],
    [PharmacyAllocationState.PREPARING]: [PharmacyAllocationState.READY_FOR_PICKUP, PharmacyAllocationState.CANCELLED],
    [PharmacyAllocationState.READY_FOR_PICKUP]: [PharmacyAllocationState.OUT_FOR_DELIVERY, PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED],
    [PharmacyAllocationState.OUT_FOR_DELIVERY]: [PharmacyAllocationState.DELIVERED, PharmacyAllocationState.CANCELLED],
    [PharmacyAllocationState.DELIVERED]: [],
    [PharmacyAllocationState.REJECTED]: [],
    [PharmacyAllocationState.CANCELLED]: [],
    [PharmacyAllocationState.EXPIRED]: [],
};
let PharmacyOrder = class PharmacyOrder extends mongoose_2.Document {
};
exports.PharmacyOrder = PharmacyOrder;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: PharmacyOrderState.DRAFT, enum: Object.values(PharmacyOrderState), index: true }),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "intake_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOrder.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOrder.prototype, "delivery_address", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "patient_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOrder.prototype, "prescription_attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' } }),
    __metadata("design:type", Object)
], PharmacyOrder.prototype, "totals", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "service_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "transportation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], PharmacyOrder.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOrder.prototype, "pharmacy_basket", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "copay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOrder.prototype, "insurance_evaluation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [], index: true }),
    __metadata("design:type", Array)
], PharmacyOrder.prototype, "allocations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "splits_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'single', enum: ['single', 'multi'] }),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "split_strategy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyOrder.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "selected_offer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PharmacyOrder.prototype, "selected_offer_version", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "selected_allocation_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "offer_selection_idempotency_key", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOrder.prototype, "pricing_snapshot", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOrder.prototype, "split_decision", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOrder.prototype, "timeline", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOrder.prototype, "cancellation_reason", void 0);
exports.PharmacyOrder = PharmacyOrder = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_orders' })
], PharmacyOrder);
exports.PharmacyOrderSchema = mongoose_1.SchemaFactory.createForClass(PharmacyOrder);
exports.PharmacyOrderSchema.index({ patient_account_id: 1, status: 1, createdAt: -1 });
let PharmacyAllocation = class PharmacyAllocation extends mongoose_2.Document {
};
exports.PharmacyAllocation = PharmacyAllocation;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "offer_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], PharmacyAllocation.prototype, "offer_version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: PharmacyAllocationState.PENDING_REVIEW, enum: Object.values(PharmacyAllocationState), index: true }),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyAllocation.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: { subtotal: 0, delivery_fee: 0, total: 0, currency: 'SAR' } }),
    __metadata("design:type", Object)
], PharmacyAllocation.prototype, "totals", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PharmacyAllocation.prototype, "distance_km", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PharmacyAllocation.prototype, "estimated_preparation_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyAllocation.prototype, "estimated_ready_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyAllocation.prototype, "review_expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyAllocation.prototype, "delivery", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyAllocation.prototype, "timeline", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "notes_from_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyAllocation.prototype, "match_breakdown", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "cancellation_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyAllocation.prototype, "rejection_reason", void 0);
exports.PharmacyAllocation = PharmacyAllocation = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_allocations' })
], PharmacyAllocation);
exports.PharmacyAllocationSchema = mongoose_1.SchemaFactory.createForClass(PharmacyAllocation);
exports.PharmacyAllocationSchema.index({ pharmacy_account_id: 1, status: 1, createdAt: -1 });
exports.PharmacyAllocationSchema.index({ order_id: 1, pharmacy_account_id: 1 });
let PrescriptionIntake = class PrescriptionIntake extends mongoose_2.Document {
};
exports.PrescriptionIntake = PrescriptionIntake;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['image', 'pdf', 'voice', 'text'] }),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "source_uri", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "source_base64", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "raw_text", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "parser", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "parser_provider_used", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PrescriptionIntake.prototype, "parser_attempted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: PrescriptionIntakeState.QUEUED, enum: Object.values(PrescriptionIntakeState), index: true }),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PrescriptionIntake.prototype, "parsed_items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PrescriptionIntake.prototype, "unresolved_items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PrescriptionIntake.prototype, "confidence", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PrescriptionIntake.prototype, "error", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PrescriptionIntake.prototype, "processed_at", void 0);
exports.PrescriptionIntake = PrescriptionIntake = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_prescription_intakes' })
], PrescriptionIntake);
exports.PrescriptionIntakeSchema = mongoose_1.SchemaFactory.createForClass(PrescriptionIntake);
exports.PrescriptionIntakeSchema.index({ patient_account_id: 1, status: 1, createdAt: -1 });
let PharmacySubstituteMap = class PharmacySubstituteMap extends mongoose_2.Document {
};
exports.PharmacySubstituteMap = PharmacySubstituteMap;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "brand_sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "generic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacySubstituteMap.prototype, "substitute_brands", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "dosage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "form", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'manual', enum: ['manual', 'imported'] }),
    __metadata("design:type", String)
], PharmacySubstituteMap.prototype, "source", void 0);
exports.PharmacySubstituteMap = PharmacySubstituteMap = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_substitute_map' })
], PharmacySubstituteMap);
exports.PharmacySubstituteMapSchema = mongoose_1.SchemaFactory.createForClass(PharmacySubstituteMap);
exports.PharmacySubstituteMapSchema.index({ generic_name: 1, dosage: 1 });
let PharmacyLowStockAlert = class PharmacyLowStockAlert extends mongoose_2.Document {
};
exports.PharmacyLowStockAlert = PharmacyLowStockAlert;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "inventory_item_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyLowStockAlert.prototype, "current_stock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyLowStockAlert.prototype, "threshold", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'open', enum: ['open', 'acknowledged', 'restocked'], index: true }),
    __metadata("design:type", String)
], PharmacyLowStockAlert.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyLowStockAlert.prototype, "raised_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyLowStockAlert.prototype, "resolved_at", void 0);
exports.PharmacyLowStockAlert = PharmacyLowStockAlert = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_low_stock_alerts' })
], PharmacyLowStockAlert);
exports.PharmacyLowStockAlertSchema = mongoose_1.SchemaFactory.createForClass(PharmacyLowStockAlert);
exports.PharmacyLowStockAlertSchema.index({ pharmacy_account_id: 1, status: 1 });
let PharmacyBroadcast = class PharmacyBroadcast extends mongoose_2.Document {
};
exports.PharmacyBroadcast = PharmacyBroadcast;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyBroadcast.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], PharmacyBroadcast.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyBroadcast.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], PharmacyBroadcast.prototype, "current_round", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 3 }),
    __metadata("design:type", Number)
], PharmacyBroadcast.prototype, "current_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 7 }),
    __metadata("design:type", Number)
], PharmacyBroadcast.prototype, "max_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Number], default: [3, 5, 7] }),
    __metadata("design:type", Array)
], PharmacyBroadcast.prototype, "round_radii_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'open', enum: ['open', 'locked', 'fallback_split', 'closed'], index: true }),
    __metadata("design:type", String)
], PharmacyBroadcast.prototype, "lock_state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyBroadcast.prototype, "locked_to_pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyBroadcast.prototype, "locked_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyBroadcast.prototype, "responses", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PharmacyBroadcast.prototype, "notified_pharmacies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", Date)
], PharmacyBroadcast.prototype, "round_expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyBroadcast.prototype, "expiry_claim", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyBroadcast.prototype, "timeline", void 0);
exports.PharmacyBroadcast = PharmacyBroadcast = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_broadcasts' })
], PharmacyBroadcast);
exports.PharmacyBroadcastSchema = mongoose_1.SchemaFactory.createForClass(PharmacyBroadcast);
exports.PharmacyBroadcastSchema.index({ lock_state: 1, current_round: 1 });
exports.PharmacyBroadcastSchema.index({ lock_state: 1, round_expires_at: 1, id: 1 });
let PharmacyOffer = class PharmacyOffer extends mongoose_2.Document {
};
exports.PharmacyOffer = PharmacyOffer;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "broadcast_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['draft', 'submitted', 'selected', 'expired', 'cancelled'], default: 'draft', index: true }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 1 }),
    __metadata("design:type", Number)
], PharmacyOffer.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOffer.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], PharmacyOffer.prototype, "totals", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", Date)
], PharmacyOffer.prototype, "quote_expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyOffer.prototype, "expired_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOffer.prototype, "expiry_claim", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PharmacyOffer.prototype, "estimated_preparation_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyOffer.prototype, "fulfillment", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'provider_capabilities_pharmacy' }),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "pricing_source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "created_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "updated_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyOffer.prototype, "submitted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyOffer.prototype, "selected_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "selected_by_patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyOffer.prototype, "allocation_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], PharmacyOffer.prototype, "timeline", void 0);
exports.PharmacyOffer = PharmacyOffer = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_offers' })
], PharmacyOffer);
exports.PharmacyOfferSchema = mongoose_1.SchemaFactory.createForClass(PharmacyOffer);
exports.PharmacyOfferSchema.index({ order_id: 1, pharmacy_account_id: 1, version: -1 });
exports.PharmacyOfferSchema.index({ patient_account_id: 1, order_id: 1, status: 1, quote_expires_at: 1 });
exports.PharmacyOfferSchema.index({ status: 1, quote_expires_at: 1, id: 1 });
let PharmacyChatThread = class PharmacyChatThread extends mongoose_2.Document {
};
exports.PharmacyChatThread = PharmacyChatThread;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "patient_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "order_item_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'open', enum: ['open', 'closed', 'archived'], index: true }),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyChatThread.prototype, "last_message_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyChatThread.prototype, "auto_close_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyChatThread.prototype, "resolution", void 0);
exports.PharmacyChatThread = PharmacyChatThread = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_chat_threads' })
], PharmacyChatThread);
exports.PharmacyChatThreadSchema = mongoose_1.SchemaFactory.createForClass(PharmacyChatThread);
exports.PharmacyChatThreadSchema.index({ order_id: 1, order_item_id: 1, pharmacy_account_id: 1 });
let PharmacyChatMessage = class PharmacyChatMessage extends mongoose_2.Document {
};
exports.PharmacyChatMessage = PharmacyChatMessage;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "thread_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "sender_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['patient', 'pharmacy', 'system'] }),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "sender_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "text", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "image_uri", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PharmacyChatMessage.prototype, "substitute_offer", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], PharmacyChatMessage.prototype, "blocked", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyChatMessage.prototype, "blocked_reason", void 0);
exports.PharmacyChatMessage = PharmacyChatMessage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_chat_messages' })
], PharmacyChatMessage);
exports.PharmacyChatMessageSchema = mongoose_1.SchemaFactory.createForClass(PharmacyChatMessage);
exports.PharmacyChatMessageSchema.index({ thread_id: 1, createdAt: 1 });
let DrugShortageFlag = class DrugShortageFlag extends mongoose_2.Document {
};
exports.DrugShortageFlag = DrugShortageFlag;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "generic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "dosage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "form", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['admin', 'pharmacy'] }),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "reported_by_pharmacy_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', enum: ['pending', 'approved', 'rejected', 'resolved'], index: true }),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], DrugShortageFlag.prototype, "approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], DrugShortageFlag.prototype, "approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], DrugShortageFlag.prototype, "resolved_at", void 0);
exports.DrugShortageFlag = DrugShortageFlag = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'pharmacy_drug_shortage_flags' })
], DrugShortageFlag);
exports.DrugShortageFlagSchema = mongoose_1.SchemaFactory.createForClass(DrugShortageFlag);
exports.PHARMACY_SCHEMAS = [
    { name: 'PharmacyOrder', schema: exports.PharmacyOrderSchema },
    { name: 'PharmacyAllocation', schema: exports.PharmacyAllocationSchema },
    { name: 'PrescriptionIntake', schema: exports.PrescriptionIntakeSchema },
    { name: 'PharmacySubstituteMap', schema: exports.PharmacySubstituteMapSchema },
    { name: 'PharmacyLowStockAlert', schema: exports.PharmacyLowStockAlertSchema },
    { name: 'PharmacyBroadcast', schema: exports.PharmacyBroadcastSchema },
    { name: 'PharmacyOffer', schema: exports.PharmacyOfferSchema },
    { name: 'PharmacyChatThread', schema: exports.PharmacyChatThreadSchema },
    { name: 'PharmacyChatMessage', schema: exports.PharmacyChatMessageSchema },
    { name: 'DrugShortageFlag', schema: exports.DrugShortageFlagSchema },
];
//# sourceMappingURL=pharmacy.schema.js.map