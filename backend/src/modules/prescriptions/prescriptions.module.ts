import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PrescriptionsController } from './prescriptions.controller';
import { PrescriptionsService } from './prescriptions.service';
import { Prescription, PrescriptionSchema } from '../../schemas/prescription.schema';
import { MedicinesModule } from '../medicines/medicines.module';
import { PrescriptionRepository } from "./repositories/prescription.repository";

@Module({
  imports: [MongooseModule.forFeature([{ name: Prescription.name, schema: PrescriptionSchema }]), MedicinesModule],
  controllers: [PrescriptionsController],
  providers: [PrescriptionsService, { provide: 'PrescriptionRepository', useClass: PrescriptionRepository }],
  exports: [PrescriptionsService],
})
export class PrescriptionsModule {}
