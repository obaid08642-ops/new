"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LoyaltyModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const loyalty_service_1 = require("./loyalty.service");
const loyalty_controller_1 = require("./loyalty.controller");
const loyalty_schemas_1 = require("../../schemas/loyalty.schemas");
const challengeprogress_repository_1 = require("./repositories/challengeprogress.repository");
const loyaltyaccount_repository_1 = require("./repositories/loyaltyaccount.repository");
const loyaltychallenge_repository_1 = require("./repositories/loyaltychallenge.repository");
const loyaltytransaction_repository_1 = require("./repositories/loyaltytransaction.repository");
const reward_repository_1 = require("./repositories/reward.repository");
const rewardclaim_repository_1 = require("./repositories/rewardclaim.repository");
let LoyaltyModule = class LoyaltyModule {
};
exports.LoyaltyModule = LoyaltyModule;
exports.LoyaltyModule = LoyaltyModule = __decorate([
    (0, common_1.Module)({
        imports: [
            mongoose_1.MongooseModule.forFeature([
                { name: 'LoyaltyAccount', schema: loyalty_schemas_1.LoyaltyAccountSchema },
                { name: 'LoyaltyTransaction', schema: loyalty_schemas_1.LoyaltyTransactionSchema },
                { name: 'LoyaltyChallenge', schema: loyalty_schemas_1.LoyaltyChallengeSchema },
                { name: 'ChallengeProgress', schema: loyalty_schemas_1.ChallengeProgressSchema },
                { name: 'Reward', schema: loyalty_schemas_1.RewardSchema },
                { name: 'RewardClaim', schema: loyalty_schemas_1.RewardClaimSchema },
            ]),
        ],
        controllers: [loyalty_controller_1.LoyaltyController],
        providers: [loyalty_service_1.LoyaltyService, { provide: 'ChallengeProgressRepository', useClass: challengeprogress_repository_1.ChallengeProgressRepository }, { provide: 'LoyaltyAccountRepository', useClass: loyaltyaccount_repository_1.LoyaltyAccountRepository }, { provide: 'LoyaltyChallengeRepository', useClass: loyaltychallenge_repository_1.LoyaltyChallengeRepository }, { provide: 'LoyaltyTransactionRepository', useClass: loyaltytransaction_repository_1.LoyaltyTransactionRepository }, { provide: 'RewardRepository', useClass: reward_repository_1.RewardRepository }, { provide: 'RewardClaimRepository', useClass: rewardclaim_repository_1.RewardClaimRepository }],
        exports: [loyalty_service_1.LoyaltyService],
    })
], LoyaltyModule);
//# sourceMappingURL=loyalty.module.js.map