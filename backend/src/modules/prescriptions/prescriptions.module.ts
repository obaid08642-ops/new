import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { Prescription, PrescriptionSchema } from '../../schemas/prescription.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { MedicinesModule } from '../medicines/medicines.module';
import { PrescriptionRepository } from "./repositories/prescription.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: Prescription.name, schema: PrescriptionSchema },
    { name: Appointment.name, schema: AppointmentSchema },
    { name: ProviderProfile.name, schema: ProviderProfileSchema },
  ]), MedicinesModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, { provide: 'PrescriptionRepository', useClass: PrescriptionRepository }],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
