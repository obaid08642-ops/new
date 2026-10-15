import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { MailModule } from '../../mail/mail.module';
import { OpsSecurityService } from './ops-security.service';
import { OpsSecurityController } from './ops-security.controller';
import { BackupRunsController } from './backup-runs.controller';
import { SecurityEventsInterceptor } from './security-events.interceptor';

/** D-34 — admin "Operations & Security" page (decision 34), backend part. */
@Module({
  imports: [MailModule],
  controllers: [OpsSecurityController, BackupRunsController],
  providers: [
    OpsSecurityService,
    { provide: APP_INTERCEPTOR, useClass: SecurityEventsInterceptor },
  ],
})
export class OpsSecurityModule {}
