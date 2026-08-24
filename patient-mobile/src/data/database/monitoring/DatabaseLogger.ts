import { logger } from '../../../services/Logger';

/**
 * Specialized logger for Database operations.
 * Tracks slow queries, transactions, and errors.
 */
export class DatabaseLogger {
  private static readonly TAG = 'DatabaseLayer';

  static logQuery(sql: string, params: any[], durationMs: number) {
    if (durationMs > 100) {
      logger.warn(`Slow Query Detected (${durationMs}ms)`, { sql, params }, this.TAG);
    } else {
      logger.debug(`Query Executed (${durationMs}ms)`, { sql }, this.TAG);
    }
  }

  static logTransactionStart(txId: string) {
    logger.debug(`Transaction Started`, { txId }, this.TAG);
  }

  static logTransactionCommit(txId: string, durationMs: number) {
    logger.debug(`Transaction Committed (${durationMs}ms)`, { txId }, this.TAG);
  }

  static logTransactionRollback(txId: string, error: any) {
    logger.error(`Transaction Rolled Back`, { error, txId }, this.TAG);
  }

  static logError(sql: string, params: any[], error: any) {
    logger.error(`Query Failed`, { error, sql, params }, this.TAG);
  }
}
