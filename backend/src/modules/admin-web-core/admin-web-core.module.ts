import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './controllers/analytics.controller';
import { FinanceController } from './controllers/finance.controller';
import { ProviderModerationController } from './controllers/provider-moderation.controller';
import { SystemHealthController } from './controllers/system-health.controller';
import { AdminConfigController } from './controllers/admin-config.controller';
import { AdminGovernanceController } from './controllers/admin-governance.controller';
import { AdminExtendedOperationsController } from './controllers/admin-extended-operations.controller';

import { HeatmapData, HeatmapDataSchema } from './schemas/heatmap-data.schema';
import { CommissionLedger, CommissionLedgerSchema } from './schemas/commission-ledger.schema';
import { FraudAlert, FraudAlertSchema } from './schemas/fraud-alert.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { ProcurementRequest, ProcurementRequestSchema } from './schemas/procurement-request.schema';
import { Provider, ProviderSchema } from './schemas/provider.schema';
import { SystemConfigExtended, SystemConfigExtendedSchema } from './schemas/system-config-extended.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';
import { ProviderWithdrawalSchema } from '../provider-ops/provider-ops.module';
import { EmergencyRequestSchema } from '../../schemas/emergency.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';
import { FinanceEngineModule } from '../finance-engine/finance-engine.module';

@Module({
  imports: [
    FinanceEngineModule,
    MongooseModule.forFeature([
      { name: HeatmapData.name, schema: HeatmapDataSchema },
      { name: CommissionLedger.name, schema: CommissionLedgerSchema },
      { name: FraudAlert.name, schema: FraudAlertSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ProcurementRequest.name, schema: ProcurementRequestSchema },
      { name: Provider.name, schema: ProviderSchema },
      { name: SystemConfigExtended.name, schema: SystemConfigExtendedSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: 'ProviderWithdrawal', schema: ProviderWithdrawalSchema },
      { name: 'EmergencyRequest', schema: EmergencyRequestSchema },
      { name: 'Appointment', schema: AppointmentSchema }
    ])
  ],
  controllers: [
    AnalyticsController,
    FinanceController,
    ProviderModerationController,
    SystemHealthController,
    AdminConfigController,
    AdminGovernanceController,
    AdminExtendedOperationsController
  ]
})
export class AdminWebCoreModule {}
