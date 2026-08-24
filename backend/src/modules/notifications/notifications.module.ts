import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from '../../schemas/notification.schema';
import { NotificationRepository } from "./repositories/notification.repository";
import { NotificationDeliveryProcessor } from './notification-delivery.processor';

import { SmsModule } from '../sms/sms.module';
import { PushModule } from '../push/push.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    // M6/ER-8: delivery queue — retry (x4, exponential) + scheduled delivery
    BullModule.registerQueue({ name: 'notifications-delivery' }),
    SmsModule,
    PushModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationDeliveryProcessor,
    { provide: 'NotificationRepository', useClass: NotificationRepository },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
