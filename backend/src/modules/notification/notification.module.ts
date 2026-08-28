import { Module } from '@nestjs/common';
import { NotificationService } from './notification.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  providers: [NotificationService],
  exports: [NotificationService],
})
export class NotificationModule {}
