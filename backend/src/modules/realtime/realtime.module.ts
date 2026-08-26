import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RealtimeGateway } from './realtime.gateway';
import { RealtimeService } from './realtime.service';
import { AuthModule } from '../auth/auth.module';
import { PresenceModule } from '../presence/presence.module';
import { Appointment, AppointmentSchema } from '../../schemas/appointment.schema';
import { ChatModule } from '../chat/chat.module';
import { LiveKitModule } from '../livekit/livekit.module';

@Module({
  imports: [
    AuthModule,
    PresenceModule,
    ChatModule,
    LiveKitModule,
    MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]),
  ],
  providers: [RealtimeGateway, RealtimeService],
  exports: [RealtimeService, RealtimeGateway],
})
export class RealtimeModule {}
