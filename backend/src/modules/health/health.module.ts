// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HealthService } from './health.service';
import { HealthModuleController } from './health.controller';
import { VitalReadingSchema, MedicationReminderSchema, SleepReadingSchema } from '../../schemas/health.schema';
import { MedicationReminderRepository } from "./repositories/medicationreminder.repository";
import { SleepReadingRepository } from "./repositories/sleepreading.repository";
import { VitalReadingRepository } from "./repositories/vitalreading.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'VitalReading', schema: VitalReadingSchema },
    { name: 'MedicationReminder', schema: MedicationReminderSchema },
    { name: 'SleepReading', schema: SleepReadingSchema },
  ])],
  controllers: [HealthModuleController],
  providers: [HealthService, { provide: 'MedicationReminderRepository', useClass: MedicationReminderRepository }, { provide: 'SleepReadingRepository', useClass: SleepReadingRepository }, { provide: 'VitalReadingRepository', useClass: VitalReadingRepository }],
  exports: [HealthService],
})
export class HealthModule {}
