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
exports.RadiologyBookingSchema = exports.RadiologyBooking = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let RadiologyBooking = class RadiologyBooking {
};
exports.RadiologyBooking = RadiologyBooking;
__decorate([
    (0, mongoose_1.Prop)({ type: String, unique: true, index: true }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Appointment', default: null, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], RadiologyBooking.prototype, "parent_appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], RadiologyBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', default: null, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], RadiologyBooking.prototype, "radiology_center_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['IN_CENTER', 'MOBILE_HOME_VISIT'], default: 'IN_CENTER' }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "delivery_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "referring_doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_type_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "scan_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "allocated_machine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: [
            'PENDING_ACCEPTANCE', 'ACCEPTED', 'CHECKED_IN', 'SCANNING_COMPLETED', 'REPORT_UPLOADED', 'CANCELLED',
            'NEW_REQUEST', 'PENDING_INSURANCE', 'WAITING_COPAY', 'CONFIRMED', 'ARRIVED_CHECKIN',
            'IN_SCANNING', 'REPORT_DRAFT', 'UNDER_REVIEW', 'REPORT_READY', 'SCAN_ABORTED',
        ],
        default: 'PENDING_ACCEPTANCE',
        index: true
    }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], RadiologyBooking.prototype, "clinical_impression_report", void 0);
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
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], RadiologyBooking.prototype, "scan_storage_object_ids", void 0);
exports.RadiologyBooking = RadiologyBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RadiologyBooking);
exports.RadiologyBookingSchema = mongoose_1.SchemaFactory.createForClass(RadiologyBooking);
//# sourceMappingURL=radiology-booking.schema.js.map