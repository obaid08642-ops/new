// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LoyaltyService } from './loyalty.service';
import { LoyaltyController } from './loyalty.controller';
import {
  LoyaltyAccountSchema,
  LoyaltyTransactionSchema,
  LoyaltyChallengeSchema,
  ChallengeProgressSchema,
  RewardSchema,
  RewardClaimSchema,
} from '../../schemas/loyalty.schemas';
import { ChallengeProgressRepository } from "./repositories/challengeprogress.repository";
import { LoyaltyAccountRepository } from "./repositories/loyaltyaccount.repository";
import { LoyaltyChallengeRepository } from "./repositories/loyaltychallenge.repository";
import { LoyaltyTransactionRepository } from "./repositories/loyaltytransaction.repository";
import { RewardRepository } from "./repositories/reward.repository";
import { RewardClaimRepository } from "./repositories/rewardclaim.repository";

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: 'LoyaltyAccount',    schema: LoyaltyAccountSchema },
      { name: 'LoyaltyTransaction', schema: LoyaltyTransactionSchema },
      { name: 'LoyaltyChallenge',  schema: LoyaltyChallengeSchema },
      { name: 'ChallengeProgress', schema: ChallengeProgressSchema },
      { name: 'Reward',            schema: RewardSchema },
      { name: 'RewardClaim',       schema: RewardClaimSchema },
    ]),
  ],
  controllers: [LoyaltyController],
  providers: [LoyaltyService, { provide: 'ChallengeProgressRepository', useClass: ChallengeProgressRepository }, { provide: 'LoyaltyAccountRepository', useClass: LoyaltyAccountRepository }, { provide: 'LoyaltyChallengeRepository', useClass: LoyaltyChallengeRepository }, { provide: 'LoyaltyTransactionRepository', useClass: LoyaltyTransactionRepository }, { provide: 'RewardRepository', useClass: RewardRepository }, { provide: 'RewardClaimRepository', useClass: RewardClaimRepository }],
  exports: [LoyaltyService],
})
export class LoyaltyModule {}
