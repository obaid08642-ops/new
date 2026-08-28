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
exports.LabResultSchema = exports.LabResult = exports.LabResultType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
var LabResultType;
(function (LabResultType) {
    LabResultType["STRUCTURED"] = "STRUCTURED";
    LabResultType["PDF"] = "PDF";
    LabResultType["IMAGE"] = "IMAGE";
    LabResultType["RADIOLOGY"] = "RADIOLOGY";
})(LabResultType || (exports.LabResultType = LabResultType = {}));
let LabResult = class LabResult extends mongoose_2.Document {
};
exports.LabResult = LabResult;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], LabResult.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.lab_result) }),
    __metadata("design:type", String)
], LabResult.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabResult.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LabResult.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "service_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabResult.prototype, "service_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "service_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(LabResultType) }),
    __metadata("design:type", String)
], LabResult.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'labs', enum: ['labs', 'radiology'], index: true }),
    __metadata("design:type", String)
], LabResult.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabResult.prototype, "entries", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], LabResult.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "findings", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "impression", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "recommendations", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LabResult.prototype, "reported_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "reported_by_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "reported_by_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabResult.prototype, "critical", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], LabResult.prototype, "viewed_by_patient", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LabResult.prototype, "patient_viewed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LabResult.prototype, "notes", void 0);
exports.LabResult = LabResult = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LabResult);
exports.LabResultSchema = mongoose_1.SchemaFactory.createForClass(LabResult);
exports.LabResultSchema.index({ patient_id: 1, createdAt: -1 });
//# sourceMappingURL=lab-result.schema.js.map