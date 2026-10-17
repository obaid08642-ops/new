import { Global, Module } from '@nestjs/common';
import { LoggerService } from '../../common/logger.service';
import { LogsStoreService } from './app-logs.store';

/**
 * 20.3 — the logger (`app.useLogger(app.get(LoggerService))` in main.ts) and the Mongo store behind it. Global, so any
 * module can inject the LoggerService; the admin read endpoints live in AdminEnterpriseModule next to the other admin controllers.
 */
@Global()
@Module({
  providers: [LoggerService, LogsStoreService],
  exports: [LoggerService, LogsStoreService],
})
export class LogsModule {}
