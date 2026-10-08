import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../../common/auth.guard';
import { UserRole } from '../../../common/enums';
import { ProviderScorecardService } from './provider-scorecard.service';
import { RecordComplaintDto, ResolveComplaintDto } from './provider-scorecard.dto';

@Controller('admin/providers/scorecards')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminScorecardController {
  constructor(private readonly scorecards: ProviderScorecardService) {}

  @Get(':providerAccountId')
  get(@Param('providerAccountId') id: string) {
    return this.scorecards.compute(id);
  }

  @Post(':providerAccountId/recompute')
  recompute(@Param('providerAccountId') id: string) {
    return this.scorecards.recompute(id);
  }

  @Get('alerts/list')
  alerts(@Query('providerAccountId') providerAccountId?: string) {
    return this.scorecards.getAlerts(providerAccountId);
  }

  @Post('complaints')
  complaint(@Body() body: RecordComplaintDto) {
    return this.scorecards.recordComplaint(body);
  }

  @Post('complaints/:id/resolve')
  resolve(@Param('id') id: string, @Body() body: ResolveComplaintDto) {
    return this.scorecards.resolveComplaint(id, body.outcome, body.reason, body.idempotencyKey);
  }
}
