import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderDelta, ProviderDeltaSchema } from '../providers/schemas/provider-delta.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';
import { EmergencyRequestSchema } from '../../schemas/emergency.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderDelta.name, schema: ProviderDeltaSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'EmergencyRequest', schema: EmergencyRequestSchema }
    ]),
  ],
  controllers: [AdminController],
})
export class AdminModule {}
