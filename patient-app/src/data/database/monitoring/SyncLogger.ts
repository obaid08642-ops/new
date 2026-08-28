import { logger } from '../../../services/Logger';

/**
 * Specialized logger for the Sync Engine.
 * Tracks sync queue, conflict resolutions, and background job statuses.
 */
export class SyncLogger {
  private static readonly TAG = 'SyncEngine';

  static logSyncStarted(queueSize: number) {
    logger.info(`Background Sync Started`, { queueSize }, this.TAG);
  }

  static logSyncCompleted(processed: number, failed: number, durationMs: number) {
    logger.info(`Background Sync Completed (${durationMs}ms)`, { processed, failed }, this.TAG);
  }

  static logJobRetry(jobId: string, attempt: number, nextRetryAt: number) {
    logger.warn(`Sync Job Retrying`, { jobId, attempt, nextRetryAt }, this.TAG);
  }

  static logJobFailed(jobId: string, error: any) {
    logger.error(`Sync Job Failed Permanently`, { error, jobId }, this.TAG);
  }

  static logConflictResolved(entityType: string, entityId: string, strategy: string) {
    logger.warn(`Sync Conflict Resolved`, { entityType, entityId, strategy }, this.TAG);
  }
}
