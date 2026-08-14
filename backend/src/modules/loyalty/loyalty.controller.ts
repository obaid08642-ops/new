import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import {
  Controller, Get, Post, Query, Param, Req,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

@UseGuards(JwtAuthGuard)
@Controller('loyalty')
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('config')
  getConfig() {
    return {
      tiers: this.loyaltyService.getTiers(),
      earn_ways: this.loyaltyService.getEarnWays()
    };
  }

  /** GET /api/v1/loyalty/account — Current user's points + tier */
  @Get('account')
  getAccount(@Req() req: any) {
    return this.loyaltyService.getAccount(req.user?.id ?? 'guest');
  }

  /** GET /api/v1/loyalty/transactions — Points history */
  @Get('transactions')
  getTransactions(@Req() req: any, @Query('page') page: string) {
    return this.loyaltyService.getTransactions(req.user?.id ?? 'guest', +page || 1);
  }

  /** GET /api/v1/loyalty/leaderboard — Top 50 users this month */
  @Get('leaderboard')
  getLeaderboard(@Query('limit') limit: string) {
    return this.loyaltyService.getLeaderboard(+limit || 50);
  }

  /** GET /api/v1/loyalty/challenges — Active challenges + user progress */
  @Get('challenges')
  getChallenges(@Req() req: any) {
    return this.loyaltyService.getActiveChallenges(req.user?.id ?? 'guest');
  }

  /** GET /api/v1/loyalty/rewards — Available rewards catalog */
  @Get('rewards')
  listRewards() {
    return this.loyaltyService.listRewards();
  }

  /** POST /api/v1/loyalty/rewards/:id/claim — Claim a reward */
  @Post('rewards/:id/claim')
  claimReward(@Req() req: any, @Param('id') rewardId: string) {
    return this.loyaltyService.claimReward(req.user?.id ?? 'guest', rewardId);
  }

  /** GET /api/v1/loyalty/rewards/claimed — User's claimed rewards */
  @Get('rewards/claimed')
  getClaimedRewards(@Req() req: any) {
    return this.loyaltyService.getClaimedRewards(req.user?.id ?? 'guest');
  }
}
