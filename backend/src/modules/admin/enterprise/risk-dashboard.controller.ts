import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { FraudScoringService } from './fraud-scoring.service';
import { RiskActionDto, RiskQueueQueryDto } from './risk-dashboard.dto';

/**
 * P22.11 — risk dashboard API (scores, queues, actions).
 * Admin UI wiring is another agent's slice; this is the API side.
 */
@Controller('admin/risk')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class RiskDashboardController {
  constructor(private readonly scoring: FraudScoringService) {}

  @Get('scores/:userId')
  scores(@Param('userId') userId: string) {
    return this.scoring.scoreUser(userId);
  }

  @Get('queue')
  queue(@Query() q: RiskQueueQueryDto) {
    return this.scoring.queue(q.status, q.flagType, q.limit ? Number(q.limit) : 50);
  }

  @Post('alerts/:id/action')
  act(@Param('id') id: string, @Body() body: RiskActionDto) {
    return this.scoring.actOnAlert(id, body.action, body.reason, body.idempotencyKey);
  }

  @Get('3ds')
  threeDS(
    @Query('paymentMethod') paymentMethod: string,
    @Query('riskScore') riskScore: string,
    @Query('orderTotal') orderTotal: string,
    @Query('provider') provider?: string,
  ) {
    return this.scoring.threeDS({
      paymentMethod: String(paymentMethod || 'cash'),
      riskScore: Number(riskScore || 0),
      orderTotal: Number(orderTotal || 0),
      provider,
    });
  }
}
