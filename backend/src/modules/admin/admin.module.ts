import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BullModule } from '@nestjs/bullmq';
import { AdminController } from './admin.controller';
import { User, UserSchema } from '../../schemas/user.schema';
import { ProviderDelta, ProviderDeltaSchema } from '../provider/schemas/provider-delta.schema';
import { AppointmentSchema } from '../../schemas/appointment.schema';
import { EmergencyRequestSchema } from '../../schemas/emergency.schema';
// P5.3: merged from AdminAuthorityModule (authority/ → admin/)
import { AdminAuthorityController } from './authority/admin-authority.module';
import { AdminAuthorityService } from './authority/admin-authority.module';
import { AdminActionLogSchema } from './authority/admin-authority.module';
import { OrderSchema } from '../../schemas/order.schema';
import { LabBookingSchema } from '../../schemas/lab.schema';
import { RadiologyBookingSchema } from '../../schemas/radiology.schema';
// P5.3: merged from AdminCommandCenterModule (command-center/ → admin/)
import { AdminCommandCenterController, AdminCommandCenterService } from './command-center/admin-command-center.module';
import { HomeCareBookingSchema } from '../../schemas/home-care.schema';
import { ProviderProfileSchema } from '../../schemas/provider-profile.schema';
import { SystemEventSchema } from '../events/system-event.schema';
// P5.3: merged from AdminEnterpriseModule (enterprise/ → admin/)
import { MailModule } from '../mail/mail.module';
import { SeoSearchModule } from '../seo-search/seo-search.module';
import { WalletModule } from '../wallet/wallet.module';
import { PresenceModule } from '../presence/presence.module';
import { ImpersonationSecurityModule } from '../../common/impersonation-security.module';
import { AdminSecurityController } from './enterprise/admin-security.controller';
import { AdminDisputesController } from './enterprise/admin-disputes.controller';
import { AdminOrdersConsoleController } from './enterprise/admin-orders.controller';
import { OrdersConsoleService } from './enterprise/orders-console.service';
import { AdminFinanceSuiteController } from './enterprise/admin-finance.controller';
import { FinanceSuiteService } from './enterprise/finance-suite.service';
import { AnalyticsSuiteService } from './enterprise/analytics-suite.service';
import { AdminAnalyticsSuiteController, AdminScheduledReportsController } from './enterprise/admin-analytics.controller';
import { AdminCrmController, AdminGdprController } from './enterprise/admin-crm.controller';
import { PatientGdprController } from './enterprise/patient-gdpr.controller';
import { AdminSegmentsController } from './enterprise/admin-segments.controller';
import { AdminCouponsController } from './enterprise/admin-coupons.controller';
import { AdminCmsController } from './enterprise/admin-cms.controller';
import { AdminOpsController } from './enterprise/admin-ops.controller';
import { ScheduledReportsRunner } from './enterprise/scheduled-reports.runner';
import { AdminCommandCenterV2Controller } from './enterprise/command-center-v2.controller';
import { AdminGovernanceControlsController } from './enterprise/admin-governance-controls.controller';
import { AdminImpersonationController } from './enterprise/admin-impersonation.controller';
import { AdminAuditService } from './enterprise/audit.service';
// P5.3: merged from AdminGovernanceModule (governance/ → admin/)
import { WorkflowEngineModule } from '../workflow-engine/workflow-engine.module';
import { SystemConfig, SystemConfigSchema } from '../../schemas/system-config.schema';
import { B2BRequest, B2BRequestSchema } from '../../schemas/b2b-request.schema';
import {
  AdminGovernanceService,
  AdminGovernanceController as GovernanceAdminController,
  KillSwitchesController,
  CommissionsController,
} from './governance/admin-governance.module';
import { B2BController } from './governance/b2b.controller';
import { SystemConfigController, PublicSystemConfigController } from './governance/system-config.controller';
// P5.3: merged from AdminNotificationCenterModule (notification-center/ → admin/)
import { PushModule } from '../push/push.module';
import {
  AdminNotificationCenterController,
  AdminNotificationCenterService,
} from './notification-center/admin-notification-center.module';
// P5.3: merged from AdminWebCoreModule (web-core/ → admin/)
import { FinanceEngineModule } from '../finance-engine/finance-engine.module';
import { ProviderWithdrawalSchema } from '../provider-ops/provider-ops.module';
import { AnalyticsController } from './web-core/controllers/analytics.controller';
import { FinanceController } from './web-core/controllers/finance.controller';
import { SystemHealthController } from './web-core/controllers/system-health.controller';
import { AdminConfigController } from './web-core/controllers/admin-config.controller';
import { AdminGovernanceController as WebCoreGovernanceController } from './web-core/controllers/admin-governance.controller';
import { AdminExtendedOperationsController } from './web-core/controllers/admin-extended-operations.controller';
import { HeatmapData, HeatmapDataSchema } from './web-core/schemas/heatmap-data.schema';
import { CommissionLedger, CommissionLedgerSchema } from './web-core/schemas/commission-ledger.schema';
import { FraudAlert, FraudAlertSchema } from './web-core/schemas/fraud-alert.schema';
import { AuditLog, AuditLogSchema } from './web-core/schemas/audit-log.schema';
import { ProcurementRequest, ProcurementRequestSchema } from './web-core/schemas/procurement-request.schema';
import { Provider, ProviderSchema } from './web-core/schemas/provider.schema';
import { SystemConfigExtended, SystemConfigExtendedSchema } from './web-core/schemas/system-config-extended.schema';
import { WithdrawalRequest, WithdrawalRequestSchema } from './web-core/schemas/withdrawal-request.schema';
import { AuditIngestController } from './admin-audit-ingest.controller';

