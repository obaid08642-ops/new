import { Body, Controller, Get, HttpCode, Post, Query, UseGuards } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { RumService } from './rum.service';
import { RumReportDto, RumSummaryQueryDto } from './rum.dto';

/**
 * P14.23: the web posts its web-vitals here once per page view (navigator.sendBeacon, text/plain JSON so no CORS
 * preflight; main.ts parses that one path). Public (guests report too), rate limited per IP, no user data stored.
 */
@Controller('rum')
export class RumController {
  constructor(private readonly rum: RumService) {}

  @Public()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  @Post('vitals')
  @HttpCode(204)
  async vitals(@Body() body: RumReportDto): Promise<void> {
    await this.rum.record(body);
  }
}

/** The admin "Web vitals" page: p75 per page type and metric against the plan's budgets. */
@Controller('admin/rum')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class RumAdminController {
  constructor(private readonly rum: RumService) {}

  @Get('summary')
  async summary(@Query() query: RumSummaryQueryDto) {
    return this.rum.summary(query.days ?? 1);
  }
}
