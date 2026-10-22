/**
 * Phase 20.2 / 20.5 — the metrics surface and the SLOs the plan asks for.
 *
 * `/observability/metrics` is what Prometheus scrapes (20.2: "the dashboards are
 * kept in the repo as code"). `/observability/slos` exposes the objectives from
 * 20.5 as data, so an alert can read the same numbers the owner declared rather
 * than a threshold hard-coded in a monitoring UI.
 */
import { Body, Controller, Get, Header, Optional, Post, UseGuards } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { Roles, JwtAuthGuard, Public } from '../../common/auth.guard';
import { UserRole } from '../../common/enums';
import { MetricsService } from '../../common/metrics.service';
import { SLO_TARGETS } from '../../common/slo-targets';
import { Permission, RequirePermissions } from '../../common/permissions';
import { MetricsScrapeGuard } from './metrics-scrape.guard';
import { SloAlertsService } from './slo-alerts.service';
import { DrillAlertDto } from './slo-alerts.dto';

/**
 * Scrape surface: no user JWT (Prometheus cannot carry one) and @SkipThrottle (a scrape must never trip a rate limit for a
 * real user), but NOT open: the counters carry no user data, yet they map every route with its error rate and latency,
 * so `metrics` and `summary` need the scrape token (MetricsScrapeGuard; 404 without it). `health-slo` stays public: one
 * boolean and the overall ratio, what an uptime check needs.
 */
@Controller('observability')
export class ObservabilityController {
  constructor(private readonly metrics: MetricsService, @Optional() private readonly alerts?: SloAlertsService) {}

  @Public()
  @UseGuards(MetricsScrapeGuard)
  @SkipThrottle()
  @Get('metrics')
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  metricsEndpoint(): string {
    return this.metrics.scrape();
  }

  /** A compact summary for a health dashboard or a smoke test. */
  @Public()
  @UseGuards(MetricsScrapeGuard)
  @SkipThrottle()
  @Get('summary')
  summary() {
    return this.metrics.summary();
  }

  /** 20.5 — the objectives, so the same numbers drive the alert and the doc. */
  @UseGuards(JwtAuthGuard)
  @Get('slos')
  @Roles(UserRole.ADMIN)
  slos() {
    const observed = this.metrics.summary();
    return {
      targets: SLO_TARGETS,
      observed: {
        error_ratio: observed.error_ratio,
        routes: observed.routes,
      },
    };
  }

  /** Is the current error ratio inside the availability target? */
  @Public()
  @SkipThrottle()
  @Get('health-slo')
  healthSlo() {
    const observed = this.metrics.summary();
    const availability = SLO_TARGETS.find((t) => t.id === 'api_availability');
    const budget = availability ? availability.target : 0.999;
    const ok = observed.requests === 0 ? true : observed.error_ratio <= (1 - budget);
    return { ok, error_ratio: observed.error_ratio, target: budget, requests: observed.requests };
  }

  /** 20.5 — the alert rules, which are firing now, which channels are configured, and the latest events. */
  @UseGuards(JwtAuthGuard)
  @Get('alerts')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.OPS_QUEUES_MANAGE)
  alertStatus() {
    return this.alerts?.status() ?? { rules: [], channels: {}, recent_events: [] };
  }

  /** 20.5 — a drill: the real notification of one rule, marked [DRILL], through every configured channel. */
  @UseGuards(JwtAuthGuard)
  @Post('alerts/drill')
  @Roles(UserRole.ADMIN)
  @RequirePermissions(Permission.OPS_QUEUES_MANAGE)
  async drill(@Body() body: DrillAlertDto) {
    if (!this.alerts) return { ok: false, error: 'alerts_unavailable' };
    return { ok: true, event: await this.alerts.drill(body.rule) };
  }
}
