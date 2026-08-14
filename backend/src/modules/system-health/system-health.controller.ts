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
  checkReadiness() {
    // For now, readiness and liveness are the same.
    // In the future, readiness might check third-party APIs (e.g., Moyasar, Gemini)
    return this.checkLiveness();
  }
}
