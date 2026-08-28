import { Model } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
export declare class RadiologyReminderCron {
    private bkgModel;
    private events;
    private readonly logger;
    constructor(bkgModel: Model<any>, events: EventEmitter2);
    handlePreparationReminders(): Promise<void>;
}
