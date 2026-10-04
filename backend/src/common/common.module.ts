import { Global, Module } from '@nestjs/common';
import { LruCacheService } from './lru-cache.service';
import { SingleFlightService } from './single-flight.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AdaptiveConcurrencyInterceptor } from './adaptive-concurrency.interceptor';
import { RouteCachePolicyInterceptor } from './cache/route-cache-policy.interceptor';
import { LogRetentionService } from './log-retention.service';
import { VelocityGuard } from './guards/velocity.guard';
import { DeviceLimitGuard } from './guards/device-limit.guard';
import { AbusePreventionGuard, CouponAbuseGuard, SearchRateLimitGuard, AIRateLimitGuard, UploadRateLimitGuard } from './guards/abuse-prevention.guard';
import { RedisModule } from '../modules/redis/redis.module';

@Global()
@Module({
  imports: [RedisModule],
  providers: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    RouteCachePolicyInterceptor,
    LogRetentionService,
    VelocityGuard,
    DeviceLimitGuard,
    AbusePreventionGuard,
    CouponAbuseGuard,
    SearchRateLimitGuard,
    AIRateLimitGuard,
    UploadRateLimitGuard,
  ],
  exports: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    RouteCachePolicyInterceptor,
    LogRetentionService,
    VelocityGuard,
    DeviceLimitGuard,
    AbusePreventionGuard,
    CouponAbuseGuard,
    SearchRateLimitGuard,
    AIRateLimitGuard,
    UploadRateLimitGuard,
  ],
})
export class CommonModule {}
