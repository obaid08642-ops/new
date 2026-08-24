import { JwtAuthGuard } from '../../common/auth.guard';
import { UseGuards } from '@nestjs/common';
import { Controller, Get, Query } from '@nestjs/common';
import { TimelineService } from './timeline.service';
import { CurrentUser } from '../../common/auth.guard';

@UseGuards(JwtAuthGuard)
@Controller('timeline')
export class TimelineController {
  constructor(private readonly svc: TimelineService) {}

  /**
   * GET /api/v2/timeline?kinds=order,lab,rx,home_care,consultation,vital,reminder,custom
   *     &limit=50&since=ISO_DATE&until=ISO_DATE
   * Returns a unified chronological feed of all medical events for the current patient.
   */
  @Get()
  async feed(
    @CurrentUser() u: any,
    @Query('kinds') kinds?: string,
    @Query('limit') limit?: string,
    @Query('since') since?: string,
    @Query('until') until?: string,
  ) {
    const k = kinds ? kinds.split(',').map((x) => x.trim()).filter(Boolean) : undefined;
    return this.svc.build(u, {
      kinds: k,
      limit: limit ? parseInt(limit, 10) : 80,
      since: since ? new Date(since) : undefined,
      until: until ? new Date(until) : undefined,
    });
  }

  /** GET /api/v2/timeline/summary — counts by kind for quick overview */
  @Get('summary')
  async summary(@CurrentUser() u: any) {
    return this.svc.summary(u);
  }
}
