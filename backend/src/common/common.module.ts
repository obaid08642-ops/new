import { Global, Module } from '@nestjs/common';
import { LruCacheService } from './lru-cache.service';
import { SingleFlightService } from './single-flight.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AdaptiveConcurrencyInterceptor } from './adaptive-concurrency.interceptor';
import { RouteCachePolicyInterceptor } from './cache/route-cache-policy.interceptor';
import { LogRetentionService } from './log-retention.service';

@Global()
@Module({
  providers: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    RouteCachePolicyInterceptor,
    LogRetentionService,
  ],
  exports: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    RouteCachePolicyInterceptor,
    LogRetentionService,
  ],
})
export class CommonModule {}
