import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProvidersController } from './providers.controller';
import { ProvidersService } from './providers.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { ProviderProfileRepository } from "./repositories/providerprofile.repository";
import { UserRepository } from "./repositories/user.repository";
import { HospitalSubEntity, HospitalSubEntitySchema } from './schemas/hospital-sub-entity.schema';
import { ProviderDelta, ProviderDeltaSchema } from './schemas/provider-delta.schema';
import { HospitalEnterpriseController } from './controllers/hospital-enterprise.controller';

import { ProviderBranch, ProviderBranchSchema } from '../../schemas/provider-branch.schema';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: HospitalSubEntity.name, schema: HospitalSubEntitySchema },
      { name: ProviderDelta.name, schema: ProviderDeltaSchema },
      { name: ProviderBranch.name, schema: ProviderBranchSchema },
      { name: Appointment.name, schema: AppointmentSchema },
    ]),
  ],
  controllers: [ProvidersController, HospitalEnterpriseController],
  providers: [ProvidersService, { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository }, { provide: 'UserRepository', useClass: UserRepository }],
  exports: [ProvidersService],
})
export class ProvidersModule {}
