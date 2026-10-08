import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, NoGuestsGuard, Roles, SelfService } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { UserRole } from '../../common/enums';
import { CouponRulesService } from './coupon-rules.service';
import { ApplyStackDto, EvaluateStackDto } from './coupon-rules.dto';

/** P22.15 — coupon stacking evaluation + application. */
@UseGuards(JwtAuthGuard, NoGuestsGuard)
@SelfService()
@Controller('coupons')
export class CouponRulesController {
  constructor(private readonly svc: CouponRulesService) {}

  /** Read-only: no idempotency key needed. */
  @Post('evaluate-stack')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  evaluate(@Req() req: { user?: { id: string } }, @Body() body: EvaluateStackDto) {
    return this.svc.evaluateStack(String(req.user?.id), body);
  }

  @Post('apply-stack')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @RequireIdempotency()
  apply(@Req() req: { user?: { id: string } }, @Body() body: ApplyStackDto) {
    return this.svc.applyStack(String(req.user?.id), body);
  }
}
