
import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { LiveKitModule } from './modules/livekit/livekit.module';
import { CoturnModule } from './modules/coturn/coturn.module';
import { RedisModule } from './modules/redis/redis.module';
import { MailModule } from './modules/mail/mail.module';
import { AdminNotificationCenterModule } from './modules/admin-notification-center/admin-notification-center.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { ApiSecurityModule } from './modules/api-security/api-security.module';
import { DeviceTrustModule } from './modules/device-trust/device-trust.module';
import { SeoSearchModule } from './modules/seo-search/seo-search.module';
import { LegalModule } from './modules/legal/legal.module';
import { RatingsModule } from './modules/ratings/ratings.module';
import { ProviderPayoutsController } from './modules/payouts/provider-payouts.controller';
import { PresenceModule } from './modules/presence/presence.module';
import { OpsModule } from './modules/ops/ops.module';
import { FeatureFlagsModule } from './modules/feature-flags/feature-flags.module';
import { MediaModule } from './modules/media/media.module';
import { NotificationModule } from './modules/notification/notification.module';
import { MoyasarModule } from './modules/moyasar/moyasar.module';
import { FinanceEngineModule } from './modules/finance-engine/finance-engine.module';
import { ConfigModule } from '@nestjs/config';
import { validateEnvironment } from './config/env.validation';
import { MongooseModule } from '@nestjs/mongoose';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { BullModule } from '@nestjs/bullmq';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';
import { MedicinesModule } from './modules/medicines/medicines.module';
import { EmergencyModule } from './modules/emergency/emergency.module';
import { RealtimeModule } from './modules/realtime/realtime.module';
import { I18nCoreModule } from './modules/i18n/i18n.module';
import { AiModule } from './modules/ai/ai.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { EventsModule } from './modules/events/events.module';
import { ProvidersModule } from './modules/providers/providers.module';
import { SeedModule } from './modules/seed/seed.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { PharmacyOpsModule } from './modules/pharmacy_ops/pharmacy_ops.module';
import { CareModule } from './modules/care/care.module';
import { LabsModule } from './modules/labs/labs.module';
import { HomeCareModule } from './modules/home-care/home-care.module';
import { HealthModule } from './modules/health/health.module';
import { SupportModule } from './modules/support/support.module';
import { CustomServicesModule } from './modules/custom-services/custom-services.module';
import { MedicalProfileModule } from './modules/medical-profile/medical-profile.module';
import { TimelineModule } from './modules/timeline/timeline.module';
import { SeoModule } from './modules/seo/seo.module';
import { RadiologyModule } from './modules/radiology/radiology.module';
import { MedicalReportsModule } from './modules/medical-reports/medical-reports.module';
import { ProviderModule } from './modules/provider/provider.module';
import { PharmacyModule } from './modules/pharmacy/pharmacy.module';
import { StorageModule } from './modules/storage/storage.module';
import { ServiceCatalogModule } from './modules/service-catalog/service-catalog.module';
import { CartModule } from './modules/cart/cart.module';
import { AdminAuthorityModule } from './modules/admin-authority/admin-authority.module';

