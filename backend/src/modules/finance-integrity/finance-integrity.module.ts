import { Module } from '@nestjs/common';
import { FinanceIntegrityController } from './finance-integrity.controller';
import { FinanceIntegrityService } from './finance-integrity.service';

/** The service is a provider everywhere; the nightly @Cron only fires where the scheduler runs (worker role). */
@Module({ controllers: [FinanceIntegrityController], providers: [FinanceIntegrityService], exports: [FinanceIntegrityService] })
export class FinanceIntegrityModule {}
