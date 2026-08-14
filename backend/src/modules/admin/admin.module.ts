import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderDelta, ProviderDeltaSchema } from '../providers/schemas/provider-delta.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderDelta.name, schema: ProviderDeltaSchema }
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
