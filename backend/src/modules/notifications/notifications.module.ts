import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { Notification, NotificationSchema } from '../../schemas/notification.schema';
import { NotificationRepository } from "./repositories/notification.repository";

import { SmsModule } from '../sms/sms.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Notification.name, schema: NotificationSchema }]),
    SmsModule,
  ],
  controllers: [NotificationsController],
  providers: [NotificationsService, { provide: 'NotificationRepository', useClass: NotificationRepository }],
  exports: [NotificationsService],
})
export class NotificationsModule {}
