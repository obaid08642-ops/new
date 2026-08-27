import { Global, Module } from '@nestjs/common';
import { ImpersonationSessionService } from './impersonation-session.service';
import { SupportSessionContextController } from './support-session-context.controller';

/** Shared security provider required by every request-level JwtAuthGuard instance. */
@Global()
@Module({
  providers: [ImpersonationSessionService],
  controllers: [SupportSessionContextController],
  exports: [ImpersonationSessionService],
})
export class ImpersonationSecurityModule {}
