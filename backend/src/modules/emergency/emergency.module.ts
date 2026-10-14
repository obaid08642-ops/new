import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { EmergencyController } from './emergency.controller';
import { EmergencyService } from './emergency.service';

/** D-14: only "share my location with my emergency contacts" remains; the ambulance system is removed. */
@Module({
  imports: [NotificationsModule],
  controllers: [EmergencyController],
  providers: [EmergencyService],
  exports: [EmergencyService],
})
export class EmergencyModule {}
