import { QueueProcessor, ISyncJob } from './QueueProcessor';

export type SyncHandler = (job: ISyncJob) => Promise<void>;

/**
 * Worker that actively executes jobs from the QueueProcessor.
 * Delegates actual network operations to registered handlers (usually RemoteDataSources).
 */
export class SyncWorker {
  private queue: QueueProcessor;
  private handlers: Map<string, SyncHandler> = new Map();
  private isRunning: boolean = false;

  constructor(queue: QueueProcessor) {
    this.queue = queue;
  }

  /**
   * Registers a handler for a specific entity type (e.g., 'users' -> userRemoteDataSource.sync)
   */
  registerHandler(entityType: string, handler: SyncHandler): void {
    this.handlers.set(entityType, handler);
  }

  /**
   * Starts processing the queue. Ensures only one loop runs at a time.
   */
  async startProcessing(): Promise<void> {
    if (this.isRunning) return;
    this.isRunning = true;

    try {
      let pendingJobs = await this.queue.getPendingJobs();
      
      while (pendingJobs.length > 0) {
        for (const job of pendingJobs) {
          await this.processJob(job);
        }
        
        // Check if more jobs arrived while we were processing
        pendingJobs = await this.queue.getPendingJobs();
      }
      
      await this.queue.clearCompletedJobs();
    } finally {
      this.isRunning = false;
    }
  }

  private async processJob(job: ISyncJob): Promise<void> {
    const handler = this.handlers.get(job.entity_type);
    
    if (!handler) {
      console.error(`[SyncWorker] No handler registered for entity type: ${job.entity_type}`);
      await this.queue.updateJobStatus(job.id, 'FAILED', true);
      return;
    }

    try {
      await this.queue.updateJobStatus(job.id, 'PROCESSING');
      
      // Execute the actual network sync operation
      await handler(job);
      
      await this.queue.updateJobStatus(job.id, 'COMPLETED');
    } catch (error) {
      console.error(`[SyncWorker] Job ${job.id} failed`, error);
      await this.queue.updateJobStatus(job.id, 'FAILED', true);
    }
  }
}
