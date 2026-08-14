import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicinesController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { MedicineRepository } from "./repositories/medicine.repository";

@Module({
  imports: [MongooseModule.forFeature([{ name: Medicine.name, schema: MedicineSchema }])],
  controllers: [MedicinesController],
  providers: [MedicinesService, { provide: 'MedicineRepository', useClass: MedicineRepository }],
  exports: [MedicinesService],
})
export class MedicinesModule {}
