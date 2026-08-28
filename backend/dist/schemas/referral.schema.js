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
exports.ReferralRewardSchema = exports.ReferralReward = exports.ReferralCodeSchema = exports.ReferralCode = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const uuid_1 = require("uuid");
let ReferralCode = class ReferralCode {
};
exports.ReferralCode = ReferralCode;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], ReferralCode.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReferralCode.prototype, "ownerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], ReferralCode.prototype, "code", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ReferralCode.prototype, "useCount", void 0);
exports.ReferralCode = ReferralCode = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'referral_codes' })
], ReferralCode);
exports.ReferralCodeSchema = mongoose_1.SchemaFactory.createForClass(ReferralCode);
let ReferralReward = class ReferralReward {
};
exports.ReferralReward = ReferralReward;
__decorate([
    (0, mongoose_1.Prop)({ default: () => (0, uuid_1.v4)(), unique: true }),
    __metadata("design:type", String)
], ReferralReward.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReferralReward.prototype, "referrerId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ReferralReward.prototype, "refereeId", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['points', 'wallet'] }),
    __metadata("design:type", String)
], ReferralReward.prototype, "rewardType", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], ReferralReward.prototype, "amount", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, enum: ['pending', 'completed'], default: 'pending', index: true }),
    __metadata("design:type", String)
], ReferralReward.prototype, "status", void 0);
exports.ReferralReward = ReferralReward = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'referral_rewards' })
], ReferralReward);
exports.ReferralRewardSchema = mongoose_1.SchemaFactory.createForClass(ReferralReward);
exports.ReferralRewardSchema.index({ referrerId: 1, refereeId: 1 }, { unique: true });
//# sourceMappingURL=referral.schema.js.map