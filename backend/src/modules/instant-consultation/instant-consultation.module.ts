import { Module } from '@nestjs/common';
import { DoctorInstantConsultationController, PatientInstantConsultationController } from './instant-consultation.controller';
import { InstantConsultationService } from './instant-consultation.service';

// M8: instant consultation broadcast to the online doctors of a specialty.
@Module({
  controllers: [DoctorInstantConsultationController, PatientInstantConsultationController],
  providers: [InstantConsultationService],
})
export class InstantConsultationModule {}
