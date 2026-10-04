import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { EngagementController } from './engagement.controller';
import { EngagementProcessor } from './engagement.processor';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    BullModule.registerQueue({ name: 'engagement-nudges' }),
    MongooseModule.forFeature([]),
    NotificationsModule,
  ],
  controllers: [EngagementController],
  providers: [EngagementProcessor],
  exports: [EngagementProcessor],
})
export class EngagementModule {}
