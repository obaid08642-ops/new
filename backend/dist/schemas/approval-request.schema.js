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
exports.ApprovalRequestSchema = exports.ApprovalRequest = exports.ApprovalStatus = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
var ApprovalStatus;
(function (ApprovalStatus) {
    ApprovalStatus["DRAFT"] = "draft";
    ApprovalStatus["PENDING_REVIEW"] = "pending_review";
    ApprovalStatus["APPROVED"] = "approved";
    ApprovalStatus["REJECTED"] = "rejected";
})(ApprovalStatus || (exports.ApprovalStatus = ApprovalStatus = {}));
let ApprovalRequest = class ApprovalRequest {
};
exports.ApprovalRequest = ApprovalRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "entity_type", void 0);
__decorate([
    (0, mongoose_1.Prop)({ index: true }),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "entity_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: Object.values(ApprovalStatus), default: ApprovalStatus.PENDING_REVIEW, index: true }),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "submitted_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "reviewed_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ApprovalRequest.prototype, "reviewed_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ApprovalRequest.prototype, "rejected_reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Object, required: true }),
    __metadata("design:type", Object)
], ApprovalRequest.prototype, "change_data", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 1 }),
    __metadata("design:type", Number)
], ApprovalRequest.prototype, "version", void 0);
exports.ApprovalRequest = ApprovalRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'approval_requests' })
], ApprovalRequest);
exports.ApprovalRequestSchema = mongoose_1.SchemaFactory.createForClass(ApprovalRequest);
exports.ApprovalRequestSchema.index({ entity_type: 1, entity_id: 1, status: 1 });
//# sourceMappingURL=approval-request.schema.js.map