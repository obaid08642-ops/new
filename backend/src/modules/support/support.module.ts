import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SupportController } from './support.controller';
import { SupportService } from './support.service';
import { SupportRequestSchema, PatientSettingsSchema } from '../../schemas/support.schema';
import { PatientSettingsRepository } from "./repositories/patientsettings.repository";
import { SupportRequestRepository } from "./repositories/supportrequest.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'SupportRequest', schema: SupportRequestSchema },
    { name: 'PatientSettings', schema: PatientSettingsSchema },
  ])],
  controllers: [SupportController],
  providers: [SupportService, { provide: 'PatientSettingsRepository', useClass: PatientSettingsRepository }, { provide: 'SupportRequestRepository', useClass: SupportRequestRepository }],
})
export class SupportModule {}
