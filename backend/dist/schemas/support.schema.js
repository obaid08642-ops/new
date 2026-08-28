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
exports.PatientSettingsSchema = exports.PatientSettings = exports.SupportRequestSchema = exports.SupportRequest = exports.SupportCategory = exports.SupportStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const tracking_1 = require("../common/tracking");
var SupportStatus;
(function (SupportStatus) {
    SupportStatus["OPEN"] = "OPEN";
    SupportStatus["IN_PROGRESS"] = "IN_PROGRESS";
    SupportStatus["RESOLVED"] = "RESOLVED";
    SupportStatus["CLOSED"] = "CLOSED";
})(SupportStatus || (exports.SupportStatus = SupportStatus = {}));
var SupportCategory;
(function (SupportCategory) {
    SupportCategory["GENERAL"] = "GENERAL";
    SupportCategory["ORDER_ISSUE"] = "ORDER_ISSUE";
    SupportCategory["PAYMENT"] = "PAYMENT";
    SupportCategory["TECHNICAL"] = "TECHNICAL";
    SupportCategory["COMPLAINT"] = "COMPLAINT";
    SupportCategory["SUGGESTION"] = "SUGGESTION";
})(SupportCategory || (exports.SupportCategory = SupportCategory = {}));
let SupportRequest = class SupportRequest extends mongoose_2.Document {
};
exports.SupportRequest = SupportRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], SupportRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ unique: true, default: () => (0, tracking_1.trackingId)(tracking_1.TRACK_PREFIX.support) }),
    __metadata("design:type", String)
], SupportRequest.prototype, "tracking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], SupportRequest.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SupportRequest.prototype, "user_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SupportRequest.prototype, "user_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(SupportCategory) }),
    __metadata("design:type", String)
], SupportRequest.prototype, "category", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SupportRequest.prototype, "subject", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], SupportRequest.prototype, "message", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], SupportRequest.prototype, "attachments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: SupportStatus.OPEN, enum: Object.values(SupportStatus) }),
    __metadata("design:type", String)
], SupportRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'patient' }),
    __metadata("design:type", String)
], SupportRequest.prototype, "source_role", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'medium' }),
    __metadata("design:type", String)
], SupportRequest.prototype, "priority", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], SupportRequest.prototype, "thread", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], SupportRequest.prototype, "resolved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], SupportRequest.prototype, "assigned_to", void 0);
exports.SupportRequest = SupportRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], SupportRequest);
exports.SupportRequestSchema = mongoose_1.SchemaFactory.createForClass(SupportRequest);
exports.SupportRequestSchema.index({ user_id: 1, createdAt: -1 });
exports.SupportRequestSchema.index({ status: 1, createdAt: -1 });
let PatientSettings = class PatientSettings extends mongoose_2.Document {
};
exports.PatientSettings = PatientSettings;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true }),
    __metadata("design:type", String)
], PatientSettings.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'ar' }),
    __metadata("design:type", String)
], PatientSettings.prototype, "language", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'light' }),
    __metadata("design:type", String)
], PatientSettings.prototype, "theme", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'gregorian' }),
    __metadata("design:type", String)
], PatientSettings.prototype, "calendar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PatientSettings.prototype, "notifications_enabled", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PatientSettings.prototype, "notif_reminders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PatientSettings.prototype, "notif_orders", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PatientSettings.prototype, "notif_appointments", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], PatientSettings.prototype, "notif_lab_results", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], PatientSettings.prototype, "expo_push_token", void 0);
exports.PatientSettings = PatientSettings = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], PatientSettings);
exports.PatientSettingsSchema = mongoose_1.SchemaFactory.createForClass(PatientSettings);
//# sourceMappingURL=support.schema.js.map