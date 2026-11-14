import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { backgroundProviders } from '../../common/process-role';
import { DURABLE_QUEUE, DurableEventsService } from './durable-events.service';
import { DurableEventsProcessor, DurableEventsSweeper } from './durable-events.processor';
import { PaymentEventsReconciler } from './payment-events.reconciler';

/** Global: any service injects DurableEventsService (@Optional) without importing this module. Producers run in every role; the consumer and the sweeper only in the worker role. */
@Global()
@Module({
  imports: [BullModule.registerQueue({ name: DURABLE_QUEUE })],
  providers: [DurableEventsService, PaymentEventsReconciler, ...backgroundProviders([DurableEventsProcessor, DurableEventsSweeper])],
  exports: [DurableEventsService],
})
export class DurableEventsModule {}
