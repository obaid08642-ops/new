import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { AdminSickLeaveController, PatientSickLeaveController, ProviderSickLeaveController, PublicSickLeaveVerifyController } from './sick-leave.controller';
import { SickLeaveService } from './sick-leave.service';

@Module({
  imports: [NotificationsModule],
  controllers: [AdminSickLeaveController, PatientSickLeaveController, ProviderSickLeaveController, PublicSickLeaveVerifyController],
  providers: [SickLeaveService],
  exports: [SickLeaveService],
})
export class SickLeaveModule {}
