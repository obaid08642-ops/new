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
exports.FacilitySchema = exports.Facility = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
const enums_1 = require("../common/enums");
const insurance_schema_1 = require("./insurance.schema");
let Facility = class Facility {
};
exports.Facility = Facility;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Facility.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], Facility.prototype, "parent_facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Facility.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.FacilityType), default: enums_1.FacilityType.HOSPITAL }),
    __metadata("design:type", String)
], Facility.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "description_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "description_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "city", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "district", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number }, _id: false }),
    __metadata("design:type", Object)
], Facility.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "logo_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Facility.prototype, "images", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "phone", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "whatsapp", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "website", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "email", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Facility.prototype, "departments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Facility.prototype, "accepted_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], Facility.prototype, "accepts_insurance", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [insurance_schema_1.InsuranceNetworkContractSchema], default: [] }),
    __metadata("design:type", Array)
], Facility.prototype, "insurance_contracts", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ day: String, open: String, close: String, closed: { type: Boolean, default: false } }], _id: false, default: [] }),
    __metadata("design:type", Array)
], Facility.prototype, "working_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Facility.prototype, "rating", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Facility.prototype, "reviews_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Facility.prototype, "is_active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Facility.prototype, "public_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], Facility.prototype, "indexing_eligibility", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'approved', 'rejected', 'suspended'], default: 'pending', index: true }),
    __metadata("design:type", String)
], Facility.prototype, "medical_review_status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Facility.prototype, "last_reviewed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Facility.prototype, "provenance", void 0);
exports.Facility = Facility = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'facilities' })
], Facility);
exports.FacilitySchema = mongoose_1.SchemaFactory.createForClass(Facility);
//# sourceMappingURL=facility.schema.js.map