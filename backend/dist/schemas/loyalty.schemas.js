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
exports.RewardClaimSchema = exports.RewardClaim = exports.RewardSchema = exports.Reward = exports.ChallengeProgressSchema = exports.ChallengeProgress = exports.LoyaltyChallengeSchema = exports.LoyaltyChallenge = exports.LoyaltyTransactionSchema = exports.LoyaltyTransaction = exports.LoyaltyAccountSchema = exports.LoyaltyAccount = void 0;
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
let LoyaltyAccount = class LoyaltyAccount extends mongoose_2.Document {
};
exports.LoyaltyAccount = LoyaltyAccount;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], LoyaltyAccount.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "points", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], LoyaltyAccount.prototype, "lifetime_points", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'bronze', index: true }),
    __metadata("design:type", String)
], LoyaltyAccount.prototype, "tier", void 0);
exports.LoyaltyAccount = LoyaltyAccount = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'loyalty_accounts' })
], LoyaltyAccount);
exports.LoyaltyAccountSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyAccount);
let LoyaltyTransaction = class LoyaltyTransaction extends mongoose_2.Document {
};
exports.LoyaltyTransaction = LoyaltyTransaction;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], LoyaltyTransaction.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], LoyaltyTransaction.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], LoyaltyTransaction.prototype, "points_delta", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyTransaction.prototype, "reason", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoyaltyTransaction.prototype, "ref_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoyaltyTransaction.prototype, "ref_id", void 0);
exports.LoyaltyTransaction = LoyaltyTransaction = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'loyalty_transactions' })
], LoyaltyTransaction);
exports.LoyaltyTransactionSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyTransaction);
let LoyaltyChallenge = class LoyaltyChallenge extends mongoose_2.Document {
};
exports.LoyaltyChallenge = LoyaltyChallenge;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], LoyaltyChallenge.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyChallenge.prototype, "title_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyChallenge.prototype, "title_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], LoyaltyChallenge.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], LoyaltyChallenge.prototype, "target_action", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, default: 1 }),
    __metadata("design:type", Number)
], LoyaltyChallenge.prototype, "target_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], LoyaltyChallenge.prototype, "reward_points", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LoyaltyChallenge.prototype, "start_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Date)
], LoyaltyChallenge.prototype, "end_date", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], LoyaltyChallenge.prototype, "active", void 0);
exports.LoyaltyChallenge = LoyaltyChallenge = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'loyalty_challenges' })
], LoyaltyChallenge);
exports.LoyaltyChallengeSchema = mongoose_1.SchemaFactory.createForClass(LoyaltyChallenge);
let ChallengeProgress = class ChallengeProgress extends mongoose_2.Document {
};
exports.ChallengeProgress = ChallengeProgress;
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ChallengeProgress.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], ChallengeProgress.prototype, "challenge_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 0 }),
    __metadata("design:type", Number)
], ChallengeProgress.prototype, "progress_count", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: false }),
    __metadata("design:type", Boolean)
], ChallengeProgress.prototype, "completed", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], ChallengeProgress.prototype, "completed_at", void 0);
exports.ChallengeProgress = ChallengeProgress = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'challenge_progress' })
], ChallengeProgress);
exports.ChallengeProgressSchema = mongoose_1.SchemaFactory.createForClass(ChallengeProgress);
let Reward = class Reward extends mongoose_2.Document {
};
exports.Reward = Reward;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], Reward.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Reward.prototype, "title_ar", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Reward.prototype, "title_en", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Reward.prototype, "description", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", Number)
], Reward.prototype, "points_required", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], Reward.prototype, "reward_type", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Number)
], Reward.prototype, "value", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], Reward.prototype, "image", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 999 }),
    __metadata("design:type", Number)
], Reward.prototype, "stock", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: true }),
    __metadata("design:type", Boolean)
], Reward.prototype, "active", void 0);
exports.Reward = Reward = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'loyalty_rewards' })
], Reward);
exports.RewardSchema = mongoose_1.SchemaFactory.createForClass(Reward);
let RewardClaim = class RewardClaim extends mongoose_2.Document {
};
exports.RewardClaim = RewardClaim;
__decorate([
    (0, mongoose_1.Prop)({ required: true, unique: true, index: true }),
    __metadata("design:type", String)
], RewardClaim.prototype, "id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true, index: true }),
    __metadata("design:type", String)
], RewardClaim.prototype, "user_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ required: true }),
    __metadata("design:type", String)
], RewardClaim.prototype, "reward_id", void 0);
__decorate([
    (0, mongoose_1.Prop)({ default: 'pending', index: true }),
    __metadata("design:type", String)
], RewardClaim.prototype, "status", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", String)
], RewardClaim.prototype, "coupon_code", void 0);
__decorate([
    (0, mongoose_1.Prop)(),
    __metadata("design:type", Date)
], RewardClaim.prototype, "fulfilled_at", void 0);
exports.RewardClaim = RewardClaim = __decorate([
    (0, mongoose_1.Schema)({ timestamps: true, collection: 'reward_claims' })
], RewardClaim);
exports.RewardClaimSchema = mongoose_1.SchemaFactory.createForClass(RewardClaim);
//# sourceMappingURL=loyalty.schemas.js.map