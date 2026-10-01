import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { NotificationsService } from '../notifications/notifications.service';
import { processNudge } from './engagement.controller';

@Processor('engagement-nudges')
export class EngagementProcessor extends WorkerHost {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly notifications: NotificationsService,
  ) {
    super();
  }

  async process(job: Job<{ eventId: string }>) {
    if (job.name !== 'nudge') return;
    await processNudge(this.conn, this.notifications, job.data.eventId);
  }
}
