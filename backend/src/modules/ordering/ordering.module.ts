import { Module } from '@nestjs/common';
import { LabsModule } from '../labs/labs.module';
import { PatientUxModule } from '../patient-ux/patient-ux.module';
import { MedicalOrdersModule } from '../medical-orders/medical-orders.module';
import { FamilyInsuranceController, OrderingApprovalController, ProviderApprovalController } from './ordering-approval.controller';
import { OrderingApprovalService } from './ordering-approval.service';
import { OrderingBroadcastController, ProviderBroadcastController } from './ordering-broadcast.controller';
import { OrderingBroadcastService } from './ordering-broadcast.service';
import { OrderingController } from './ordering.controller';
import { OrderingService } from './ordering.service';

// M3: quote, windows and one booking group over the M1 provider declarations. M4: ASAP and photo-order broadcast. M5: insurance per item.
@Module({
  imports: [LabsModule, MedicalOrdersModule, PatientUxModule],
  controllers: [OrderingController, OrderingBroadcastController, ProviderBroadcastController, OrderingApprovalController, ProviderApprovalController, FamilyInsuranceController],
  providers: [OrderingService, OrderingBroadcastService, OrderingApprovalService],
})
export class OrderingModule {}
