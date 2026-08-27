import { Global, Module } from '@nestjs/common';
import { ImpersonationSessionService } from './impersonation-session.service';

/** Shared security provider required by every request-level JwtAuthGuard instance. */
@Global()
@Module({
  providers: [ImpersonationSessionService],
  exports: [ImpersonationSessionService],
})
export class ImpersonationSecurityModule {}
