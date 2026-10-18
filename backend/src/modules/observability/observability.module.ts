/**
 * Phase 20 — observability surface: metrics, summary, and the SLO data.
 *
 * Owns and exports MetricsService so the module is self-contained; AppModule
 * injects the same instance into CorrelationMiddleware via this export.
 */
import { Module } from '@nestjs/common';
import { ObservabilityController } from './observability.controller';
import { MetricsService } from '../../common/metrics.service';
import { SloAlertsService } from './slo-alerts.service';

@Module({
  controllers: [ObservabilityController],
  providers: [MetricsService, SloAlertsService],
  exports: [MetricsService, SloAlertsService],
})
export class ObservabilityModule {}