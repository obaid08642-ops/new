import { Controller, Get, Param, Post, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard, Roles, SelfService } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { UserRole } from '../../common/enums';
import { ReferralService } from './referral.service';
import { AffiliateService } from './affiliate.service';
import { AffiliateSignalDto, ApplyDto, IssueAffiliateDto } from './referral.dto';

/**
 * Patient referral program endpoints.
 * NOTE: base path 'referrals' is shared with the admin outbound-referrals
 * controller (admin-spa) which only defines GET / at the base — no collision.
 */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@Controller('referrals')
@SelfService()
export class ReferralController {
  constructor(
    private readonly svc: ReferralService,
    private readonly affiliates: AffiliateService,
  ) {}

  /** GET /api/v1/referrals/my — my code, stats, and invite list */
  @Get('my')
  my(@Req() req: any) {
    return this.svc.myDashboard(req.user?.id);
  }

  /** POST /api/v1/referrals/apply — apply someone's referral code (new users) */
  @Post('apply')
  apply(@Req() req: any, @Body() body: ApplyDto) {
    return this.svc.apply(req.user?.id, body?.code, {
      device_id: body?.device_id,
      phone: body?.phone,
    });
  }

  /** POST /api/v1/referrals/affiliates/issue — partner link issuance (admin). */
  @Post('affiliates/issue')
  @Roles(UserRole.ADMIN)
  issue(@Req() req: { user?: { id: string } }, @Body() body: IssueAffiliateDto) {
    return this.affiliates.issue(req.user?.id, {
      name: body.name,
      commission_bps: body.commission_bps,
      max_uses: body.max_uses,
    });
  }

  /** POST /api/v1/referrals/affiliates/:code/click — link-open attribution. */
  @Post('affiliates/:code/click')
  click(@Param('code') code: string, @Body() body: AffiliateSignalDto) {
    return this.affiliates.click(code, {
      device_id: body?.device_id,
      phone: body?.phone,
    });
  }

  /** POST /api/v1/referrals/affiliates/:code/redeem — one device/phone per user. */
  @Post('affiliates/:code/redeem')
  @RequireIdempotency()
  redeem(
    @Req() req: { user?: { id: string } },
    @Param('code') code: string,
    @Body() body: AffiliateSignalDto,
  ) {
    return this.affiliates.redeem(req.user?.id, code, {
      device_id: body?.device_id,
      phone: body?.phone,
      order_id: body?.order_id,
    });
  }
}
