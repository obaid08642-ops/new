import { Module, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { MongooseModule, InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { RADIOLOGY_SEED } from './radiology.seed';
import { RadiologyController } from './controllers/radiology.controller';
import { RadiologyController as RadiologyPublicController } from './radiology.controller';
import { RadiologyOpsService } from './radiology.service';
import { RadiologyProviderController } from './controllers/radiology-provider.controller';
import { RadiologyServiceSchema, RadiologyMachineSchema, RadiologyBookingSchema as LegacyRadiologyBookingSchema } from '../../schemas/radiology.schema';
import { ProviderNotificationSchema } from '../provider/schemas/requests.schema';
import { RadiologyBookingSchema as RadiologyCenterBookingSchema } from './schemas/radiology-booking.schema';
import { UserSchema } from '../../schemas/user.schema';
import { LabResultSchema } from '../../schemas/lab-result.schema';
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { LabResultRepository } from "./repositories/labresult.repository";
import { RadiologyBookingRepository } from "./repositories/radiologybooking.repository";
import { RadiologyServiceRepository } from "./repositories/radiologyservice.repository";
import { RadiologyNotificationListener } from './listeners/radiology-notification.listener';
import { RadiologyReminderCron } from './cron/radiology-reminder.cron';
import { StorageObjectSchema } from '../storage/storage.module';

@Injectable()
export class RadiologySeed implements OnModuleInit {
  private readonly logger = new Logger('RadiologySeed');
  constructor(@InjectModel('RadiologyService') private readonly svcModel: Model<any>) {}
  async onModuleInit() {
    const existing = await this.svcModel.countDocuments({ id: { $ne: null } });
    if (existing >= RADIOLOGY_SEED.length) return;
    let ok = 0;
    for (const x of RADIOLOGY_SEED as any[]) {
      try {
        await this.svcModel.updateOne(
          { short_code: x.short_code },
          { $setOnInsert: { ...x, id: x.id || require('uuid').v4(), active: true } },
          { upsert: true },
        );
        ok++;
      } catch (e: any) {
        this.logger.error(`seed_doc_failed (${x?.short_code}): ${e?.message?.slice(0, 120)}`);
      }
    }
    this.logger.log(`Seeded ${ok}/${RADIOLOGY_SEED.length} radiology services`);
  }
}

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
      { name: 'User', schema: UserSchema },
      { name: 'StorageObject', schema: StorageObjectSchema },
    ]),
  ],
  controllers: [RadiologyController, RadiologyProviderController, RadiologyPublicController],
  providers: [
    RadiologyOpsService, 
    RadiologyNotificationListener,
    RadiologyReminderCron,
    RadiologySeed,
    { provide: 'LabResultRepository', useClass: LabResultRepository }, 
    { provide: 'RadiologyBookingRepository', useClass: RadiologyBookingRepository }, 
    { provide: 'RadiologyServiceRepository', useClass: RadiologyServiceRepository }
  ],
  exports: [RadiologyOpsService],
})
export class RadiologyModule {}
