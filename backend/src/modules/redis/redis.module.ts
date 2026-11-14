import { Module, Global, Injectable } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './throttler-redis.storage';
import { HotCache } from './hot-cache.service';
import { CronLease } from '../../common/scheduled-once';

/** R3: gives `@ScheduledOnce` the main Redis client (the lease must outlive any one process, so not the in-memory fallback). */
@Injectable()
export class CronLeaseBootstrap {
  constructor(redis: RedisService) { CronLease.configure(() => redis.getClient()); }
}

@Global()
@Module({
  providers: [RedisService, RedisThrottlerStorage, HotCache, CronLeaseBootstrap],
  exports: [RedisService, RedisThrottlerStorage, HotCache],
})
export class RedisModule {}
