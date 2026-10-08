import { Body, Controller, Get, Headers, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentUser, JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { RequireIdempotency } from '../../../common/idempotency.interceptor';
import { UserRole } from '../../../common/enums';
import { RefillSubscriptionService } from '../services/refill-subscription.service';
import { SubscribeRefillDto } from '../dto/refill-subscription.dto';

/** P22.1 — patient auto-refill subscriptions for chronic medicines. */
@Controller('pharmacy/refills')
@UseGuards(JwtAuthGuard)
export class RefillController {
  constructor(private readonly svc: RefillSubscriptionService) {}

  @Post('subscriptions')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @RequireIdempotency()
  subscribe(
    @CurrentUser() user: { id: string },
    @Body() body: SubscribeRefillDto,
    @Headers('idempotency-key') key?: string,
  ) {
    return this.svc.subscribe(user.id, body, key);
  }

  @Get('subscriptions')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  mine(@CurrentUser() user: { id: string }) {
    return this.svc.mySubscriptions(user.id);
  }

  @Post('subscriptions/:id/cancel')
  @Roles(UserRole.PATIENT, UserRole.ADMIN)
  @RequireIdempotency()
  cancel(@CurrentUser() user: { id: string }, @Param('id') id: string) {
    return this.svc.cancel(user.id, id);
  }

  /** Cron/admin entry: reminders + due refill drafts. Runs every few minutes. */
  @Post('process-due')
  @Roles(UserRole.ADMIN)
  @RequireIdempotency()
  processDue() {
    return this.svc.processDue(new Date());
  }
}
