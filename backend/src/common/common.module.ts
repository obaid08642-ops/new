import { Global, Module } from '@nestjs/common';
import { LruCacheService } from './lru-cache.service';
import { SingleFlightService } from './single-flight.service';
import { CircuitBreakerService } from './circuit-breaker.service';
import { AdaptiveConcurrencyInterceptor } from './adaptive-concurrency.interceptor';
import { CacheControlInterceptor } from './cache-control.interceptor';
import { PasswordSecurityService } from './password-security.service';
import { LoginLockService } from './login-lock.service';
import { OtpAbuseGuard } from './otp-abuse.service';
import { PurgeBus } from './purge-bus';

@Global()
@Module({
  providers: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    CacheControlInterceptor,
    PasswordSecurityService,
    LoginLockService,
    OtpAbuseGuard,
    PurgeBus,
  ],
  exports: [
    LruCacheService,
    SingleFlightService,
    CircuitBreakerService,
    AdaptiveConcurrencyInterceptor,
    CacheControlInterceptor,
    PasswordSecurityService,
    LoginLockService,
    OtpAbuseGuard,
    PurgeBus,
  ],
})
export class CommonModule {}
