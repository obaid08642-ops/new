import { Module } from '@nestjs/common';
import { PatientSickLeaveController, ProviderSickLeaveController, PublicSickLeaveVerifyController } from './sick-leave.controller';
import { SickLeaveService } from './sick-leave.service';

@Module({
  controllers: [PatientSickLeaveController, ProviderSickLeaveController, PublicSickLeaveVerifyController],
  providers: [SickLeaveService],
  exports: [SickLeaveService],
})
export class SickLeaveModule {}
