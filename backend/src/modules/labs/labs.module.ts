import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { LabsController } from './labs.controller';
import { LabResultsController } from './lab-results.controller';
import { LabsEngineController } from './controllers/labs-engine.controller';
import { LabsService } from './labs.service';
import { LabResultsService } from './lab-results.service';
import { LabPdfService } from './lab-pdf.service';
import { LabServiceSchema, LabBookingSchema, LabSampleSchema } from '../../schemas/lab.schema';
import { LabResultSchema } from '../../schemas/lab-result.schema';
import { LabBookingSchema as LabCenterBookingSchema } from './schemas/lab-booking.schema';
import { LabCatalogSchema } from './schemas/lab-catalog.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { LabBookingRepository } from "./repositories/labbooking.repository";
import { LabResultRepository } from "./repositories/labresult.repository";
import { LabSampleRepository } from "./repositories/labsample.repository";
import { LabServiceRepository } from "./repositories/labservice.repository";

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: 'LabService', schema: LabServiceSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'LabCenterBooking', schema: LabCenterBookingSchema },
      { name: 'LabCatalog', schema: LabCatalogSchema },
      { name: 'LabResult', schema: LabResultSchema },
      { name: 'LabSample', schema: LabSampleSchema },
    ]),
  ],
  controllers: [LabsController, LabResultsController, LabsEngineController],
  providers: [LabsService, LabResultsService, LabPdfService, { provide: 'LabBookingRepository', useClass: LabBookingRepository }, { provide: 'LabResultRepository', useClass: LabResultRepository }, { provide: 'LabSampleRepository', useClass: LabSampleRepository }, { provide: 'LabServiceRepository', useClass: LabServiceRepository }],
  exports: [LabsService, LabResultsService, LabPdfService],
})
export class LabsModule {}
