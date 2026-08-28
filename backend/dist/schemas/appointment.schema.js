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
exports.AppointmentSchema = exports.Appointment = exports.APPT_TRANSITIONS = exports.APPT_STATES = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
const insurance_schema_1 = require("./insurance.schema");
exports.APPT_STATES = {
    PENDING: 'PENDING',
    CONFIRMED: 'CONFIRMED',
    RESCHEDULED: 'RESCHEDULED',
    CHECKED_IN: 'CHECKED_IN',
    IN_PROGRESS: 'IN_PROGRESS',
    COMPLETED: 'COMPLETED',
    CANCELLED: 'CANCELLED',
    NO_SHOW: 'NO_SHOW',
};
exports.APPT_TRANSITIONS = {
    PENDING: ['CONFIRMED', 'CANCELLED', 'RESCHEDULED'],
    CONFIRMED: ['CHECKED_IN', 'CANCELLED', 'RESCHEDULED', 'NO_SHOW'],
    RESCHEDULED: ['CONFIRMED', 'CANCELLED'],
    CHECKED_IN: ['IN_PROGRESS', 'CANCELLED'],
    IN_PROGRESS: ['COMPLETED', 'CANCELLED'],
    COMPLETED: [],
    CANCELLED: [],
    NO_SHOW: [],
};
let StateLogEntry = class StateLogEntry {
};
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], StateLogEntry.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: Date.now }),
    __metadata("design:type", Date)
], StateLogEntry.prototype, "at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StateLogEntry.prototype, "by_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StateLogEntry.prototype, "by_role", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], StateLogEntry.prototype, "note", void 0);
StateLogEntry = __decorate([
    (0, mongoose_1.Schema)({ _id: false })
], StateLogEntry);
const StateLogSchema = mongoose_1.SchemaFactory.createForClass(StateLogEntry);
let Appointment = class Appointment {
};
exports.Appointment = Appointment;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Appointment.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Appointment.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Appointment.prototype, "doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Appointment.prototype, "doctor_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['clinic', 'video', 'home'], required: true }),
    __metadata("design:type", String)
], Appointment.prototype, "service_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Appointment.prototype, "slot_start", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Appointment.prototype, "slot_end", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 30 }),
    __metadata("design:type", Number)
], Appointment.prototype, "duration_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(exports.APPT_STATES), default: exports.APPT_STATES.PENDING, index: true }),
    __metadata("design:type", String)
], Appointment.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [StateLogSchema], default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "state_history", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Appointment.prototype, "price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Appointment.prototype, "service_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Appointment.prototype, "home_visit_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Appointment.prototype, "transportation_fee", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Appointment.prototype, "total_price", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending' }),
    __metadata("design:type", String)
], Appointment.prototype, "payment_status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['cash', 'card', 'insurance'], default: 'card' }),
    __metadata("design:type", String)
], Appointment.prototype, "payment_method", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "insurance_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "insurance_member_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: insurance_schema_1.InsuranceDetailsSchema }),
    __metadata("design:type", insurance_schema_1.InsuranceDetails)
], Appointment.prototype, "insurance_details", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "patient_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "booked_by_user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "symptoms", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: { lat: Number, lng: Number, address: String },
        _id: false,
    }),
    __metadata("design:type", Object)
], Appointment.prototype, "visit_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({
        type: {
            diagnosis: String,
            notes: String,
            recommendations: String,
            prescription: [{ name: String, dose: String, duration: String }],
            follow_up_recommended: Boolean,
            follow_up_window_days: Number,
            written_at: Date,
        },
        _id: false,
    }),
    __metadata("design:type", Object)
], Appointment.prototype, "summary", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "prescriptions", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "labRequests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "radiologyRequests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ days: Number, reason: String }], default: [] }),
    __metadata("design:type", Array)
], Appointment.prototype, "sickLeaves", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "consultation_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "cancellation_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Appointment.prototype, "rescheduled_from_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Appointment.prototype, "confirmed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Appointment.prototype, "completed_at", void 0);
exports.Appointment = Appointment = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'appointments' })
], Appointment);
exports.AppointmentSchema = mongoose_1.SchemaFactory.createForClass(Appointment);
exports.AppointmentSchema.index({ doctor_id: 1, slot_start: 1 }, { unique: true, partialFilterExpression: { status: { $in: ['PENDING', 'CONFIRMED', 'CHECKED_IN', 'IN_PROGRESS'] } } });
exports.AppointmentSchema.index({ patient_id: 1, slot_start: -1 });
exports.AppointmentSchema.index({ doctor_id: 1, status: 1, slot_start: -1 });
//# sourceMappingURL=appointment.schema.js.map