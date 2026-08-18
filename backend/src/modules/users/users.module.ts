import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { UsersAddressesController } from './users.addresses.controller';
import { UsersInsuranceController } from './users.insurance.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { PatientProfile, PatientProfileSchema } from '../../schemas/patient-profile.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { UserRepository } from './repositories/user.repository';
import { PatientProfileRepository } from './repositories/patient-profile.repository';
import { ProviderProfileRepository } from './repositories/provider-profile.repository';
import { DataRetentionService } from './data-retention.service';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: PatientProfile.name, schema: PatientProfileSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
    ]),
  ],
  controllers: [UsersController, UsersAddressesController, UsersInsuranceController],
  providers: [
    UsersService,
    { provide: 'UserRepository', useClass: UserRepository },
    { provide: 'PatientProfileRepository', useClass: PatientProfileRepository },
    { provide: 'ProviderProfileRepository', useClass: ProviderProfileRepository },
    DataRetentionService
  ],
  exports: [UsersService],
})
export class UsersModule {}
