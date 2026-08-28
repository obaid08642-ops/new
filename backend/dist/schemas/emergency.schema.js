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
exports.EmergencyRequestSchema = exports.EmergencyRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const enums_1 = require("../common/enums");
const uuid_1 = require("uuid");
let EmergencyRequest = class EmergencyRequest {
};
exports.EmergencyRequest = EmergencyRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)() }),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "patient_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "patient_phone", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, address: String }, _id: false }),
    __metadata("design:type", Object)
], EmergencyRequest.prototype, "location", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "symptoms", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'critical' }),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "severity", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(enums_1.EmergencyState), default: enums_1.EmergencyState.TRIGGERED, index: true }),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "state", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "assigned_hospital_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "assigned_ambulance_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "assigned_provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "unit_label", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "paramedic_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], EmergencyRequest.prototype, "claimed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: { lat: Number, lng: Number, updated_at: Date }, _id: false }),
    __metadata("design:type", Object)
], EmergencyRequest.prototype, "unit_location", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "admin_notes", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], EmergencyRequest.prototype, "resolved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], EmergencyRequest.prototype, "resolved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: [{ from: String, to: String, by: String, at: Date }], _id: false, default: [] }),
    __metadata("design:type", Array)
], EmergencyRequest.prototype, "state_history", void 0);
exports.EmergencyRequest = EmergencyRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'emergency_requests' })
], EmergencyRequest);
exports.EmergencyRequestSchema = mongoose_1.SchemaFactory.createForClass(EmergencyRequest);
//# sourceMappingURL=emergency.schema.js.map