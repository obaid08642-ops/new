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
exports.OutboundReferralSchema = exports.OutboundReferral = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
let OutboundReferral = class OutboundReferral extends mongoose_2.Document {
};
exports.OutboundReferral = OutboundReferral;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "referrer_doctor_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "patient_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "referral_code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['lab', 'radiology'] }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "target_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], OutboundReferral.prototype, "notes", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: [] }),
    __metadata("design:type", Array)
], OutboundReferral.prototype, "requested_tests", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', enum: ['pending', 'completed', 'expired'] }),
    __metadata("design:type", String)
], OutboundReferral.prototype, "status", void 0);
exports.OutboundReferral = OutboundReferral = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'outbound_referrals' })
], OutboundReferral);
exports.OutboundReferralSchema = mongoose_1.SchemaFactory.createForClass(OutboundReferral);
exports.OutboundReferralSchema.index({ referral_code: 1 }, { unique: true });
//# sourceMappingURL=outbound-referral.schema.js.map