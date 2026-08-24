import { logger } from '../../../services/Logger';

export interface QueueEntry {
  queueId: string;
  patientId: string;
  joinedAt: Date;
  priority: 'normal' | 'high' | 'urgent';
  estimatedWaitMinutes: number;
  status: 'waiting' | 'in-consultation' | 'completed' | 'cancelled';
}

export class QueueEngine {
  private log = logger.scope('QueueEngine');

  /**
   * Add a patient to a provider's digital queue.
   */
  public async enqueue(providerId: string, patientId: string, priority: QueueEntry['priority']): Promise<QueueEntry> {
    this.log.info(`Patient ${patientId} joined queue for ${providerId} with priority ${priority}`);
    return {
      queueId: 'q-123',
      patientId,
      joinedAt: new Date(),
      priority,
      estimatedWaitMinutes: 15,
      status: 'waiting',
    };
  }

  /**
   * Estimate the current waiting time for a new entry.
   */
  public async estimateWaitTime(providerId: string): Promise<number> {
    return 15;
  }

  /**
   * Update the status of a patient in the queue.
   */
  public async updateStatus(queueId: string, status: QueueEntry['status']): Promise<void> {
    this.log.info(`Queue ${queueId} status updated to ${status}`);
  }
}
