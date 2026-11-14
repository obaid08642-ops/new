/**
 * M6 / ER-8: BullMQ delivery processor with retry + scheduled delivery.
 * Jobs are enqueued by NotificationsService.create(); failures throw so
 * BullMQ retries with exponential backoff (configured at queue registration).
 */
import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { forwardRef, Inject, Logger } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { traced } from '../../common/trace';

@Processor('notifications-delivery')
export class NotificationDeliveryProcessor extends WorkerHost {
  private logger = new Logger('NotificationDelivery');

  constructor(
    @Inject(forwardRef(() => NotificationsService))
    private readonly svc: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ id: string }>) {
    if (job.name !== 'deliver') return;
    await traced('notifications-delivery deliver', 'queue.process', () => this.svc.deliverById(job.data.id), { 'queue.name': 'notifications-delivery', 'job.name': job.name });
  }
}
