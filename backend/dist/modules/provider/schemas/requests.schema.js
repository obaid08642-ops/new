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
exports.ProviderAvailabilitySchema = exports.ProviderAvailability = exports.ProviderAvailabilityStatus = exports.ProviderNotificationSchema = exports.ProviderNotification = exports.ProviderNotificationType = exports.ProviderRequestSchema = exports.ProviderRequest = exports.ProviderRequestPriority = exports.PROVIDER_REQUEST_TRANSITIONS = exports.ProviderRequestStatus = exports.ProviderRequestType = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
var ProviderRequestType;
(function (ProviderRequestType) {
    ProviderRequestType["PHARMACY"] = "pharmacy";
    ProviderRequestType["LAB"] = "lab";
    ProviderRequestType["RADIOLOGY"] = "radiology";
    ProviderRequestType["DOCTOR"] = "doctor";
    ProviderRequestType["HOME_CARE"] = "home_care";
})(ProviderRequestType || (exports.ProviderRequestType = ProviderRequestType = {}));
var ProviderRequestStatus;
(function (ProviderRequestStatus) {
    ProviderRequestStatus["PENDING"] = "pending";
    ProviderRequestStatus["ACCEPTED"] = "accepted";
    ProviderRequestStatus["REJECTED"] = "rejected";
    ProviderRequestStatus["IN_PROGRESS"] = "in_progress";
    ProviderRequestStatus["COMPLETED"] = "completed";
    ProviderRequestStatus["CANCELLED"] = "cancelled";
})(ProviderRequestStatus || (exports.ProviderRequestStatus = ProviderRequestStatus = {}));
exports.PROVIDER_REQUEST_TRANSITIONS = {
    [ProviderRequestStatus.PENDING]: [ProviderRequestStatus.ACCEPTED, ProviderRequestStatus.REJECTED, ProviderRequestStatus.CANCELLED],
    [ProviderRequestStatus.ACCEPTED]: [ProviderRequestStatus.IN_PROGRESS, ProviderRequestStatus.COMPLETED, ProviderRequestStatus.CANCELLED],
    [ProviderRequestStatus.IN_PROGRESS]: [ProviderRequestStatus.COMPLETED, ProviderRequestStatus.CANCELLED],
    [ProviderRequestStatus.REJECTED]: [],
    [ProviderRequestStatus.COMPLETED]: [],
    [ProviderRequestStatus.CANCELLED]: [],
};
var ProviderRequestPriority;
(function (ProviderRequestPriority) {
    ProviderRequestPriority["URGENT"] = "urgent";
    ProviderRequestPriority["NORMAL"] = "normal";
    ProviderRequestPriority["LOW"] = "low";
})(ProviderRequestPriority || (exports.ProviderRequestPriority = ProviderRequestPriority = {}));
let ProviderRequest = class ProviderRequest extends mongoose_2.Document {
};
exports.ProviderRequest = ProviderRequest;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: false, index: true, default: null }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(ProviderRequestType), index: true }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: ProviderRequestStatus.PENDING, enum: Object.values(ProviderRequestStatus), index: true }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: ProviderRequestPriority.NORMAL, enum: Object.values(ProviderRequestPriority) }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "priority", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'assigned', enum: ['unassigned', 'matching', 'broadcasted', 'assigned', 'failed'], index: true }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "assignment_state", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'manual', enum: ['auto_best', 'broadcast', 'manual'] }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "assignment_strategy", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "assignment_timeout_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [String], default: [] }),
    __metadata("design:type", Array)
], ProviderRequest.prototype, "attempted_provider_ids", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderRequest.prototype, "patient_location", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object }),
    __metadata("design:type", Object)
], ProviderRequest.prototype, "match_breakdown", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], ProviderRequest.prototype, "patient", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true, default: {} }),
    __metadata("design:type", Object)
], ProviderRequest.prototype, "payload", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderRequest.prototype, "summary_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderRequest.prototype, "summary_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "scheduled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], ProviderRequest.prototype, "scheduled_slot_minutes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ProviderRequest.prototype, "amount_total", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'SAR' }),
    __metadata("design:type", String)
], ProviderRequest.prototype, "currency", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderRequest.prototype, "timeline", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [Object], default: [] }),
    __metadata("design:type", Array)
], ProviderRequest.prototype, "provider_action_log", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderRequest.prototype, "rejection_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderRequest.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "accepted_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "rejected_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "started_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "completed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderRequest.prototype, "cancelled_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ProviderRequest.prototype, "seeded", void 0);
exports.ProviderRequest = ProviderRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_requests' })
], ProviderRequest);
exports.ProviderRequestSchema = mongoose_1.SchemaFactory.createForClass(ProviderRequest);
exports.ProviderRequestSchema.index({ provider_account_id: 1, status: 1, createdAt: -1 });
exports.ProviderRequestSchema.index({ provider_account_id: 1, type: 1, createdAt: -1 });
exports.ProviderRequestSchema.index({ provider_account_id: 1, scheduled_at: 1 });
var ProviderNotificationType;
(function (ProviderNotificationType) {
    ProviderNotificationType["NEW_REQUEST"] = "new_request";
    ProviderNotificationType["REQUEST_STATUS"] = "request_status";
    ProviderNotificationType["REQUEST_CANCELLED"] = "request_cancelled";
    ProviderNotificationType["ADMIN_MESSAGE"] = "admin_message";
    ProviderNotificationType["BOOKING_UPDATE"] = "booking_update";
    ProviderNotificationType["KYC_UPDATE"] = "kyc_update";
    ProviderNotificationType["BANK_UPDATE"] = "bank_update";
    ProviderNotificationType["PAYOUT"] = "payout";
})(ProviderNotificationType || (exports.ProviderNotificationType = ProviderNotificationType = {}));
let ProviderNotification = class ProviderNotification extends mongoose_2.Document {
};
exports.ProviderNotification = ProviderNotification;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], ProviderNotification.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProviderNotification.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: Object.values(ProviderNotificationType), index: true }),
    __metadata("design:type", String)
], ProviderNotification.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderNotification.prototype, "title_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProviderNotification.prototype, "title_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderNotification.prototype, "body_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderNotification.prototype, "body_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderNotification.prototype, "icon", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderNotification.prototype, "related_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderNotification.prototype, "related_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false, index: true }),
    __metadata("design:type", Boolean)
], ProviderNotification.prototype, "read", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderNotification.prototype, "read_at", void 0);
exports.ProviderNotification = ProviderNotification = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_notifications' })
], ProviderNotification);
exports.ProviderNotificationSchema = mongoose_1.SchemaFactory.createForClass(ProviderNotification);
exports.ProviderNotificationSchema.index({ provider_account_id: 1, read: 1, createdAt: -1 });
var ProviderAvailabilityStatus;
(function (ProviderAvailabilityStatus) {
    ProviderAvailabilityStatus["ONLINE"] = "online";
    ProviderAvailabilityStatus["OFFLINE"] = "offline";
    ProviderAvailabilityStatus["BUSY"] = "busy";
    ProviderAvailabilityStatus["ACCEPTING_ORDERS"] = "accepting_orders";
})(ProviderAvailabilityStatus || (exports.ProviderAvailabilityStatus = ProviderAvailabilityStatus = {}));
let ProviderAvailability = class ProviderAvailability extends mongoose_2.Document {
};
exports.ProviderAvailability = ProviderAvailability;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ProviderAvailability.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: ProviderAvailabilityStatus.OFFLINE, enum: Object.values(ProviderAvailabilityStatus) }),
    __metadata("design:type", String)
], ProviderAvailability.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAvailability.prototype, "last_online_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ProviderAvailability.prototype, "last_offline_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProviderAvailability.prototype, "note", void 0);
exports.ProviderAvailability = ProviderAvailability = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'provider_availability' })
], ProviderAvailability);
exports.ProviderAvailabilitySchema = mongoose_1.SchemaFactory.createForClass(ProviderAvailability);
//# sourceMappingURL=requests.schema.js.map