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
exports.REQUEST_TYPE_TO_PROVIDER_TYPES = exports.ProviderScoreSnapshotSchema = exports.ProviderScoreSnapshot = exports.ProviderAssignmentAttemptSchema = exports.ProviderAssignmentAttempt = exports.AssignmentAttemptStatus = exports.AssignmentStrategy = exports.ProviderScheduleSlotSchema = exports.ProviderScheduleSlot = exports.ProviderDeliveryZoneSchema = exports.ProviderDeliveryZone = exports.HomeCareServiceCatalogItemSchema = exports.HomeCareServiceCatalogItem = exports.DoctorSessionTypeSchema = exports.DoctorSessionType = exports.RadiologyServiceCatalogItemSchema = exports.RadiologyServiceCatalogItem = exports.LabTestCatalogItemSchema = exports.LabTestCatalogItem = exports.PharmacyInventoryItemSchema = exports.PharmacyInventoryItem = void 0;
exports.eligibleProviderTypesFor = eligibleProviderTypesFor;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let PharmacyInventoryItem = class PharmacyInventoryItem extends mongoose_2.Document {
};
exports.PharmacyInventoryItem = PharmacyInventoryItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "sku", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "generic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "form", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "dosage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "pack_size", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], PharmacyInventoryItem.prototype, "substitute_skus", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyInventoryItem.prototype, "min_stock_alert", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyInventoryItem.prototype, "last_restocked_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], PharmacyInventoryItem.prototype, "stock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], PharmacyInventoryItem.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PharmacyInventoryItem.prototype, "available", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], PharmacyInventoryItem.prototype, "expiry_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PharmacyInventoryItem.prototype, "notes", void 0);
exports.PharmacyInventoryItem = PharmacyInventoryItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_capabilities_pharmacy' })
], PharmacyInventoryItem);
exports.PharmacyInventoryItemSchema = mongoose_1.SchemaFactory.createForClass(PharmacyInventoryItem);
exports.PharmacyInventoryItemSchema.index({ provider_account_id: 1, sku: 1 }, { unique: true });
exports.PharmacyInventoryItemSchema.index({ provider_account_id: 1, available: 1 });
let LabTestCatalogItem = class LabTestCatalogItem extends mongoose_2.Document {
};
exports.LabTestCatalogItem = LabTestCatalogItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "sample_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 24 }),
    __metadata("design:type", Number)
], LabTestCatalogItem.prototype, "turnaround_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabTestCatalogItem.prototype, "home_collection_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], LabTestCatalogItem.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], LabTestCatalogItem.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabTestCatalogItem.prototype, "available", void 0);
exports.LabTestCatalogItem = LabTestCatalogItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_capabilities_lab' })
], LabTestCatalogItem);
exports.LabTestCatalogItemSchema = mongoose_1.SchemaFactory.createForClass(LabTestCatalogItem);
exports.LabTestCatalogItemSchema.index({ provider_account_id: 1, code: 1 }, { unique: true });
let RadiologyServiceCatalogItem = class RadiologyServiceCatalogItem extends mongoose_2.Document {
};
exports.RadiologyServiceCatalogItem = RadiologyServiceCatalogItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "scan_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "body_part", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyServiceCatalogItem.prototype, "contrast_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], RadiologyServiceCatalogItem.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], RadiologyServiceCatalogItem.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyServiceCatalogItem.prototype, "available", void 0);
exports.RadiologyServiceCatalogItem = RadiologyServiceCatalogItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_capabilities_radiology' })
], RadiologyServiceCatalogItem);
exports.RadiologyServiceCatalogItemSchema = mongoose_1.SchemaFactory.createForClass(RadiologyServiceCatalogItem);
exports.RadiologyServiceCatalogItemSchema.index({ provider_account_id: 1, scan_type: 1, body_part: 1 }, { unique: true });
let DoctorSessionType = class DoctorSessionType extends mongoose_2.Document {
};
exports.DoctorSessionType = DoctorSessionType;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], DoctorSessionType.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], DoctorSessionType.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DoctorSessionType.prototype, "consultation_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], DoctorSessionType.prototype, "specialty", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], DoctorSessionType.prototype, "duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], DoctorSessionType.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], DoctorSessionType.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], DoctorSessionType.prototype, "available", void 0);
exports.DoctorSessionType = DoctorSessionType = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_capabilities_doctor_sessions' })
], DoctorSessionType);
exports.DoctorSessionTypeSchema = mongoose_1.SchemaFactory.createForClass(DoctorSessionType);
exports.DoctorSessionTypeSchema.index({ provider_account_id: 1, consultation_type: 1, specialty: 1 }, { unique: true });
let HomeCareServiceCatalogItem = class HomeCareServiceCatalogItem extends mongoose_2.Document {
};
exports.HomeCareServiceCatalogItem = HomeCareServiceCatalogItem;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], HomeCareServiceCatalogItem.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HomeCareServiceCatalogItem.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareServiceCatalogItem.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareServiceCatalogItem.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [], type: [String] }),
    __metadata("design:type", Array)
], HomeCareServiceCatalogItem.prototype, "required_skills", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], HomeCareServiceCatalogItem.prototype, "min_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 0 }),
    __metadata("design:type", Number)
], HomeCareServiceCatalogItem.prototype, "hourly_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], HomeCareServiceCatalogItem.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeCareServiceCatalogItem.prototype, "available", void 0);
exports.HomeCareServiceCatalogItem = HomeCareServiceCatalogItem = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_capabilities_home_care' })
], HomeCareServiceCatalogItem);
exports.HomeCareServiceCatalogItemSchema = mongoose_1.SchemaFactory.createForClass(HomeCareServiceCatalogItem);
exports.HomeCareServiceCatalogItemSchema.index({ provider_account_id: 1, service_type: 1 }, { unique: true });
let ProviderDeliveryZone = class ProviderDeliveryZone extends mongoose_2.Document {
};
exports.ProviderDeliveryZone = ProviderDeliveryZone;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderDeliveryZone.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderDeliveryZone.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderDeliveryZone.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'circle', enum: ['circle', 'polygon'] }),
    __metadata("design:type", String)
], ProviderDeliveryZone.prototype, "shape", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderDeliveryZone.prototype, "center", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderDeliveryZone.prototype, "radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderDeliveryZone.prototype, "polygon", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderDeliveryZone.prototype, "base_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderDeliveryZone.prototype, "free_delivery_above", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProviderDeliveryZone.prototype, "active", void 0);
exports.ProviderDeliveryZone = ProviderDeliveryZone = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_delivery_zones' })
], ProviderDeliveryZone);
exports.ProviderDeliveryZoneSchema = mongoose_1.SchemaFactory.createForClass(ProviderDeliveryZone);
exports.ProviderDeliveryZoneSchema.index({ provider_account_id: 1, active: 1 });
let ProviderScheduleSlot = class ProviderScheduleSlot extends mongoose_2.Document {
};
exports.ProviderScheduleSlot = ProviderScheduleSlot;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderScheduleSlot.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderScheduleSlot.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, min: 0, max: 6 }),
    __metadata("design:type", Number)
], ProviderScheduleSlot.prototype, "day_of_week", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderScheduleSlot.prototype, "start_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderScheduleSlot.prototype, "end_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], ProviderScheduleSlot.prototype, "slot_duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], ProviderScheduleSlot.prototype, "capacity_per_slot", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], ProviderScheduleSlot.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderScheduleSlot.prototype, "note", void 0);
exports.ProviderScheduleSlot = ProviderScheduleSlot = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_schedule_slots' })
], ProviderScheduleSlot);
exports.ProviderScheduleSlotSchema = mongoose_1.SchemaFactory.createForClass(ProviderScheduleSlot);
exports.ProviderScheduleSlotSchema.index({ provider_account_id: 1, day_of_week: 1, start_time: 1 });
var AssignmentStrategy;
(function (AssignmentStrategy) {
    AssignmentStrategy["AUTO_BEST"] = "auto_best";
    AssignmentStrategy["BROADCAST"] = "broadcast";
    AssignmentStrategy["MANUAL"] = "manual";
})(AssignmentStrategy || (exports.AssignmentStrategy = AssignmentStrategy = {}));
var AssignmentAttemptStatus;
(function (AssignmentAttemptStatus) {
    AssignmentAttemptStatus["PENDING"] = "pending";
    AssignmentAttemptStatus["ACCEPTED"] = "accepted";
    AssignmentAttemptStatus["REJECTED"] = "rejected";
    AssignmentAttemptStatus["TIMED_OUT"] = "timed_out";
    AssignmentAttemptStatus["CANCELLED"] = "cancelled";
    AssignmentAttemptStatus["EXPIRED"] = "expired";
})(AssignmentAttemptStatus || (exports.AssignmentAttemptStatus = AssignmentAttemptStatus = {}));
let ProviderAssignmentAttempt = class ProviderAssignmentAttempt extends mongoose_2.Document {
};
exports.ProviderAssignmentAttempt = ProviderAssignmentAttempt;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "request_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 1 }),
    __metadata("design:type", Number)
], ProviderAssignmentAttempt.prototype, "attempt_index", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: AssignmentStrategy.AUTO_BEST, enum: Object.values(AssignmentStrategy) }),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "strategy", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: AssignmentAttemptStatus.PENDING, enum: Object.values(AssignmentAttemptStatus), index: true }),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: () => new Date() }),
    __metadata("design:type", Date)
], ProviderAssignmentAttempt.prototype, "sent_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAssignmentAttempt.prototype, "responded_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 120 }),
    __metadata("design:type", Number)
], ProviderAssignmentAttempt.prototype, "timeout_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], ProviderAssignmentAttempt.prototype, "expires_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderAssignmentAttempt.prototype, "score", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAssignmentAttempt.prototype, "rejection_reason", void 0);
exports.ProviderAssignmentAttempt = ProviderAssignmentAttempt = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_assignment_attempts' })
], ProviderAssignmentAttempt);
exports.ProviderAssignmentAttemptSchema = mongoose_1.SchemaFactory.createForClass(ProviderAssignmentAttempt);
exports.ProviderAssignmentAttemptSchema.index({ request_id: 1, attempt_index: 1 });
exports.ProviderAssignmentAttemptSchema.index({ provider_account_id: 1, status: 1, createdAt: -1 });
let ProviderScoreSnapshot = class ProviderScoreSnapshot extends mongoose_2.Document {
};
exports.ProviderScoreSnapshot = ProviderScoreSnapshot;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderScoreSnapshot.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ProviderScoreSnapshot.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "total_requests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "total_accepted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "total_rejected", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "total_completed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "total_cancelled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "acceptance_rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "completion_rate", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "avg_response_seconds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "avg_completion_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderScoreSnapshot.prototype, "reliability_score", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderScoreSnapshot.prototype, "last_calculated_at", void 0);
exports.ProviderScoreSnapshot = ProviderScoreSnapshot = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_scores' })
], ProviderScoreSnapshot);
exports.ProviderScoreSnapshotSchema = mongoose_1.SchemaFactory.createForClass(ProviderScoreSnapshot);
exports.REQUEST_TYPE_TO_PROVIDER_TYPES = {
    pharmacy: ['pharmacy', 'hospital'],
    lab: ['laboratory', 'hospital'],
    radiology: ['radiology', 'hospital'],
    doctor: ['doctor', 'clinic', 'hospital', 'telemedicine'],
    home_care: ['home_care', 'nursing', 'physiotherapy', 'hospital'],
};
function eligibleProviderTypesFor(reqType) {
    return exports.REQUEST_TYPE_TO_PROVIDER_TYPES[reqType] || [];
}
//# sourceMappingURL=capabilities.schema.js.map