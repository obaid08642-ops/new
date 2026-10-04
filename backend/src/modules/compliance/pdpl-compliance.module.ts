import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CryptoModule } from '../../common/crypto/crypto.module';
import { MedicalAccessLog, MedicalAccessLogSchema } from '../../schemas/medical-access-log.schema';
import { MedicalAccessLogService } from '../care/medical-access-log.service';

@Module({
  imports: [
    CryptoModule,
    MongooseModule.forFeature([
      { name: MedicalAccessLog.name, schema: MedicalAccessLogSchema },
    ]),
  ],
  providers: [MedicalAccessLogService],
  exports: [MedicalAccessLogService, MongooseModule],
})
export class PdplComplianceModule {}
