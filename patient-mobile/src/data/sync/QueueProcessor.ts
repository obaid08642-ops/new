import { DatabaseManager } from '../database/core/DatabaseManager';
import { RetryScheduler } from './RetryScheduler';

export interface ISyncJob {
  id: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entity_type: string;
  payload: string;
  status: 'PENDING' | 'PROCESSING' | 'FAILED' | 'COMPLETED';
  retry_count: number;
}

/**
 * Processes the offline sync queue table, ensuring jobs are executed sequentially or safely in parallel.
 */
export class QueueProcessor {
  private dbManager: DatabaseManager;
  private retryScheduler: RetryScheduler;
  private isProcessing: boolean = false;

  constructor(dbManager: DatabaseManager) {
    this.dbManager = dbManager;
    this.retryScheduler = new RetryScheduler();
  }

  /**
   * Enqueues a new sync job.
   */
  async enqueue(operation: string, entityType: string, payload: any): Promise<void> {
    const id = `job_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const sql = `
      INSERT INTO sync_queue (id, operation, entity_type, payload, status, retry_count, created_at, updated_at)
      VALUES (?, ?, ?, ?, 'PENDING', 0, ?, ?)
    `;
    const now = Date.now();
    await this.dbManager.driver.executeSql(sql, [id, operation, entityType, JSON.stringify(payload), now, now]);
  }

  /**
   * Fetches pending or eligible failed jobs from the queue.
   */
  async getPendingJobs(): Promise<ISyncJob[]> {
    const sql = `
      SELECT * FROM sync_queue
      WHERE status = 'PENDING' OR (status = 'FAILED' AND retry_count < 5)
      ORDER BY created_at ASC
      LIMIT 50
    `;
    const result = await this.dbManager.driver.executeSql(sql);
    return result.rows as ISyncJob[];
  }

  /**
   * Updates job status and increments retry count if failed.
   */
  async updateJobStatus(jobId: string, status: ISyncJob['status'], incrementRetry: boolean = false): Promise<void> {
    let sql = `UPDATE sync_queue SET status = ?, updated_at = ?`;
    const params: any[] = [status, Date.now()];

    if (incrementRetry) {
      sql += `, retry_count = retry_count + 1`;
    }

    sql += ` WHERE id = ?`;
    params.push(jobId);

    await this.dbManager.driver.executeSql(sql, params);
  }

  /**
   * Removes successfully completed jobs to keep the queue clean.
   */
  async clearCompletedJobs(): Promise<void> {
    await this.dbManager.driver.executeSql(`DELETE FROM sync_queue WHERE status = 'COMPLETED'`);
  }
}
