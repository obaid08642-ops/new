import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RadiologyController } from './controllers/radiology.controller';
import { RadiologyOpsService } from './radiology.service';
import { RadiologyProviderController } from './controllers/radiology-provider.controller';
import { RadiologyServiceSchema, RadiologyMachineSchema, RadiologyBookingSchema as LegacyRadiologyBookingSchema } from '../../schemas/radiology.schema';
import { ProviderNotificationSchema } from '../provider/schemas/requests.schema';
import { RadiologyBookingSchema as RadiologyCenterBookingSchema } from './schemas/radiology-booking.schema';
import { LabResultSchema } from '../../schemas/lab-result.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { LabResultRepository } from "./repositories/labresult.repository";
import { RadiologyBookingRepository } from "./repositories/radiologybooking.repository";
import { RadiologyServiceRepository } from "./repositories/radiologyservice.repository";
import { RadiologyNotificationListener } from './listeners/radiology-notification.listener';
import { RadiologyReminderCron } from './cron/radiology-reminder.cron';

@Module({
  imports: [
    WorkflowEngineModule,
    MongooseModule.forFeature([
      { name: 'RadiologyService', schema: RadiologyServiceSchema },
      { name: 'RadiologyBooking', schema: LegacyRadiologyBookingSchema },
      { name: 'RadiologyCenterBooking', schema: RadiologyCenterBookingSchema },
      { name: 'RadiologyMachine', schema: RadiologyMachineSchema },
      { name: 'LabResult', schema: LabResultSchema },
      { name: 'ProviderNotification', schema: ProviderNotificationSchema },
    ]),
  ],
  controllers: [RadiologyController, RadiologyProviderController],
  providers: [
    RadiologyOpsService, 
    RadiologyNotificationListener,
    RadiologyReminderCron,
    { provide: 'LabResultRepository', useClass: LabResultRepository }, 
    { provide: 'RadiologyBookingRepository', useClass: RadiologyBookingRepository }, 
    { provide: 'RadiologyServiceRepository', useClass: RadiologyServiceRepository }
  ],
  exports: [RadiologyOpsService],
})
export class RadiologyModule {}
