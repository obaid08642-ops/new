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
exports.LabBookingSchema = exports.LabBooking = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let LabBooking = class LabBooking {
};
exports.LabBooking = LabBooking;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'Appointment', default: null, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LabBooking.prototype, "parent_appointment_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LabBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String }),
    __metadata("design:type", String)
], LabBooking.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], LabBooking.prototype, "patient_age", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true, index: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], LabBooking.prototype, "lab_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['IN_LAB', 'HOME_COLLECTION'], default: 'IN_LAB' }),
    __metadata("design:type", String)
], LabBooking.prototype, "delivery_mode", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], LabBooking.prototype, "address", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabBooking.prototype, "test_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabBooking.prototype, "test_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LabBooking.prototype, "test_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null, index: true }),
    __metadata("design:type", String)
], LabBooking.prototype, "sample_barcode_token", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: String,
        enum: ['PENDING_ACCEPTANCE', 'ACCEPTED', 'SAMPLE_COLLECTED', 'LAB_PROCESSING', 'REPORT_UPLOADED', 'CANCELLED'],
        default: 'PENDING_ACCEPTANCE',
        index: true
    }),
    __metadata("design:type", String)
], LabBooking.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: [{
                parameter_name: String,
                numeric_value: Number,
                unit: String,
                is_abnormal: Boolean,
                flag_type: { type: String, enum: ['NORMAL', 'HIGH', 'LOW'], default: 'NORMAL' }
            }],
        default: []
    }),
    __metadata("design:type", Array)
], LabBooking.prototype, "entered_metric_results", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, default: null }),
    __metadata("design:type", String)
], LabBooking.prototype, "signed_report_pdf_url", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['cash', 'card', 'insurance'], default: 'cash' }),
    __metadata("design:type", String)
], LabBooking.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LabBooking.prototype, "total_price", void 0);
exports.LabBooking = LabBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LabBooking);
exports.LabBookingSchema = mongoose_1.SchemaFactory.createForClass(LabBooking);
//# sourceMappingURL=lab-booking.schema.js.map