function bullRedisConnection() {
  const configuredUrl = process.env.REDIS_URL ? new URL(process.env.REDIS_URL) : undefined;
  return {
    host: configuredUrl?.hostname || process.env.REDIS_HOST || 'localhost',
    port: Number(configuredUrl?.port || process.env.REDIS_PORT || '6379'),
    password: configuredUrl?.password ? decodeURIComponent(configuredUrl.password) : (process.env.REDIS_PASSWORD || undefined),
    ...(configuredUrl?.protocol === 'rediss:' ? { tls: {} } : {}),
  };
}
import { ProviderOnboardingModule } from './modules/provider-onboarding/provider-onboarding.module';
import { UnifiedBookingsModule } from './modules/unified-bookings/unified-bookings.module';
import { AdminGovernanceModule } from './modules/admin-governance/admin-governance.module';
import { WorkflowEngineModule } from './modules/workflow-engine/workflow-engine.module';
import { BookingFlowModule } from './modules/booking-flow/booking-flow.module';
import { ProviderJobsModule } from './modules/provider-jobs/provider-jobs.module';
import { AdminCommandCenterModule } from './modules/admin-command-center/admin-command-center.module';
import { BusinessRulesModule } from './modules/business-rules/business-rules.module';
import { BansModule } from './modules/bans/bans.module';
import { BansMiddleware } from './modules/bans/bans.middleware';
import { ConsistencyModule } from './modules/consistency/consistency.module';
import { EventReliabilityModule } from './modules/event-reliability/event-reliability.module';
import { OperationsSafetyModule } from './modules/operations-safety/operations-safety.module';
import { LegacyModule } from './modules/legacy/legacy.module';
import { BookingOpsModule } from './modules/booking-ops/booking-ops.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { SlotLocksModule } from './modules/slot-locks/slot-locks.module';
import { PushModule } from './modules/push/push.module';
import { SecurityModule } from './modules/security/security.module';
import { RealtimeSseModule } from './modules/realtime/realtime.sse';
import { ProviderOpsModule } from './modules/provider-ops/provider-ops.module';
import { PatientUxModule } from './modules/patient-ux/patient-ux.module';
import { ChatModule } from './modules/chat/chat.module';
import { HospitalStaffModule } from './modules/hospital-staff/hospital-staff.module';
import { WebhooksModule } from './modules/webhooks/webhooks.module';
import { ClientConfigModule } from './modules/config/config.module';
import { ExportModule } from './modules/export/export.module';
import { InsuranceModule } from './modules/insurance/insurance.module';
import { ApprovalWorkflowModule } from './modules/approval-workflow/approval-workflow.module';
import { RecruitmentModule } from './modules/recruitment/recruitment.module';
import { FamilyModule } from './modules/family/family.module';
import { CommunityModule } from './modules/community/community.module';
import { LoyaltyModule } from './modules/loyalty/loyalty.module';
import { ReferralModule } from './modules/referral/referral.module';
import { FacilityOpsModule } from './modules/facility-ops/facility-ops.module';
import { ProviderProductionModule } from './modules/provider-production/provider-production.module';
import { HealthController } from './health.controller';
import { HealthDashboardController } from './modules/health/health-dashboard.controller';
import { JwtAuthGuard } from './common/auth.guard';
import { AuditLogInterceptor } from './common/audit-log.interceptor';
import { IdempotencyInterceptor } from './common/idempotency.interceptor';

import { MaternityModule } from './modules/maternity/maternity.module';
import { NabdExtensionsModule } from './modules/nabd-extensions/nabd-extensions.module';
import { NutritionModule } from './modules/nutrition/nutrition.module';
import { MentalHealthModule } from './modules/mental-health/mental-health.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { ReturnsModule } from './modules/returns/returns.module';
import { AdminModule } from './modules/admin/admin.module';
import { HospitalModule } from './modules/hospital/hospital.module';
import { AdminWebCoreModule } from './modules/admin-web-core/admin-web-core.module';
import { AdminEnterpriseModule } from './modules/admin-enterprise/admin-enterprise.module';
import { HomeModule } from './modules/home/home.module';
import { SystemHealthModule } from './modules/system-health/system-health.module';
import { HomeCareCompatModule } from './modules/home-care-compat/home-care-compat.module';
import { CompatModule } from './modules/compat/compat.module';
import { AdminSpaModule } from './modules/compat/admin-spa.module';
import { InsuranceEngineModule } from './modules/insurance-engine/insurance-engine.module';
import { BillingModule } from './modules/billing/billing.module';
import { ArticlesModule } from './modules/articles/articles.module';

import { CorrelationMiddleware } from './common/correlation.middleware';
import { DoctorsModule } from './modules/doctors/doctors.module';
import { RolesGuard } from './modules/admin-web-core/guards/roles.guard';

