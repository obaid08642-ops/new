// @ts-nocheck
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MedicalProfileController } from './medical-profile.controller';
import { MedicalProfileService } from './medical-profile.service';
import { MedicalProfileSchema } from '../../schemas/medical-profile.schema';
import { MedicalProfileRepository } from "./repositories/medicalprofile.repository";

@Module({
  imports: [MongooseModule.forFeature([
    { name: 'MedicalProfile', schema: MedicalProfileSchema },
  ])],
  controllers: [MedicalProfileController],
  providers: [MedicalProfileService, { provide: 'MedicalProfileRepository', useClass: MedicalProfileRepository }],
  exports: [MedicalProfileService],
})
export class MedicalProfileModule {}
