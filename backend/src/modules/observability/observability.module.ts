import { Module, Global } from '@nestjs/common';
import { ObservabilityController } from './observability.controller';
import { ObservabilityService } from './observability.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';
import { StructuredLoggerService } from './structured-logger.service';
import { HealthCheckService } from './health-check.service';

@Global()
@Module({
  controllers: [ObservabilityController],
  providers: [
    ObservabilityService,
    PrometheusMetricsService,
    StructuredLoggerService,
    HealthCheckService,
  ],
  exports: [
    ObservabilityService,
    PrometheusMetricsService,
    StructuredLoggerService,
    HealthCheckService,
  ],
})
export class ObservabilityModule {}