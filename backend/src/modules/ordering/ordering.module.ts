import { Module } from '@nestjs/common';
import { LabsModule } from '../labs/labs.module';
import { MedicalOrdersModule } from '../medical-orders/medical-orders.module';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';

// M3: quote, windows and one booking group over the M1 provider declarations.
@Module({
  imports: [LabsModule, MedicalOrdersModule],
  controllers: [OrderingController],
  providers: [OrderingService],
})
export class OrderingModule {}
