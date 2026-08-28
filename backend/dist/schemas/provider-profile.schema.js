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
exports.ProviderProfileSchema = exports.ProviderProfile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
const insurance_schema_1 = require("./insurance.schema");
const slug_util_1 = require("../common/slug.util");
let ProviderProfile = class ProviderProfile {
};
exports.ProviderProfile = ProviderProfile;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "slug", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, sparse: true, index: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.ProviderType), required: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.ProviderStatus), default: enums_1.ProviderStatus.PENDING }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "scfhs_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "cr_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "moh_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "sfda_license_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "tax_number", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderProfile.prototype, "license_expiry_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending_documents', 'pending_verification', 'verified', 'rejected', 'suspended', 'expired'], default: 'pending_documents' }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "license_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "license_documents", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "license_verified", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderProfile.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "provenance", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                status: String,
                verified_by: String,
                verified_at: Date,
                notes: String,
            }],
        _id: false,
        default: []
    }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "verification_logs", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "district", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number }, _id: false }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "reviews_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "rating_avg", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "rating_count", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "iban", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "bank_account_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "specialty", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "sub_specialties", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "title", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "years_experience", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "consultation_modes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "price_clinic", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "price_online", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "price_home", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "hospital", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "radiation_safety_license", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "available_equipment_text", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "clinic_images", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['professor', 'consultant', 'senior_specialist', 'specialist', 'resident', 'general_practitioner'] }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "academic_degree", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "bio", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "languages", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "accepted_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "accepts_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "insurance_clinic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "insurance_online", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "insurance_home", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [insurance_schema_1.InsuranceNetworkContractSchema], default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "insurance_contracts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "has_insurance_officer", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "pharmacy_chain", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "has_own_drivers", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "delivery_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "has_own_delivery", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['self_delivery', 'external_delivery_required'], default: 'external_delivery_required' }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "delivery_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 10 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "max_delivery_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "estimated_delivery_time", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "delivery_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "free_delivery_above", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "min_order_sar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "express_delivery", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "express_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "express_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "rx_dispensing", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "otc_selling", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "enabled_categories", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['male', 'female', 'any'] }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "gender", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "nationality", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "pricingModel", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "priceVisit", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "priceHour", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "priceDay", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "priceMonth", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "rating_details", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "test_categories", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 10 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "coverage_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "home_visit_supported", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "home_visit_radius_km", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "accepts_cash", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                doctor_user_id: String,
                name: String,
                email: String,
                specialty: String,
                modes: [String],
                price_clinic: Number,
                price_online: Number,
                price_home: Number,
                insurance_clinic: { type: Boolean, default: false },
                insurance_online: { type: Boolean, default: false },
                insurance_home: { type: Boolean, default: false },
                clinic_images: [String],
                working_hours: [{ day: String, open: String, close: String, open_evening: String, close_evening: String, closed: { type: Boolean, default: false } }]
            }],
        _id: false, default: [],
    }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "doctors_roster", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], _id: false, default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "lab_roster", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], _id: false, default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "radiology_roster", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], _id: false, default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "nursing_roster", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ key: String, name_ar: String, name_en: String, price: Number, requires_prescription: { type: Boolean, default: false } }],
        _id: false, default: [],
    }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "nursing_services", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "equipment_list", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['any', 'male_only', 'female_only'], default: 'any' }),
    __metadata("design:type", String)
], ProviderProfile.prototype, "gender_pref", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "onboarding_step", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "onboarding_completed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "signer_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "signer_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "signature_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{ day: String, open: String, close: String, open_evening: String, close_evening: String, closed: { type: Boolean, default: false } }],
        _id: false,
        default: [],
    }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "working_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 10 }),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "commission_rate", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "national_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "clinic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "display_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "display_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "profile_photo", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "logo", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "clinic_duration", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "video_duration", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Boolean)
], ProviderProfile.prototype, "home_transport_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderProfile.prototype, "home_transport_price", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "vacation_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "schedule_video", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "schedule_clinic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderProfile.prototype, "schedule_home", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, default: {} }),
    __metadata("design:type", Object)
], ProviderProfile.prototype, "registration_steps", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "rejected_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderProfile.prototype, "approved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderProfile.prototype, "approved_by", void 0);
exports.ProviderProfile = ProviderProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_profiles' })
], ProviderProfile);
exports.ProviderProfileSchema = mongoose_1.SchemaFactory.createForClass(ProviderProfile);
exports.ProviderProfileSchema.pre('save', function (next) {
    if (this.isModified('name_ar') || this.isModified('name_en') || !this.slug) {
        const name = this.name_ar || this.name_en || 'provider';
        this.slug = (0, slug_util_1.buildSlug)(name, this.id);
    }
    next();
});
//# sourceMappingURL=provider-profile.schema.js.map