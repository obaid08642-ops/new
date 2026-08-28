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
exports.HomeCareBookingSchema = exports.HomeCareBooking = exports.BookingStatus = exports.TransportType = exports.PaymentMethod = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CASH"] = "cash";
    PaymentMethod["INSURANCE"] = "insurance";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var TransportType;
(function (TransportType) {
    TransportType["PATIENT_PROVIDED"] = "patient";
    TransportType["NURSE_PROVIDED"] = "nurse";
})(TransportType || (exports.TransportType = TransportType = {}));
var BookingStatus;
(function (BookingStatus) {
    BookingStatus["PENDING_INSURANCE"] = "pending_insurance";
    BookingStatus["PENDING_PAYMENT"] = "pending_payment";
    BookingStatus["CONFIRMED"] = "confirmed";
    BookingStatus["IN_PROGRESS"] = "in_progress";
    BookingStatus["COMPLETED"] = "completed";
})(BookingStatus || (exports.BookingStatus = BookingStatus = {}));
let HomeCareBooking = class HomeCareBooking extends mongoose_2.Document {
};
exports.HomeCareBooking = HomeCareBooking;
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "nurse_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "service_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], required: true }),
    __metadata("design:type", Array)
], HomeCareBooking.prototype, "selected_dates", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "selected_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "frequency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: TransportType }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "transport_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "patient_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: PaymentMethod }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: BookingStatus }),
    __metadata("design:type", String)
], HomeCareBooking.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "total_amount", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], HomeCareBooking.prototype, "transport_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], HomeCareBooking.prototype, "insurance_details", void 0);
exports.HomeCareBooking = HomeCareBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], HomeCareBooking);
exports.HomeCareBookingSchema = mongoose_1.SchemaFactory.createForClass(HomeCareBooking);
//# sourceMappingURL=home-care-booking.schema.js.map