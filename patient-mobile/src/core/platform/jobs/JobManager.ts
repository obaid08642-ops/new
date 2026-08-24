import { logger } from '../../../services/Logger';

export type JobStatus = 'pending' | 'running' | 'completed' | 'failed' | 'retrying';

export interface Job {
  id: string;
  name: string;
  payload: any;
  priority: 'low' | 'normal' | 'high' | 'critical';
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  nextRunAt?: Date;
}

export class JobManager {
  private log = logger.scope('JobManager');
  private jobs: Job[] = [];

  /**
   * Enqueue a background job for async processing
   */
  public async enqueue(name: string, payload: any, priority: Job['priority'] = 'normal'): Promise<string> {
    const job: Job = {
      id: `job-${Date.now()}`,
      name,
      payload,
      priority,
      status: 'pending',
      retryCount: 0,
      maxRetries: 3,
    };
    this.jobs.push(job);
    this.log.info(`Enqueued job: ${name} with priority ${priority}`);

    // In a real implementation, this triggers a background runner
    return job.id;
  }

  /**
   * Get the status of a specific job
   */
  public async getJobStatus(jobId: string): Promise<JobStatus | null> {
    const job = this.jobs.find(j => j.id === jobId);
    return job ? job.status : null;
  }

  /**
   * Cancel a pending job
   */
  public async cancel(jobId: string): Promise<boolean> {
    const idx = this.jobs.findIndex(j => j.id === jobId);
    if (idx !== -1 && ['pending', 'retrying'].includes(this.jobs[idx].status)) {
      this.jobs.splice(idx, 1);
      this.log.info(`Cancelled job: ${jobId}`);
      return true;
    }
    return false;
  }
}
