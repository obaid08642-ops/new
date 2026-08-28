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
exports.SleepReadingSchema = exports.SleepReading = exports.MedicationReminderSchema = exports.MedicationReminder = exports.VitalReadingSchema = exports.VitalReading = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let VitalReading = class VitalReading extends mongoose_2.Document {
};
exports.VitalReading = VitalReading;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], VitalReading.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], VitalReading.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], VitalReading.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], VitalReading.prototype, "value", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], VitalReading.prototype, "value_secondary", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VitalReading.prototype, "unit", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], VitalReading.prototype, "measured_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VitalReading.prototype, "context", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], VitalReading.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'manual' }),
    __metadata("design:type", String)
], VitalReading.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: null, index: true }),
    __metadata("design:type", Date)
], VitalReading.prototype, "deleted_at", void 0);
exports.VitalReading = VitalReading = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], VitalReading);
exports.VitalReadingSchema = mongoose_1.SchemaFactory.createForClass(VitalReading);
exports.VitalReadingSchema.index({ patient_id: 1, type: 1, measured_at: -1, deleted_at: 1 });
let MedicationReminder = class MedicationReminder extends mongoose_2.Document {
};
exports.MedicationReminder = MedicationReminder;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "medicine_name_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "medicine_name_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "medicine_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "prescription_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "dose", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], MedicationReminder.prototype, "dosage_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'tablet' }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "dosage_form", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicationReminder.prototype, "times", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'UTC' }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "time_zone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'daily' }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "frequency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], MedicationReminder.prototype, "start_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicationReminder.prototype, "end_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MedicationReminder.prototype, "duration_days", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "instructions_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'manual' }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "source", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], MedicationReminder.prototype, "active", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], MedicationReminder.prototype, "log", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], MedicationReminder.prototype, "chronic", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], MedicationReminder.prototype, "pills_remaining", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicationReminder.prototype, "refill_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], MedicationReminder.prototype, "refill_pending_order_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], MedicationReminder.prototype, "refill_creation_lock", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], MedicationReminder.prototype, "refill_fulfilled_at", void 0);
exports.MedicationReminder = MedicationReminder = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], MedicationReminder);
exports.MedicationReminderSchema = mongoose_1.SchemaFactory.createForClass(MedicationReminder);
exports.MedicationReminderSchema.index({ patient_id: 1, active: 1 });
let SleepReading = class SleepReading extends mongoose_2.Document {
};
exports.SleepReading = SleepReading;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], SleepReading.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SleepReading.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SleepReading.prototype, "sleep_score", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], SleepReading.prototype, "duration_hours", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: () => new Date() }),
    __metadata("design:type", Date)
], SleepReading.prototype, "measured_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'device' }),
    __metadata("design:type", String)
], SleepReading.prototype, "source", void 0);
exports.SleepReading = SleepReading = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SleepReading);
exports.SleepReadingSchema = mongoose_1.SchemaFactory.createForClass(SleepReading);
exports.SleepReadingSchema.index({ patient_id: 1, measured_at: -1 });
//# sourceMappingURL=health.schema.js.map