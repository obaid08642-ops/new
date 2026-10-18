import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RadiologyController as RadiologyPublicController } from './radiology.controller';
import { RadiologyOpsService } from './radiology.service';
import { RadiologyProviderController } from './controllers/radiology-provider.controller';
import { RadiologyServiceSchema, RadiologyMachineSchema, RadiologyBookingSchema as LegacyRadiologyBookingSchema } from '../../schemas/radiology.schema';
import { ProviderNotificationSchema } from '../provider/schemas/requests.schema';
import { RadiologyBookingSchema as RadiologyCenterBookingSchema } from './schemas/radiology-booking.schema';
import { UserSchema } from '../../schemas/user.schema';
import { LabResultSchema } from '../../schemas/lab-result.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { InsuranceEngineModule } from '../insurance-engine/insurance-engine.module';
import { LabResultRepository } from "./repositories/labresult.repository";
import { RadiologyBookingRepository } from "./repositories/radiologybooking.repository";
import { RadiologyServiceRepository } from "./repositories/radiologyservice.repository";
import { RadiologyNotificationListener } from './listeners/radiology-notification.listener';
import { RadiologyReminderCron } from './cron/radiology-reminder.cron';
import { StorageObjectSchema } from '../storage/storage.module';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';


import { ApprovalWorkflowModule } from '../approval-workflow/approval-workflow.module';
@Module({
  imports: [
    WorkflowEngineModule,
    InsuranceEngineModule,
    ApprovalWorkflowModule,
    MongooseModule.forFeature([
      { name: 'RadiologyService', schema: RadiologyServiceSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: 'RadiologyBooking', schema: LegacyRadiologyBookingSchema },
      { name: 'RadiologyCenterBooking', schema: RadiologyCenterBookingSchema },
      { name: 'RadiologyMachine', schema: RadiologyMachineSchema },
      { name: 'LabResult', schema: LabResultSchema },
      { name: 'ProviderNotification', schema: ProviderNotificationSchema },
      { name: 'User', schema: UserSchema },
      { name: 'StorageObject', schema: StorageObjectSchema },
    ]),
  ],
  // controllers/radiology.controller.ts (a second RadiologyController) was removed: its book/mine/:id shadowed these
  // routes and wrote a store the center app never reads; its allocate/finalize duplicated the provider controller
  // without ownership checks.
  controllers: [RadiologyProviderController, RadiologyPublicController],
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
