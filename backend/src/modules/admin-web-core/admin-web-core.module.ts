import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AnalyticsController } from './controllers/analytics.controller';
import { FinanceController } from './controllers/finance.controller';
import { ProviderModerationController } from './controllers/provider-moderation.controller';
import { AdminConfigController } from './controllers/admin-config.controller';
import { AdminGovernanceController } from './controllers/admin-governance.controller';
import { AdminExtendedOperationsController } from './controllers/admin-extended-operations.controller';

import { HeatmapData, HeatmapDataSchema } from './schemas/heatmap-data.schema';
import { CommissionLedger, CommissionLedgerSchema } from './schemas/commission-ledger.schema';
import { FraudAlert, FraudAlertSchema } from './schemas/fraud-alert.schema';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { ProcurementRequest, ProcurementRequestSchema } from './schemas/procurement-request.schema';
import { ProviderDelta, ProviderDeltaSchema } from './schemas/provider-delta.schema';
import { Provider, ProviderSchema } from './schemas/provider.schema';
import { SystemConfigExtended, SystemConfigExtendedSchema } from './schemas/system-config-extended.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './schemas/withdrawal-request.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: HeatmapData.name, schema: HeatmapDataSchema },
      { name: CommissionLedger.name, schema: CommissionLedgerSchema },
      { name: FraudAlert.name, schema: FraudAlertSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ProcurementRequest.name, schema: ProcurementRequestSchema },
      { name: ProviderDelta.name, schema: ProviderDeltaSchema },
      { name: Provider.name, schema: ProviderSchema },
      { name: SystemConfigExtended.name, schema: SystemConfigExtendedSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema }
    ])
  ],
  controllers: [
    AnalyticsController,
    FinanceController,
    ProviderModerationController,
    AdminConfigController,
    AdminGovernanceController,
    AdminExtendedOperationsController
  ]
})
export class AdminWebCoreModule {}
