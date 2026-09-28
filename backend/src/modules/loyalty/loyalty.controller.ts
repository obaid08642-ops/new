import { JwtAuthGuard, SelfService, Roles, CurrentUser } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { UseGuards } from '@nestjs/common';
import {
  Controller, Get, Post, Put, Patch, Delete, Body, Query, Param, Req,
} from '@nestjs/common';
import { LoyaltyService } from './loyalty.service';

@UseGuards(JwtAuthGuard)
@Controller('loyalty')
@SelfService()
export class LoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('config')
  getConfig() {
    return this.loyaltyService.getConfig();
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

  /** POST /api/v1/loyalty/challenges/:id/join — Persisted opt-in to a challenge */
  @Post('challenges/:id/join')
  joinChallenge(@Req() req: any, @Param('id') id: string) {
    return this.loyaltyService.joinChallenge(req.user?.id, id);
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

/** LJ-08: admin catalogue + config, so rewards and challenges are never empty. */
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
@Controller('admin/loyalty')
export class AdminLoyaltyController {
  constructor(private readonly loyaltyService: LoyaltyService) {}

  @Get('rewards') rewards() { return this.loyaltyService.adminListRewards(); }
  @Post('rewards') createReward(@Body() body: any) { return this.loyaltyService.adminCreateReward(body); }
  @Patch('rewards/:id') updateReward(@Param('id') id: string, @Body() body: any) { return this.loyaltyService.adminUpdateReward(id, body); }
  @Delete('rewards/:id') deleteReward(@Param('id') id: string) { return this.loyaltyService.adminDeleteReward(id); }

  @Get('challenges') challenges() { return this.loyaltyService.adminListChallenges(); }
  @Post('challenges') createChallenge(@Body() body: any) { return this.loyaltyService.adminCreateChallenge(body); }
  @Patch('challenges/:id') updateChallenge(@Param('id') id: string, @Body() body: any) { return this.loyaltyService.adminUpdateChallenge(id, body); }
  @Delete('challenges/:id') deleteChallenge(@Param('id') id: string) { return this.loyaltyService.adminDeleteChallenge(id); }

  @Put('config') updateConfig(@CurrentUser() u: any, @Body() body: any) { return this.loyaltyService.adminUpdateConfig(body, u); }
}
