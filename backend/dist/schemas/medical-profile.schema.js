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
exports.MedicalProfileSchema = exports.MedicalProfile = exports.BloodType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
var BloodType;
(function (BloodType) {
    BloodType["A_POS"] = "A+";
    BloodType["A_NEG"] = "A-";
    BloodType["B_POS"] = "B+";
    BloodType["B_NEG"] = "B-";
    BloodType["AB_POS"] = "AB+";
    BloodType["AB_NEG"] = "AB-";
    BloodType["O_POS"] = "O+";
    BloodType["O_NEG"] = "O-";
    BloodType["UNKNOWN"] = "unknown";
})(BloodType || (exports.BloodType = BloodType = {}));
let MedicalProfile = class MedicalProfile extends mongoose_2.Document {
};
exports.MedicalProfile = MedicalProfile;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalProfile.prototype, "blood_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MedicalProfile.prototype, "height_cm", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MedicalProfile.prototype, "weight_kg", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "birth_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'unspecified' }),
    __metadata("design:type", String)
], MedicalProfile.prototype, "gender", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "is_pregnant", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], MedicalProfile.prototype, "pregnancy_weeks", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "is_breastfeeding", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "is_smoker", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalProfile.prototype, "drinks_alcohol", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "chronic_diseases", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "allergies", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "surgeries", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "long_term_medications", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalProfile.prototype, "family_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], MedicalProfile.prototype, "emergency_contact", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalProfile.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicalProfile.prototype, "last_updated_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalProfile.prototype, "last_updated_by_id", void 0);
exports.MedicalProfile = MedicalProfile = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MedicalProfile);
exports.MedicalProfileSchema = mongoose_1.SchemaFactory.createForClass(MedicalProfile);
//# sourceMappingURL=medical-profile.schema.js.map