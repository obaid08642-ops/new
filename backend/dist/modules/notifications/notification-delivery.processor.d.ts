import { WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { NotificationsService } from './notifications.service';
export declare class NotificationDeliveryProcessor extends WorkerHost {
    private readonly svc;
    private logger;
    constructor(svc: NotificationsService);
    process(job: Job<{
        id: string;
    }>): Promise<void>;
}
