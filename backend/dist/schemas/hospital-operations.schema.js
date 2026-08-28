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
exports.SurgeryBookingSchema = exports.SurgeryBooking = exports.AttendanceSchema = exports.Attendance = exports.ShiftSchema = exports.Shift = exports.AdmissionSchema = exports.Admission = exports.BedSchema = exports.Bed = exports.WardSchema = exports.Ward = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let Ward = class Ward {
};
exports.Ward = Ward;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Ward.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Ward.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Ward.prototype, "name", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Ward.prototype, "total_beds", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], Ward.prototype, "available_beds", void 0);
exports.Ward = Ward = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'facility_wards' })
], Ward);
exports.WardSchema = mongoose_1.SchemaFactory.createForClass(Ward);
let Bed = class Bed {
};
exports.Bed = Bed;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Bed.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Bed.prototype, "ward_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Bed.prototype, "bed_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['general', 'icu', 'ccu'], default: 'general' }),
    __metadata("design:type", String)
], Bed.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['available', 'occupied', 'reserved'], default: 'available' }),
    __metadata("design:type", String)
], Bed.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Bed.prototype, "occupied_by_patient_id", void 0);
exports.Bed = Bed = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'facility_beds' })
], Bed);
exports.BedSchema = mongoose_1.SchemaFactory.createForClass(Bed);
let Admission = class Admission {
};
exports.Admission = Admission;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Admission.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Admission.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Admission.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Admission.prototype, "bed_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], Admission.prototype, "admitted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Admission.prototype, "discharged_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['active', 'discharged'], default: 'active' }),
    __metadata("design:type", String)
], Admission.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], Admission.prototype, "discharge_summary", void 0);
exports.Admission = Admission = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'facility_admissions' })
], Admission);
exports.AdmissionSchema = mongoose_1.SchemaFactory.createForClass(Admission);
let Shift = class Shift {
};
exports.Shift = Shift;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Shift.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Shift.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Shift.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Shift.prototype, "department_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "start_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "end_time", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Shift.prototype, "day_of_week", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['scheduled', 'substitute', 'cancelled'], default: 'scheduled' }),
    __metadata("design:type", String)
], Shift.prototype, "status", void 0);
exports.Shift = Shift = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'staff_shifts' })
], Shift);
exports.ShiftSchema = mongoose_1.SchemaFactory.createForClass(Shift);
let Attendance = class Attendance {
};
exports.Attendance = Attendance;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], Attendance.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Attendance.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], Attendance.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], Attendance.prototype, "check_in_time", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], Attendance.prototype, "check_out_time", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Attendance.prototype, "location_lat", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Attendance.prototype, "location_lng", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['present', 'absent', 'late', 'excused'], default: 'present' }),
    __metadata("design:type", String)
], Attendance.prototype, "status", void 0);
exports.Attendance = Attendance = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'staff_attendance' })
], Attendance);
exports.AttendanceSchema = mongoose_1.SchemaFactory.createForClass(Attendance);
let SurgeryBooking = class SurgeryBooking {
};
exports.SurgeryBooking = SurgeryBooking;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "primary_surgeon_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], SurgeryBooking.prototype, "assistants", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "ot_room_number", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], SurgeryBooking.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SurgeryBooking.prototype, "duration_mins", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'confirmed', 'completed', 'cancelled'], default: 'pending' }),
    __metadata("design:type", String)
], SurgeryBooking.prototype, "status", void 0);
exports.SurgeryBooking = SurgeryBooking = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'surgery_bookings' })
], SurgeryBooking);
exports.SurgeryBookingSchema = mongoose_1.SchemaFactory.createForClass(SurgeryBooking);
//# sourceMappingURL=hospital-operations.schema.js.map