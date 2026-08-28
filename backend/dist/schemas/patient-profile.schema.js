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
exports.PatientProfileSchema = exports.PatientProfile = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let PatientProfile = class PatientProfile {
};
exports.PatientProfile = PatientProfile;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], PatientProfile.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], PatientProfile.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PatientProfile.prototype, "age", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['male', 'female'] }),
    __metadata("design:type", String)
], PatientProfile.prototype, "gender", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "blood_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PatientProfile.prototype, "weight", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], PatientProfile.prototype, "height", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], PatientProfile.prototype, "allergies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], PatientProfile.prototype, "chronic_diseases", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], PatientProfile.prototype, "current_medications", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ id: String, name: String, phone: String, relation: String, isPrimary: Boolean }], _id: false, default: [] }),
    __metadata("design:type", Array)
], PatientProfile.prototype, "emergency_contacts", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "full_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "dob", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientProfile.prototype, "national_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PatientProfile.prototype, "notification_settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PatientProfile.prototype, "privacy_settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], PatientProfile.prototype, "security_settings", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                id: String,
                label: String,
                street: String,
                city: String,
                lat: Number,
                lng: Number,
                is_default: Boolean,
            }],
        _id: false,
        default: [],
    }),
    __metadata("design:type", Array)
], PatientProfile.prototype, "addresses", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            provider: String,
            policy_number: String,
            network: String,
            class: String,
            expiry_date: String,
            member_name: String,
            national_id: String,
            verified: Boolean,
            pdf_url: String,
            ocr_extracted: Boolean,
            nphies_eligible: Boolean,
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], PatientProfile.prototype, "insurance", void 0);
exports.PatientProfile = PatientProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'patient_profiles' })
], PatientProfile);
exports.PatientProfileSchema = mongoose_1.SchemaFactory.createForClass(PatientProfile);
//# sourceMappingURL=patient-profile.schema.js.map