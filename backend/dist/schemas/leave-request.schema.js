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
exports.LeaveRequestSchema = exports.LeaveRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let LeaveRequest = class LeaveRequest {
};
exports.LeaveRequest = LeaveRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true, index: true }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "facility_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "provider_account_id", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LeaveRequest.prototype, "provider_name", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LeaveRequest.prototype, "provider_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['vacation', 'emergency', 'sick', 'other'], default: 'vacation' }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LeaveRequest.prototype, "start_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LeaveRequest.prototype, "end_date", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LeaveRequest.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', index: true, enum: ['pending', 'approved', 'rejected'] }),
    __metadata("design:type", String)
], LeaveRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LeaveRequest.prototype, "decided_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], LeaveRequest.prototype, "decided_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LeaveRequest.prototype, "decision_note", void 0);
exports.LeaveRequest = LeaveRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], LeaveRequest);
exports.LeaveRequestSchema = mongoose_1.SchemaFactory.createForClass(LeaveRequest);
//# sourceMappingURL=leave-request.schema.js.map