import { Module } from '@nestjs/common';
import { DoctorMedicalOrderController, MedicalOrdersController } from './medical-orders.controller';
import { MedicalOrdersService } from './medical-orders.service';

// M2: the doctor's structured medical order and the patient's "My medical orders".
@Module({
  controllers: [DoctorMedicalOrderController, MedicalOrdersController],
  providers: [MedicalOrdersService],
})
export class MedicalOrdersModule {}
