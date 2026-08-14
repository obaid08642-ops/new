// @ts-nocheck
import { Global, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SystemEvent, SystemEventSchema } from './system-event.schema';
import { EventBusService } from './event-bus.service';
import { AdminEventsController } from './events.controllers';
import { SystemEventRepository } from "./repositories/systemevent.repository";

@Global()
@Module({
  imports: [MongooseModule.forFeature([{ name: 'SystemEvent', schema: SystemEventSchema }])],
  controllers: [AdminEventsController],
  providers: [EventBusService, { provide: 'SystemEventRepository', useClass: SystemEventRepository }],
  exports: [EventBusService],
})
export class EventsModule {}
