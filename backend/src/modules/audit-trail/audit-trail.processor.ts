import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { AUDIT_QUEUE_NAME, AuditTrailService } from './audit-trail.service';

/**
 * Phase 23.3 — queue worker for audit writes (same pattern as the
 * `notifications-delivery` processor). A slow log never slows the user;
 * BullMQ retries with exponential backoff, then the failure is logged.
 */
@Processor(AUDIT_QUEUE_NAME)
export class AuditTrailProcessor extends WorkerHost {
  private readonly logger = new Logger('AuditTrailQueue');

  constructor(private readonly audit: AuditTrailService) {
    super();
  }

  async process(job: Job<any>): Promise<void> {
    if (job.name !== 'persist') return;
    try {
      await this.audit.persistEvent(job.data || {});
    } catch (err: any) {
      this.logger.error(`audit persist failed: ${err?.message || err}`);
      throw err;
    }
  }
}
