import { Controller, Get, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard } from '../../common/auth.guard';
import { ReferralService } from './referral.service';

/**
 * Patient referral program endpoints.
 * NOTE: base path 'referrals' is shared with the admin outbound-referrals
 * controller (admin-spa) which only defines GET / at the base — no collision.
 */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('referrals')
export class ReferralController {
  constructor(private readonly svc: ReferralService) {}

  /** GET /api/v1/referrals/my — my code, stats, and invite list */
  @Get('my')
  my(@Req() req: any) {
    return this.svc.myDashboard(req.user?.id);
  }

  /** POST /api/v1/referrals/apply — apply someone's referral code (new users) */
  @Post('apply')
  apply(@Req() req: any, @Body() body: { code: string }) {
    return this.svc.apply(req.user?.id, body?.code);
  }
}
