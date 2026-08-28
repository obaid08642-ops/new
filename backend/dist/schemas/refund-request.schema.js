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
exports.RefundRequestSchema = exports.RefundRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let RefundRequest = class RefundRequest {
};
exports.RefundRequest = RefundRequest;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "booking_kind", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "booking_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: Number }),
    __metadata("design:type", Number)
], RefundRequest.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ enum: ['requested', 'approved', 'rejected', 'completed'], default: 'requested', index: true }),
    __metadata("design:type", String)
], RefundRequest.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "resolved_by", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RefundRequest.prototype, "resolved_at", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RefundRequest.prototype, "admin_note", void 0);
exports.RefundRequest = RefundRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], RefundRequest);
exports.RefundRequestSchema = mongoose_1.SchemaFactory.createForClass(RefundRequest);
//# sourceMappingURL=refund-request.schema.js.map