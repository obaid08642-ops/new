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
exports.MedicalSupplyRequestSchema = exports.MedicalSupplyRequest = exports.HomeCarePackageSchema = exports.HomeCarePackage = exports.CarePlanSchema = exports.CarePlan = exports.NursingVisitReportSchema = exports.NursingVisitReport = exports.NurseProviderSchema = exports.NurseProvider = exports.HomeCareBookingSchema = exports.HomeCareBooking = exports.HomeCareServiceSchema = exports.HomeCareService = exports.HomeCareBookingState = exports.NursingBookingState = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
const insurance_schema_1 = require("./insurance.schema");
var NursingBookingState;
(function (NursingBookingState) {
    NursingBookingState["NEW_REQUEST"] = "NEW_REQUEST";
    NursingBookingState["PENDING_INSURANCE"] = "PENDING_INSURANCE";
    NursingBookingState["WAITING_COPAY"] = "WAITING_COPAY";
    NursingBookingState["CONFIRMED"] = "CONFIRMED";
    NursingBookingState["IN_TRANSIT"] = "IN_TRANSIT";
    NursingBookingState["ARRIVED"] = "ARRIVED";
    NursingBookingState["CARE_IN_PROGRESS"] = "CARE_IN_PROGRESS";
    NursingBookingState["IN_PROGRESS"] = "IN_PROGRESS";
    NursingBookingState["COMPLETED"] = "COMPLETED";
    NursingBookingState["PROVIDER_ASSIGNED"] = "PROVIDER_ASSIGNED";
    NursingBookingState["NO_SHOW"] = "NO_SHOW";
    NursingBookingState["ESCALATED_EMERGENCY"] = "ESCALATED_EMERGENCY";
    NursingBookingState["CANCELLED"] = "CANCELLED";
})(NursingBookingState || (exports.NursingBookingState = NursingBookingState = {}));
exports.HomeCareBookingState = NursingBookingState;
let HomeCareService = class HomeCareService extends mongoose_2.Document {
};
exports.HomeCareService = HomeCareService;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], HomeCareService.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareService.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareService.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareService.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareService.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HomeCareService.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'general' }),
    __metadata("design:type", String)
], HomeCareService.prototype, "icon", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HomeCareService.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareService.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], HomeCareService.prototype, "duration_value", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "requires_patient_medication", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "requires_companion", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "cash_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "insurance_availability", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareService.prototype, "image_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "is_deleted", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], HomeCareService.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], HomeCareService.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], HomeCareService.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareService.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeCareService.prototype, "popularity", void 0);
exports.HomeCareService = HomeCareService = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeCareService);
exports.HomeCareServiceSchema = mongoose_1.SchemaFactory.createForClass(HomeCareService);
let HomeCareBooking = class HomeCareBooking extends mongoose_2.Document {
};
exports.HomeCareBooking = HomeCareBooking;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.home_care) }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "service_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "service_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "service_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "sessions_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "duration", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "service_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "transportation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], HomeCareBooking.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: NursingBookingState.NEW_REQUEST, enum: Object.values(NursingBookingState) }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], HomeCareBooking.prototype, "state_history", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "provider_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "provider_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['none', 'pending', 'approved', 'rejected'], default: 'none' }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "insurance_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], HomeCareBooking.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "checklist", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "gps_tracking", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "timers", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "vitals", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "clinical_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "procedure_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "medication_administered", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "consumables_used", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "recommendations", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "follow_up_instructions", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "before_procedure_image", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "after_procedure_image", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "patient_signature_base64", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "emergency_escalation", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], HomeCareBooking.prototype, "audit_trail", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "referring_doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "rating", void 0);
exports.HomeCareBooking = HomeCareBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeCareBooking);
exports.HomeCareBookingSchema = mongoose_1.SchemaFactory.createForClass(HomeCareBooking);
exports.HomeCareBookingSchema.index({ patient_id: 1, createdAt: -1 });
exports.HomeCareBookingSchema.index({ state: 1, scheduled_at: 1 });
exports.HomeCareBookingSchema.pre('save', function (next) {
    const self = this;
    if (self.total_price == null)
        self.total_price = self.service_fee || 0;
    if (self.total == null)
        self.total = self.total_price;
    next();
});
let NurseProvider = class NurseProvider extends mongoose_2.Document {
};
exports.NurseProvider = NurseProvider;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], NurseProvider.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NurseProvider.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NurseProvider.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NurseProvider.prototype, "facility_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], NurseProvider.prototype, "distance_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], NurseProvider.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], NurseProvider.prototype, "available_now", void 0);
exports.NurseProvider = NurseProvider = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'nurse_providers' })
], NurseProvider);
exports.NurseProviderSchema = mongoose_1.SchemaFactory.createForClass(NurseProvider);
let NursingVisitReport = class NursingVisitReport extends mongoose_2.Document {
};
exports.NursingVisitReport = NursingVisitReport;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], NursingVisitReport.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], NursingVisitReport.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NursingVisitReport.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], NursingVisitReport.prototype, "nurse_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], NursingVisitReport.prototype, "check_in_time", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], NursingVisitReport.prototype, "check_out_time", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NursingVisitReport.prototype, "gps_lat", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], NursingVisitReport.prototype, "gps_lng", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], NursingVisitReport.prototype, "completed_tasks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], NursingVisitReport.prototype, "vitals_logged", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], NursingVisitReport.prototype, "vital_signs", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], NursingVisitReport.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String] }),
    __metadata("design:type", Array)
], NursingVisitReport.prototype, "procedures_performed", void 0);
exports.NursingVisitReport = NursingVisitReport = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], NursingVisitReport);
exports.NursingVisitReportSchema = mongoose_1.SchemaFactory.createForClass(NursingVisitReport);
let CarePlan = class CarePlan extends mongoose_2.Document {
};
exports.CarePlan = CarePlan;
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], CarePlan.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CarePlan.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CarePlan.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CarePlan.prototype, "nurse_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CarePlan.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CarePlan.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], CarePlan.prototype, "tasks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'active', index: true }),
    __metadata("design:type", String)
], CarePlan.prototype, "status", void 0);
exports.CarePlan = CarePlan = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CarePlan);
exports.CarePlanSchema = mongoose_1.SchemaFactory.createForClass(CarePlan);
let HomeCarePackage = class HomeCarePackage extends mongoose_2.Document {
};
exports.HomeCarePackage = HomeCarePackage;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCarePackage.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCarePackage.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCarePackage.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], HomeCarePackage.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], HomeCarePackage.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], HomeCarePackage.prototype, "visits_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], HomeCarePackage.prototype, "duration_days", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], HomeCarePackage.prototype, "service_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true, index: true }),
    __metadata("design:type", Boolean)
], HomeCarePackage.prototype, "active", void 0);
exports.HomeCarePackage = HomeCarePackage = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeCarePackage);
exports.HomeCarePackageSchema = mongoose_1.SchemaFactory.createForClass(HomeCarePackage);
let MedicalSupplyRequest = class MedicalSupplyRequest extends mongoose_2.Document {
};
exports.MedicalSupplyRequest = MedicalSupplyRequest;
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicalSupplyRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MedicalSupplyRequest.prototype, "visit_report_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MedicalSupplyRequest.prototype, "nurse_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ name: { type: String, required: true }, qty: { type: Number, required: true }, unit: { type: String, default: 'pcs' }, status: { type: String, default: 'pending' } }],
        default: [],
    }),
    __metadata("design:type", Array)
], MedicalSupplyRequest.prototype, "items", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', index: true }),
    __metadata("design:type", String)
], MedicalSupplyRequest.prototype, "status", void 0);
exports.MedicalSupplyRequest = MedicalSupplyRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MedicalSupplyRequest);
exports.MedicalSupplyRequestSchema = mongoose_1.SchemaFactory.createForClass(MedicalSupplyRequest);
//# sourceMappingURL=home-care.schema.js.map