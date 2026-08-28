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
exports.RadiologyBookingSchema = exports.RadiologyBooking = exports.RADIOLOGY_BOOKING_TRANSITIONS = exports.RadiologyBookingState = exports.RadiologyMachineSchema = exports.RadiologyMachine = exports.RadiologyServiceSchema = exports.RadiologyService = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
const insurance_schema_1 = require("./insurance.schema");
let RadiologyService = class RadiologyService extends mongoose_2.Document {
};
exports.RadiologyService = RadiologyService;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], RadiologyService.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyService.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyService.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "short_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RadiologyService.prototype, "modality", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "body_part", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "old_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "contrast_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "fasting_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 6 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "fasting_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "home_visit_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "facility_visit_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 24 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "turnaround_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], RadiologyService.prototype, "preparation_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], RadiologyService.prototype, "preparation_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "requires_referral", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "medical_referral_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "popularity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "unavailable", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], RadiologyService.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyService.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "version", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "icon", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], RadiologyService.prototype, "estimated_duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "requires_pregnancy_check", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "requires_metal_implant_check", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "requires_contrast_allergy_check", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "cash_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "insurance_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyService.prototype, "portable_ultrasound", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['MRI', 'CT', 'X-Ray', 'Ultrasound', 'Mammography', 'DEXA', 'Fluoroscopy', 'PET'] }),
    __metadata("design:type", String)
], RadiologyService.prototype, "modality_category", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyService.prototype, "special_notes", void 0);
exports.RadiologyService = RadiologyService = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RadiologyService);
exports.RadiologyServiceSchema = mongoose_1.SchemaFactory.createForClass(RadiologyService);
exports.RadiologyServiceSchema.index({ name_ar: 'text', name_en: 'text' });
exports.RadiologyServiceSchema.index({ modality: 1, popularity: -1 });
let RadiologyMachine = class RadiologyMachine extends mongoose_2.Document {
};
exports.RadiologyMachine = RadiologyMachine;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], RadiologyMachine.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyMachine.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyMachine.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyMachine.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], RadiologyMachine.prototype, "is_active", void 0);
exports.RadiologyMachine = RadiologyMachine = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RadiologyMachine);
exports.RadiologyMachineSchema = mongoose_1.SchemaFactory.createForClass(RadiologyMachine);
exports.RadiologyMachineSchema.index({ provider_id: 1, is_active: 1 });
var RadiologyBookingState;
(function (RadiologyBookingState) {
    RadiologyBookingState["PENDING"] = "PENDING";
    RadiologyBookingState["NEW_REQUEST"] = "NEW_REQUEST";
    RadiologyBookingState["PENDING_INSURANCE"] = "PENDING_INSURANCE";
    RadiologyBookingState["WAITING_COPAY"] = "WAITING_COPAY";
    RadiologyBookingState["CONFIRMED"] = "CONFIRMED";
    RadiologyBookingState["ARRIVED_CHECKIN"] = "ARRIVED_CHECKIN";
    RadiologyBookingState["IN_SCANNING"] = "IN_SCANNING";
    RadiologyBookingState["REPORT_DRAFT"] = "REPORT_DRAFT";
    RadiologyBookingState["UNDER_REVIEW"] = "UNDER_REVIEW";
    RadiologyBookingState["REPORT_READY"] = "REPORT_READY";
    RadiologyBookingState["REPORT_PUBLISHED"] = "REPORT_PUBLISHED";
    RadiologyBookingState["SCAN_ABORTED"] = "SCAN_ABORTED";
    RadiologyBookingState["CANCELLED"] = "CANCELLED";
})(RadiologyBookingState || (exports.RadiologyBookingState = RadiologyBookingState = {}));
exports.RADIOLOGY_BOOKING_TRANSITIONS = {
    [RadiologyBookingState.NEW_REQUEST]: [RadiologyBookingState.PENDING_INSURANCE, RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
    [RadiologyBookingState.PENDING_INSURANCE]: [RadiologyBookingState.WAITING_COPAY, RadiologyBookingState.CANCELLED],
    [RadiologyBookingState.WAITING_COPAY]: [RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
    [RadiologyBookingState.CONFIRMED]: [RadiologyBookingState.ARRIVED_CHECKIN, RadiologyBookingState.CANCELLED],
    [RadiologyBookingState.ARRIVED_CHECKIN]: [RadiologyBookingState.IN_SCANNING, RadiologyBookingState.SCAN_ABORTED],
    [RadiologyBookingState.IN_SCANNING]: [RadiologyBookingState.REPORT_DRAFT, RadiologyBookingState.SCAN_ABORTED],
    [RadiologyBookingState.REPORT_DRAFT]: [RadiologyBookingState.UNDER_REVIEW],
    [RadiologyBookingState.UNDER_REVIEW]: [RadiologyBookingState.REPORT_READY, RadiologyBookingState.REPORT_DRAFT],
    [RadiologyBookingState.REPORT_READY]: [],
    [RadiologyBookingState.SCAN_ABORTED]: [RadiologyBookingState.CONFIRMED, RadiologyBookingState.CANCELLED],
    [RadiologyBookingState.CANCELLED]: [],
};
let RadiologyBooking = class RadiologyBooking extends mongoose_2.Document {
};
exports.RadiologyBooking = RadiologyBooking;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.radiology_booking) }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "service_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "transportation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['home', 'facility'], default: 'facility' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "location_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], RadiologyBooking.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "instructions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], RadiologyBooking.prototype, "referral", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: RadiologyBookingState.PENDING, enum: Object.values(RadiologyBookingState) }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "state_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "reports", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "technician_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['cash', 'card', 'insurance'], default: 'cash' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "insurance_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "insurance_member_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], RadiologyBooking.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "documents", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyBooking.prototype, "medical_referral_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "prescriptionFiles", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "medicalReports", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "referralFiles", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "medicalJustification", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "allocated_machine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "scanned_files_s3_urls", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "signed_report_pdf_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "report_storage_object_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "clinical_impression_report", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['IN_CENTER', 'MOBILE_HOME_VISIT'], default: 'IN_CENTER' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "delivery_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_type_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['PATIENT_PANIC', 'MACHINE_FAILURE', 'CONTRAST_REACTION', 'CLAUSTROPHOBIA', 'PATIENT_NO_SHOW', 'TECHNICAL_ERROR', 'EMERGENCY_SHUTDOWN'] }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "abort_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['draft', 'under_review', 'ready'], default: 'draft' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "report_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "report_approved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "report_approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "dicom_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "scan_image_urls", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "dicom_storage_object_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "scan_storage_object_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "preparation_confirmed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyBooking.prototype, "preparation_confirmed", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], RadiologyBooking.prototype, "safety_questionnaire", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "checkin_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "scan_started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RadiologyBooking.prototype, "scan_completed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "reschedule_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], RadiologyBooking.prototype, "insurance_copay", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "insurance_approval_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "referring_doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], RadiologyBooking.prototype, "doctor_notified", void 0);
exports.RadiologyBooking = RadiologyBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RadiologyBooking);
exports.RadiologyBookingSchema = mongoose_1.SchemaFactory.createForClass(RadiologyBooking);
exports.RadiologyBookingSchema.index({ patient_id: 1, createdAt: -1 });
exports.RadiologyBookingSchema.index({ state: 1, scheduled_at: 1 });
//# sourceMappingURL=radiology.schema.js.map