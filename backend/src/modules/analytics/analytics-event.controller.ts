import { Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard, Roles } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { AnalyticsEventService } from './analytics-event.service';
import { IngestEventDto } from './analytics-event.dto';

@Controller('analytics')
export class AnalyticsIngestController {
  constructor(private readonly svc: AnalyticsEventService) {}

  /** Producer endpoint: consent-gated, idempotent. Anonymous events need no consent. */
  @Post('events')
  ingest(@Body() body: IngestEventDto) {
    return this.svc.ingest(body);
  }
}

@Controller('admin/analytics-pipeline')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AnalyticsPipelineController {
  constructor(private readonly svc: AnalyticsEventService) {}

  @Get('funnel')
  funnel(@Query('steps') steps: string, @Query('domain') domain?: string) {
    return this.svc.funnel(steps, domain);
  }

  @Get('retention')
  retention(@Query('domain') domain?: string) {
    return this.svc.retentionCohorts(domain);
  }
}
