import { Controller, Get, Res, HttpCode, HttpStatus } from '@nestjs/common';
import { Response } from 'express';
import { ObservabilityService } from './observability.service';
import { PrometheusMetricsService } from './prometheus-metrics.service';
import { HealthCheckService } from './health-check.service';

@Controller('observability')
export class ObservabilityController {
  constructor(
    private readonly observability: ObservabilityService,
    private readonly metrics: PrometheusMetricsService,
    private readonly healthCheck: HealthCheckService,
  ) {}

  @Get('metrics')
  async getMetrics(@Res({ passthrough: true }) res: Response): Promise<string> {
    const contentType = await this.metrics.getContentType();
    const metrics = await this.metrics.getMetrics();
    res.set('Content-Type', contentType);
    return metrics;
  }

  @Get('health')
  async getHealth(): Promise<{ status: string; timestamp: string; uptime: number }> {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    };
  }

  @Get('health/live')
  async getLiveness(): Promise<{ status: string }> {
    return { status: 'alive' };
  }

  @Get('health/ready')
  async getReadiness(): Promise<{ status: string; checks: Record<string, { status: string; [key: string]: any }> }> {
    const health = await this.healthCheck.getFullHealth();
    return {
      status: health.status,
      checks: health.details,
    };
  }
}