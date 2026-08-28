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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyController = void 0;
const auth_guard_1 = require("../../common/auth.guard");
const common_1 = require("@nestjs/common");
const common_2 = require("@nestjs/common");
const loyalty_service_1 = require("./loyalty.service");
let LoyaltyController = class LoyaltyController {
    constructor(loyaltyService) {
        this.loyaltyService = loyaltyService;
    }
    getConfig() {
        return {
            tiers: this.loyaltyService.getTiers(),
            earn_ways: this.loyaltyService.getEarnWays()
        };
    }
    getAccount(req) {
        return this.loyaltyService.getAccount(req.user?.id ?? 'guest');
    }
    getTransactions(req, page) {
        return this.loyaltyService.getTransactions(req.user?.id ?? 'guest', +page || 1);
    }
    getLeaderboard(limit) {
        return this.loyaltyService.getLeaderboard(+limit || 50);
    }
    getChallenges(req) {
        return this.loyaltyService.getActiveChallenges(req.user?.id ?? 'guest');
    }
    joinChallenge(req, id) {
        return this.loyaltyService.joinChallenge(req.user?.id, id);
    }
    listRewards() {
        return this.loyaltyService.listRewards();
    }
    claimReward(req, rewardId) {
        return this.loyaltyService.claimReward(req.user?.id ?? 'guest', rewardId);
    }
    getClaimedRewards(req) {
        return this.loyaltyService.getClaimedRewards(req.user?.id ?? 'guest');
    }
};
exports.LoyaltyController = LoyaltyController;
__decorate([
    (0, common_2.Get)('config'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getConfig", null);
__decorate([
    (0, common_2.Get)('account'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getAccount", null);
__decorate([
    (0, common_2.Get)('transactions'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Query)('page')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getTransactions", null);
__decorate([
    (0, common_2.Get)('leaderboard'),
    __param(0, (0, common_2.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getLeaderboard", null);
__decorate([
    (0, common_2.Get)('challenges'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getChallenges", null);
__decorate([
    (0, common_2.Post)('challenges/:id/join'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "joinChallenge", null);
__decorate([
    (0, common_2.Get)('rewards'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "listRewards", null);
__decorate([
    (0, common_2.Post)('rewards/:id/claim'),
    __param(0, (0, common_2.Req)()),
    __param(1, (0, common_2.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "claimReward", null);
__decorate([
    (0, common_2.Get)('rewards/claimed'),
    __param(0, (0, common_2.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LoyaltyController.prototype, "getClaimedRewards", null);
exports.LoyaltyController = LoyaltyController = __decorate([
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, common_2.Controller)('loyalty'),
    __metadata("design:paramtypes", [loyalty_service_1.LoyaltyService])
], LoyaltyController);
//# sourceMappingURL=loyalty.controller.js.map