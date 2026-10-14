import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicinesController, PublicCatalogController } from './medicines.controller';
import { MedicinesService } from './medicines.service';
import { Medicine, MedicineSchema } from '../../schemas/medicine.schema';
import { MedicineRepository } from "./repositories/medicine.repository";
import { RxConsultController } from './rx-consult.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Medicine.name, schema: MedicineSchema }])],
  controllers: [MedicinesController, PublicCatalogController, RxConsultController],
  providers: [MedicinesService, { provide: 'MedicineRepository', useClass: MedicineRepository }],
  exports: [MedicinesService],
})
export class MedicinesModule {}
