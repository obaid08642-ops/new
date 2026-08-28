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
exports.CustomServiceRequestSchema = exports.CustomServiceRequest = exports.CustomServiceKind = exports.CustomServiceStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
var CustomServiceStatus;
(function (CustomServiceStatus) {
    CustomServiceStatus["PENDING"] = "PENDING";
    CustomServiceStatus["REVIEWED"] = "REVIEWED";
    CustomServiceStatus["APPROVED"] = "APPROVED";
    CustomServiceStatus["ADDED_TO_CATALOG"] = "ADDED_TO_CATALOG";
    CustomServiceStatus["PROVIDED"] = "PROVIDED";
    CustomServiceStatus["REJECTED"] = "REJECTED";
})(CustomServiceStatus || (exports.CustomServiceStatus = CustomServiceStatus = {}));
var CustomServiceKind;
(function (CustomServiceKind) {
    CustomServiceKind["LAB"] = "LAB";
    CustomServiceKind["RADIOLOGY"] = "RADIOLOGY";
    CustomServiceKind["HOME_CARE"] = "HOME_CARE";
    CustomServiceKind["PHARMACY"] = "PHARMACY";
})(CustomServiceKind || (exports.CustomServiceKind = CustomServiceKind = {}));
let CustomServiceRequest = class CustomServiceRequest extends mongoose_2.Document {
};
exports.CustomServiceRequest = CustomServiceRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)('CSR') }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(CustomServiceKind) }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "doctor_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], CustomServiceRequest.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "doctor_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "prescription_image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: CustomServiceStatus.PENDING, enum: Object.values(CustomServiceStatus) }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], CustomServiceRequest.prototype, "status_history", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "assigned_provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "assigned_provider_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "linked_booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "linked_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "admin_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], CustomServiceRequest.prototype, "resolved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'medium' }),
    __metadata("design:type", String)
], CustomServiceRequest.prototype, "priority", void 0);
exports.CustomServiceRequest = CustomServiceRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], CustomServiceRequest);
exports.CustomServiceRequestSchema = mongoose_1.SchemaFactory.createForClass(CustomServiceRequest);
exports.CustomServiceRequestSchema.index({ patient_id: 1, createdAt: -1 });
exports.CustomServiceRequestSchema.index({ status: 1, kind: 1, createdAt: -1 });
//# sourceMappingURL=custom-service.schema.js.map