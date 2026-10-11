import { Global, Module } from '@nestjs/common';
import { LruCacheService } from './lru-cache.service';
import { SingleFlightService } from './single-flight.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AdaptiveConcurrencyInterceptor } from './adaptive-concurrency.interceptor';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { PasswordSecurityService } from './password-security.service';

@Global()
@Module({
  providers: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    CacheControlInterceptor,
    PasswordSecurityService,
  ],
  exports: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    CacheControlInterceptor,
    PasswordSecurityService,
  ],
})
export class CommonModule {}
