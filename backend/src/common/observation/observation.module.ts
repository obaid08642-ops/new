import { Module } from '@nestjs/common';
import { FailedPropagationLog } from './failed-propagation-log';

/**
 * R13 wiring — makes the failed-propagation log injectable anywhere.
 * useValue (not useClass): the log is a plain in-memory structure, not a
 * Nest-managed service, so it is instantiated once here rather than decorated.
 * The reconciliation job (reconciliation-job.ts) stays a pure function by
 * design: each entity pair gets its own scheduled caller that imports this
 * module, rather than one speculative cron reconciling nothing in particular.
 */
@Module({
  providers: [{ provide: FailedPropagationLog, useValue: new FailedPropagationLog() }],
  exports: [FailedPropagationLog],
})
export class ObservationModule {}
