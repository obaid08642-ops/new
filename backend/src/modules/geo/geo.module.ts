import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SplIntegrationService } from './spl-integration.service';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderProfile, ProviderProfileSchema } from '../../schemas/provider-profile.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderProfile.name, schema: ProviderProfileSchema },
    ]),
  ],
  providers: [SplIntegrationService],
  exports: [SplIntegrationService, MongooseModule],
})
export class GeoModule {}