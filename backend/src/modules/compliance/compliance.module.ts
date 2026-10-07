import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ScfhsLicenseService } from './scfhs-license.service';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { User, UserSchema } from '../../schemas/user.schema';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    MongooseModule.forFeature([
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
      { name: User.name, schema: UserSchema },
    ]),
    NotificationsModule,
  ],
  providers: [ScfhsLicenseService],
  exports: [ScfhsLicenseService, MongooseModule],
})
export class ComplianceModule {}