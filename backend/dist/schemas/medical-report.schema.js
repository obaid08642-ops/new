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
exports.MedicalReportSchema = exports.MedicalReport = exports.MedicalReportType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
var MedicalReportType;
(function (MedicalReportType) {
    MedicalReportType["CLINIC_NOTE"] = "clinic_note";
    MedicalReportType["DISCHARGE_SUMMARY"] = "discharge_summary";
    MedicalReportType["SURGERY_REPORT"] = "surgery_report";
    MedicalReportType["CONSULTATION_NOTE"] = "consultation_note";
    MedicalReportType["SECOND_OPINION"] = "second_opinion";
    MedicalReportType["MEDICAL_CERTIFICATE"] = "medical_certificate";
    MedicalReportType["REFERRAL"] = "referral";
    MedicalReportType["OTHER"] = "other";
})(MedicalReportType || (exports.MedicalReportType = MedicalReportType = {}));
let MedicalReport = class MedicalReport extends mongoose_2.Document {
};
exports.MedicalReport = MedicalReport;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MedicalReport.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.medical_report) }),
    __metadata("design:type", String)
], MedicalReport.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "title_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "title_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(MedicalReportType), default: MedicalReportType.CLINIC_NOTE }),
    __metadata("design:type", String)
], MedicalReport.prototype, "report_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "summary", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "body", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "diagnosis", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "recommendations", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalReport.prototype, "critical", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "prescription_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "lab_booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicalReport.prototype, "radiology_booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "doctor_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicalReport.prototype, "facility_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicalReport.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicalReport.prototype, "issued_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicalReport.prototype, "viewed_by_patient", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicalReport.prototype, "patient_viewed_at", void 0);
exports.MedicalReport = MedicalReport = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MedicalReport);
exports.MedicalReportSchema = mongoose_1.SchemaFactory.createForClass(MedicalReport);
exports.MedicalReportSchema.index({ patient_id: 1, createdAt: -1 });
exports.MedicalReportSchema.index({ report_type: 1, patient_id: 1 });
//# sourceMappingURL=medical-report.schema.js.map