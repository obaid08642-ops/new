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
exports.LabSampleSchema = exports.LabSample = exports.LabBookingSchema = exports.LabBooking = exports.LAB_BOOKING_TRANSITIONS = exports.LabBookingState = exports.LabServiceSchema = exports.LabService = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
const insurance_schema_1 = require("./insurance.schema");
let LabService = class LabService extends mongoose_2.Document {
};
exports.LabService = LabService;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], LabService.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabService.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabService.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "short_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabService.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'blood' }),
    __metadata("design:type", String)
], LabService.prototype, "sample_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], LabService.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabService.prototype, "old_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabService.prototype, "fasting_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 8 }),
    __metadata("design:type", Number)
], LabService.prototype, "fasting_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "home_visit_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "facility_visit_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 24 }),
    __metadata("design:type", Number)
], LabService.prototype, "turnaround_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabService.prototype, "preparation_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabService.prototype, "preparation_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabService.prototype, "is_package", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabService.prototype, "included_services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabService.prototype, "popularity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabService.prototype, "unavailable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabService.prototype, "medical_referral_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabService.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], LabService.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LabService.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], LabService.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "cash_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "insurance_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "home_collection_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LabService.prototype, "in_lab_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "special_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LabService.prototype, "reference_ranges", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabService.prototype, "icon", void 0);
exports.LabService = LabService = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LabService);
exports.LabServiceSchema = mongoose_1.SchemaFactory.createForClass(LabService);
exports.LabServiceSchema.index({ name_ar: 'text', name_en: 'text' });
exports.LabServiceSchema.index({ category: 1, popularity: -1 });
var LabBookingState;
(function (LabBookingState) {
    LabBookingState["NEW_REQUEST"] = "NEW_REQUEST";
    LabBookingState["PENDING_INSURANCE"] = "PENDING_INSURANCE";
    LabBookingState["WAITING_COPAY"] = "WAITING_COPAY";
    LabBookingState["CONFIRMED"] = "CONFIRMED";
    LabBookingState["IN_TRANSIT"] = "IN_TRANSIT";
    LabBookingState["IN_LAB"] = "IN_LAB";
    LabBookingState["SAMPLE_COLLECTED"] = "SAMPLE_COLLECTED";
    LabBookingState["PROCESSING"] = "PROCESSING";
    LabBookingState["RESULT_UPLOADED"] = "RESULT_UPLOADED";
    LabBookingState["REPORTED"] = "REPORTED";
    LabBookingState["SAMPLE_REJECTED"] = "SAMPLE_REJECTED";
    LabBookingState["CANCELLED"] = "CANCELLED";
})(LabBookingState || (exports.LabBookingState = LabBookingState = {}));
exports.LAB_BOOKING_TRANSITIONS = {
    [LabBookingState.NEW_REQUEST]: [LabBookingState.PENDING_INSURANCE, LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
    [LabBookingState.PENDING_INSURANCE]: [LabBookingState.WAITING_COPAY, LabBookingState.CANCELLED],
    [LabBookingState.WAITING_COPAY]: [LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
    [LabBookingState.CONFIRMED]: [LabBookingState.IN_TRANSIT, LabBookingState.SAMPLE_COLLECTED, LabBookingState.CANCELLED],
    [LabBookingState.IN_TRANSIT]: [LabBookingState.IN_LAB, LabBookingState.SAMPLE_COLLECTED, LabBookingState.CANCELLED],
    [LabBookingState.IN_LAB]: [LabBookingState.SAMPLE_COLLECTED, LabBookingState.PROCESSING, LabBookingState.CANCELLED],
    [LabBookingState.SAMPLE_COLLECTED]: [LabBookingState.PROCESSING, LabBookingState.SAMPLE_REJECTED],
    [LabBookingState.PROCESSING]: [LabBookingState.RESULT_UPLOADED, LabBookingState.SAMPLE_REJECTED],
    [LabBookingState.RESULT_UPLOADED]: [LabBookingState.REPORTED],
    [LabBookingState.SAMPLE_REJECTED]: [LabBookingState.CONFIRMED, LabBookingState.CANCELLED],
    [LabBookingState.CANCELLED]: [],
};
let LabBooking = class LabBooking extends mongoose_2.Document {
};
exports.LabBooking = LabBooking;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], LabBooking.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.lab_booking) }),
    __metadata("design:type", String)
], LabBooking.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], LabBooking.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "service_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "transportation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['home', 'facility'], default: 'home' }),
    __metadata("design:type", String)
], LabBooking.prototype, "location_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LabBooking.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LabBooking.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: LabBookingState.NEW_REQUEST, enum: Object.values(LabBookingState) }),
    __metadata("design:type", String)
], LabBooking.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "state_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "reports", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "technician_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['cash', 'card', 'insurance'], default: 'cash' }),
    __metadata("design:type", String)
], LabBooking.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "insurance_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "insurance_member_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['none', 'pending', 'approved', 'rejected', 'partial_approval'], default: 'none' }),
    __metadata("design:type", String)
], LabBooking.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "insurance_copay", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], LabBooking.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "documents", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabBooking.prototype, "medical_referral_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "prescriptionFiles", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "medicalReports", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], LabBooking.prototype, "referralFiles", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "medicalJustification", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "reschedule_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "emergency_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabBooking.prototype, "reject_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LabBooking.prototype, "gps_location", void 0);
exports.LabBooking = LabBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LabBooking);
exports.LabBookingSchema = mongoose_1.SchemaFactory.createForClass(LabBooking);
exports.LabBookingSchema.index({ patient_id: 1, createdAt: -1 });
exports.LabBookingSchema.index({ state: 1, scheduled_at: 1 });
let LabSample = class LabSample extends mongoose_2.Document {
};
exports.LabSample = LabSample;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], LabSample.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabSample.prototype, "lab_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabSample.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], LabSample.prototype, "barcode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], LabSample.prototype, "tests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['received', 'analyzing', 'result_ready', 'sent'], default: 'received' }),
    __metadata("design:type", String)
], LabSample.prototype, "stage", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabSample.prototype, "assigned_to", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabSample.prototype, "notes", void 0);
exports.LabSample = LabSample = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'lab_samples' })
], LabSample);
exports.LabSampleSchema = mongoose_1.SchemaFactory.createForClass(LabSample);
//# sourceMappingURL=lab.schema.js.map