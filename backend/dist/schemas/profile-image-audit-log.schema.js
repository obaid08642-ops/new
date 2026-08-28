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
exports.ProfileImageAuditLogSchema = exports.ProfileImageAuditLog = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let ProfileImageAuditLog = class ProfileImageAuditLog extends mongoose_2.Document {
};
exports.ProfileImageAuditLog = ProfileImageAuditLog;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProfileImageAuditLog.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ProfileImageAuditLog.prototype, "provider_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: Date.now }),
    __metadata("design:type", Date)
], ProfileImageAuditLog.prototype, "processing_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], ProfileImageAuditLog.prototype, "selected_provider", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: -1 }),
    __metadata("design:type", Number)
], ProfileImageAuditLog.prototype, "api_key_index_used", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['success', 'failed'] }),
    __metadata("design:type", String)
], ProfileImageAuditLog.prototype, "processing_result", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], ProfileImageAuditLog.prototype, "failure_reason", void 0);
exports.ProfileImageAuditLog = ProfileImageAuditLog = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'profile_image_audit_logs' })
], ProfileImageAuditLog);
exports.ProfileImageAuditLogSchema = mongoose_1.SchemaFactory.createForClass(ProfileImageAuditLog);
exports.ProfileImageAuditLogSchema.index({ user_id: 1, createdAt: -1 });
//# sourceMappingURL=profile-image-audit-log.schema.js.map