@Module({
  imports: [
    ImpersonationSecurityModule,
    WalletModule,
    MailModule,
    SeoSearchModule,
    PresenceModule,
    BullModule.registerQueue({ name: 'notifications-delivery' }),
    WorkflowEngineModule,
    FinanceEngineModule,
    PushModule,
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: ProviderDelta.name, schema: ProviderDeltaSchema },
      { name: 'Appointment', schema: AppointmentSchema },
      { name: 'EmergencyRequest', schema: EmergencyRequestSchema },
      // P5.3: merged from AdminAuthorityModule
      { name: 'Order', schema: OrderSchema },
      { name: 'LabBooking', schema: LabBookingSchema },
      { name: 'RadiologyBooking', schema: RadiologyBookingSchema },
      { name: 'AdminActionLog', schema: AdminActionLogSchema },
      // P5.3: merged from AdminCommandCenterModule
      { name: 'HomeCareBooking', schema: HomeCareBookingSchema },
      { name: 'ProviderProfile', schema: ProviderProfileSchema },
      { name: 'SystemEvent', schema: SystemEventSchema },
      // P5.3: merged from AdminGovernanceModule
      { name: SystemConfig.name, schema: SystemConfigSchema },
      { name: B2BRequest.name, schema: B2BRequestSchema },
      // P5.3: merged from AdminWebCoreModule
      { name: HeatmapData.name, schema: HeatmapDataSchema },
      { name: CommissionLedger.name, schema: CommissionLedgerSchema },
      { name: FraudAlert.name, schema: FraudAlertSchema },
      { name: AuditLog.name, schema: AuditLogSchema },
      { name: ProcurementRequest.name, schema: ProcurementRequestSchema },
      { name: Provider.name, schema: ProviderSchema },
      { name: SystemConfigExtended.name, schema: SystemConfigExtendedSchema },
      { name: WithdrawalRequest.name, schema: WithdrawalRequestSchema },
      { name: 'ProviderWithdrawal', schema: ProviderWithdrawalSchema },
    ]),
  ],
  controllers: [
    AdminController,
    // P5.3: merged from AdminAuthorityModule
    AdminAuthorityController,
    // P5.3: merged from AdminCommandCenterModule
    AdminCommandCenterController,
    // P5.3: merged from AdminEnterpriseModule
    AdminSecurityController,
    AdminImpersonationController,
    AdminDisputesController,
    AdminOrdersConsoleController,
    AdminFinanceSuiteController,
    AdminAnalyticsSuiteController,
    AdminScheduledReportsController,
    AdminCrmController,
    AdminGdprController,
    PatientGdprController,
    AdminSegmentsController,
    AdminCmsController,
    AdminCouponsController,
    AdminOpsController,
    AdminGovernanceControlsController,
    AdminCommandCenterV2Controller,
    // P5.3: merged from AdminGovernanceModule
    GovernanceAdminController,
    KillSwitchesController,
    CommissionsController,
    B2BController,
    SystemConfigController,
    PublicSystemConfigController,
    // P5.3: merged from AdminNotificationCenterModule
    AdminNotificationCenterController,
    // P5.3: merged from AdminWebCoreModule
    AnalyticsController,
    FinanceController,
    SystemHealthController,
    AdminConfigController,
    WebCoreGovernanceController,
    AdminExtendedOperationsController,,
    AuditIngestController
],
  providers: [
    // P5.3: merged from AdminAuthorityModule
    AdminAuthorityService,
    // P5.3: merged from AdminCommandCenterModule
    AdminCommandCenterService,
    // P5.3: merged from AdminEnterpriseModule
    AdminAuditService,
    OrdersConsoleService,
    FinanceSuiteService,
    AnalyticsSuiteService,
    ScheduledReportsRunner,
    // P5.3: merged from AdminGovernanceModule
    AdminGovernanceService,
    // P5.3: merged from AdminNotificationCenterModule
    AdminNotificationCenterService,
  ],
  exports: [
    AdminAuthorityService,
    AdminNotificationCenterService,
    AdminAuditService,
    OrdersConsoleService,
    FinanceSuiteService,
    AnalyticsSuiteService,
    AdminGovernanceService,
  ],
})
export class AdminModule {}
