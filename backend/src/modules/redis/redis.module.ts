import { Module, Global } from '@nestjs/common';
import { RedisService } from './redis.service';
import { RedisThrottlerStorage } from './throttler-redis.storage';

@Global()
@Module({
  providers: [RedisService, RedisThrottlerStorage],
  exports: [RedisService, RedisThrottlerStorage],
})
export class RedisModule {}
