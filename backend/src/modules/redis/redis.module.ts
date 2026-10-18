import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './throttler-redis.storage';
import { HotCache } from './hot-cache.service';

@Global()
@Module({
  providers: [RedisService, RedisThrottlerStorage, HotCache],
  exports: [RedisService, RedisThrottlerStorage, HotCache],
})
export class RedisModule {}
