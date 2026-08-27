import { Controller, Get } from '@nestjs/common';
import { HealthCheckService, MongooseHealthIndicator, HealthCheck } from '@nestjs/terminus';
import { RedisService } from '../redis/redis.service';

@Controller('system-health')
export class SystemHealthController {
  constructor(
    private health: HealthCheckService,
    private mongoose: MongooseHealthIndicator,
    private redisService: RedisService,
  ) {}

  @Get('liveness')
  @HealthCheck()
  checkLiveness() {
    return this.health.check([
      () => this.mongoose.pingCheck('mongodb'),
      async () => {
        const isConnected = await this.redisService.getClient().ping() === 'PONG';
        return {
          redis: {
            status: isConnected ? 'up' : 'down',
          },
        };
      },
    ]);
  }

  @Get('readiness')
  @HealthCheck()
  async checkReadiness() {
    // Readiness currently mirrors liveness, with process uptime included for
    // operations dashboards. Third-party checks (payments/AI/etc.) can be added
    // here without changing the response contract.
    const result = await this.checkLiveness();
    return { ...result, uptime: Math.round(process.uptime()) };
  }
}
