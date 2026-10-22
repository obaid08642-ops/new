import { Module } from '@nestjs/common';
import { LabsModule } from '../labs/labs.module';
import { MedicalOrdersModule } from '../medical-orders/medical-orders.module';
import { OrderingBroadcastController, ProviderBroadcastController } from './ordering-broadcast.controller';
import { OrderingBroadcastService } from './ordering-broadcast.service';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';

// M3: quote, windows and one booking group over the M1 provider declarations. M4: ASAP and photo-order broadcast.
@Module({
  imports: [LabsModule, MedicalOrdersModule],
  controllers: [OrderingController, OrderingBroadcastController, ProviderBroadcastController],
  providers: [OrderingService, OrderingBroadcastService],
})
export class OrderingModule {}
