import { Controller, Get } from '@nestjs/common';
import { Public } from './common/auth.guard';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { RedisService } from './modules/redis/redis.service';

@Controller()
export class HealthController {
  constructor(
    @InjectConnection() private readonly connection: Connection,
    private readonly redis: RedisService,
  ) {}

  @Public()
  @Get()
  root() {
    return {
      app: 'Nabd Healthcare OS (NestJS)',
      status: 'ok',
      time: new Date().toISOString(),
      version: '1.0.0',
    };
  }

  @Public()
  @Get('health/liveness')
  liveness() {
    return { status: 'up' };
  }

  @Public()
  @Get('health/readiness')
  async health() {
    let mongoOk = false;
    let redisOk = false;

    try {
      mongoOk = this.connection.readyState === 1;
    } catch {}

    try {
      const pong = await this.redis.getClient().ping();
      redisOk = pong === 'PONG';
    } catch {}

    const status = mongoOk && redisOk ? 'ok' : 'degraded';

    return {
      status,
      time: new Date().toISOString(),
      // Process uptime in seconds — consumed by the admin dashboard health widget.
      uptime: Math.round(process.uptime()),
      details: {
        mongodb: mongoOk ? 'up' : 'down',
        redis: redisOk ? 'up' : 'down',
      },
    };
  }
}