@Module({
  imports: [
    HomeModule,
    HospitalModule,
    LiveKitModule,
    CoturnModule,
    RedisModule,
    MailModule,
    AdminNotificationCenterModule,
    AnalyticsModule,
    ApiSecurityModule,
    DeviceTrustModule,
    SeoSearchModule,
    LegalModule,
    RatingsModule,
    PresenceModule,
    OpsModule,
    FeatureFlagsModule,
    MediaModule,
    NotificationModule,
    ConfigModule.forRoot({ isGlobal: true, validate: validateEnvironment }),
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGO_URL || 'mongodb://localhost:27017',
        dbName: process.env.DB_NAME || 'nabd_nestjs',
        connectionFactory: (connection) => {
          connection.plugin(require('./common/database/audit.plugin').AuditPlugin);
          return connection;
        }
      }),
    }),
    BullModule.forRoot({
      connection: bullRedisConnection(),
    }),
    EventEmitterModule.forRoot({ wildcard: true, maxListeners: 50 }),
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: process.env.THROTTLER_LIMIT ? parseInt(process.env.THROTTLER_LIMIT, 10) : 200 }]),
    I18nCoreModule,
    AuthModule,
    UsersModule,
    MedicinesModule,
    ProvidersModule,
    PrescriptionsModule,
    OrdersModule,
    EmergencyModule,
    AiModule,
    NotificationsModule,
    EventsModule,
    RealtimeModule,
    SeedModule,
    DriversModule,
    PharmacyOpsModule,
    CareModule,
    DoctorsModule,
    LabsModule,
    HealthModule,
    SystemHealthModule,
    SupportModule,
    CustomServicesModule,
    MedicalProfileModule,
    TimelineModule,
    SeoModule,
    RadiologyModule,
    MedicalReportsModule,
    StorageModule,
    ProviderModule,
    PharmacyModule,
    ServiceCatalogModule,
    CartModule,
    AdminAuthorityModule,
    ProviderOnboardingModule,
    UnifiedBookingsModule,
    AdminGovernanceModule,
    WorkflowEngineModule,
    BookingFlowModule,
    ProviderJobsModule,
    AdminCommandCenterModule,
    BusinessRulesModule,
    ConsistencyModule,
    EventReliabilityModule,
    OperationsSafetyModule,
    LegacyModule,
    BookingOpsModule,
    PaymentsModule,
    MoyasarModule,
    FinanceEngineModule,
    SlotLocksModule,
    PushModule,
    SecurityModule,
    RealtimeSseModule,
    ProviderOpsModule,
    PatientUxModule,
    ChatModule,
    HospitalStaffModule,
    WebhooksModule,
    ClientConfigModule,
    ExportModule,
    InsuranceModule,
    ApprovalWorkflowModule,
    RecruitmentModule,
    FamilyModule,
    CommunityModule,
    LoyaltyModule,
    ReferralModule,
    FacilityOpsModule,
    ProviderProductionModule,
    MaternityModule,
    NabdExtensionsModule,
    NutritionModule,
    MentalHealthModule,
    WalletModule,
    ReturnsModule,
    BansModule,
    HomeCareCompatModule,
    HomeCareModule,
    BillingModule,
    ArticlesModule,
    InsuranceEngineModule,
    AdminModule,
    AdminWebCoreModule,
    AdminEnterpriseModule,
    CompatModule, // gap-fill endpoints from the screen↔API wiring audit — registered last
    AdminSpaModule, // admin console SPA REST surface (top-level paths, admin-role guarded)
  ],
  controllers: [HealthController, HealthDashboardController, ProviderPayoutsController],
  providers: [
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditLogInterceptor },
    { provide: APP_INTERCEPTOR, useClass: IdempotencyInterceptor },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(BansMiddleware, CorrelationMiddleware).forRoutes('*');
  }
}
