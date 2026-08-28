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
exports.WithdrawalRequestSchema = exports.WithdrawalRequest = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let WithdrawalRequest = class WithdrawalRequest {
};
exports.WithdrawalRequest = WithdrawalRequest;
__decorate([
    (0, mongoose_1.Prop)({ type: mongoose_2.Types.ObjectId, ref: 'User', required: true }),
    __metadata("design:type", mongoose_2.Types.ObjectId)
], WithdrawalRequest.prototype, "providerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "providerName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], WithdrawalRequest.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "bankName", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "iban", void 0);
__decorate([
    (0, mongoose_1.Prop)({ type: String, enum: ['pending', 'completed'], default: 'pending' }),
    __metadata("design:type", String)
], WithdrawalRequest.prototype, "status", void 0);
exports.WithdrawalRequest = WithdrawalRequest = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true })
], WithdrawalRequest);
exports.WithdrawalRequestSchema = mongoose_1.SchemaFactory.createForClass(WithdrawalRequest);
//# sourceMappingURL=withdrawal-request.schema.js.map