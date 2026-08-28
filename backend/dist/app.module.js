"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const livekit_module_1 = require("./modules/livekit/livekit.module");
const coturn_module_1 = require("./modules/coturn/coturn.module");
const redis_module_1 = require("./modules/redis/redis.module");
const mail_module_1 = require("./modules/mail/mail.module");
const admin_notification_center_module_1 = require("./modules/admin-notification-center/admin-notification-center.module");
const analytics_module_1 = require("./modules/analytics/analytics.module");
const api_security_module_1 = require("./modules/api-security/api-security.module");
const device_trust_module_1 = require("./modules/device-trust/device-trust.module");
const seo_search_module_1 = require("./modules/seo-search/seo-search.module");
const legal_module_1 = require("./modules/legal/legal.module");
const ratings_module_1 = require("./modules/ratings/ratings.module");
const provider_payouts_controller_1 = require("./modules/payouts/provider-payouts.controller");
const presence_module_1 = require("./modules/presence/presence.module");
const ops_module_1 = require("./modules/ops/ops.module");
const feature_flags_module_1 = require("./modules/feature-flags/feature-flags.module");
const media_module_1 = require("./modules/media/media.module");
const notification_module_1 = require("./modules/notification/notification.module");
const moyasar_module_1 = require("./modules/moyasar/moyasar.module");
const finance_engine_module_1 = require("./modules/finance-engine/finance-engine.module");
const config_1 = require("@nestjs/config");
const env_validation_1 = require("./config/env.validation");
const mongoose_1 = require("@nestjs/mongoose");
const event_emitter_1 = require("@nestjs/event-emitter");
const throttler_1 = require("@nestjs/throttler");
const schedule_1 = require("@nestjs/schedule");
const bullmq_1 = require("@nestjs/bullmq");
const core_1 = require("@nestjs/core");
const auth_module_1 = require("./modules/auth/auth.module");
const users_module_1 = require("./modules/users/users.module");
const orders_module_1 = require("./modules/orders/orders.module");
const prescriptions_module_1 = require("./modules/prescriptions/prescriptions.module");
const medicines_module_1 = require("./modules/medicines/medicines.module");
const emergency_module_1 = require("./modules/emergency/emergency.module");
const realtime_module_1 = require("./modules/realtime/realtime.module");
const i18n_module_1 = require("./modules/i18n/i18n.module");
const ai_module_1 = require("./modules/ai/ai.module");
const notifications_module_1 = require("./modules/notifications/notifications.module");
const events_module_1 = require("./modules/events/events.module");
const providers_module_1 = require("./modules/providers/providers.module");
const seed_module_1 = require("./modules/seed/seed.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const pharmacy_ops_module_1 = require("./modules/pharmacy_ops/pharmacy_ops.module");
const care_module_1 = require("./modules/care/care.module");
const labs_module_1 = require("./modules/labs/labs.module");
const home_care_module_1 = require("./modules/home-care/home-care.module");
const health_module_1 = require("./modules/health/health.module");
const support_module_1 = require("./modules/support/support.module");
const custom_services_module_1 = require("./modules/custom-services/custom-services.module");
const medical_profile_module_1 = require("./modules/medical-profile/medical-profile.module");
const timeline_module_1 = require("./modules/timeline/timeline.module");
const seo_module_1 = require("./modules/seo/seo.module");
const radiology_module_1 = require("./modules/radiology/radiology.module");
const medical_reports_module_1 = require("./modules/medical-reports/medical-reports.module");
const provider_module_1 = require("./modules/provider/provider.module");
const pharmacy_module_1 = require("./modules/pharmacy/pharmacy.module");
const storage_module_1 = require("./modules/storage/storage.module");
const service_catalog_module_1 = require("./modules/service-catalog/service-catalog.module");
const cart_module_1 = require("./modules/cart/cart.module");
const admin_authority_module_1 = require("./modules/admin-authority/admin-authority.module");
function bullRedisConnection() {
    const configuredUrl = process.env.REDIS_URL ? new URL(process.env.REDIS_URL) : undefined;
    return {
        host: configuredUrl?.hostname || process.env.REDIS_HOST || 'localhost',
        port: Number(configuredUrl?.port || process.env.REDIS_PORT || '6379'),
        password: configuredUrl?.password ? decodeURIComponent(configuredUrl.password) : (process.env.REDIS_PASSWORD || undefined),
        ...(configuredUrl?.protocol === 'rediss:' ? { tls: {} } : {}),
    };
}
const provider_onboarding_module_1 = require("./modules/provider-onboarding/provider-onboarding.module");
const unified_bookings_module_1 = require("./modules/unified-bookings/unified-bookings.module");
const admin_governance_module_1 = require("./modules/admin-governance/admin-governance.module");
const workflow_engine_module_1 = require("./modules/workflow-engine/workflow-engine.module");
const booking_flow_module_1 = require("./modules/booking-flow/booking-flow.module");
const provider_jobs_module_1 = require("./modules/provider-jobs/provider-jobs.module");
const admin_command_center_module_1 = require("./modules/admin-command-center/admin-command-center.module");
const business_rules_module_1 = require("./modules/business-rules/business-rules.module");
const bans_module_1 = require("./modules/bans/bans.module");
const bans_middleware_1 = require("./modules/bans/bans.middleware");
const consistency_module_1 = require("./modules/consistency/consistency.module");
const event_reliability_module_1 = require("./modules/event-reliability/event-reliability.module");
const operations_safety_module_1 = require("./modules/operations-safety/operations-safety.module");
const legacy_module_1 = require("./modules/legacy/legacy.module");
const booking_ops_module_1 = require("./modules/booking-ops/booking-ops.module");
const payments_module_1 = require("./modules/payments/payments.module");
const slot_locks_module_1 = require("./modules/slot-locks/slot-locks.module");
const push_module_1 = require("./modules/push/push.module");
const security_module_1 = require("./modules/security/security.module");
const realtime_sse_1 = require("./modules/realtime/realtime.sse");
const provider_ops_module_1 = require("./modules/provider-ops/provider-ops.module");
const patient_ux_module_1 = require("./modules/patient-ux/patient-ux.module");
const chat_module_1 = require("./modules/chat/chat.module");
const hospital_staff_module_1 = require("./modules/hospital-staff/hospital-staff.module");
const webhooks_module_1 = require("./modules/webhooks/webhooks.module");
const config_module_1 = require("./modules/config/config.module");
const export_module_1 = require("./modules/export/export.module");
const insurance_module_1 = require("./modules/insurance/insurance.module");
const approval_workflow_module_1 = require("./modules/approval-workflow/approval-workflow.module");
const recruitment_module_1 = require("./modules/recruitment/recruitment.module");
const family_module_1 = require("./modules/family/family.module");
const community_module_1 = require("./modules/community/community.module");
const loyalty_module_1 = require("./modules/loyalty/loyalty.module");
const referral_module_1 = require("./modules/referral/referral.module");
const facility_ops_module_1 = require("./modules/facility-ops/facility-ops.module");
const provider_production_module_1 = require("./modules/provider-production/provider-production.module");
const impersonation_session_service_1 = require("./common/impersonation-session.service");
const admin_enterprise_module_1 = require("./modules/admin-enterprise/admin-enterprise.module");
const health_controller_1 = require("./health.controller");
const health_dashboard_controller_1 = require("./modules/health/health-dashboard.controller");
const auth_guard_1 = require("./common/auth.guard");
const audit_log_interceptor_1 = require("./common/audit-log.interceptor");
const idempotency_interceptor_1 = require("./common/idempotency.interceptor");
const maternity_module_1 = require("./modules/maternity/maternity.module");
const nabd_extensions_module_1 = require("./modules/nabd-extensions/nabd-extensions.module");
const nutrition_module_1 = require("./modules/nutrition/nutrition.module");
const mental_health_module_1 = require("./modules/mental-health/mental-health.module");
const wallet_module_1 = require("./modules/wallet/wallet.module");
const returns_module_1 = require("./modules/returns/returns.module");
const admin_module_1 = require("./modules/admin/admin.module");
const hospital_module_1 = require("./modules/hospital/hospital.module");
const admin_web_core_module_1 = require("./modules/admin-web-core/admin-web-core.module");
const home_module_1 = require("./modules/home/home.module");
const system_health_module_1 = require("./modules/system-health/system-health.module");
const home_care_compat_module_1 = require("./modules/home-care-compat/home-care-compat.module");
const compat_module_1 = require("./modules/compat/compat.module");
const admin_spa_module_1 = require("./modules/compat/admin-spa.module");
const insurance_engine_module_1 = require("./modules/insurance-engine/insurance-engine.module");
const billing_module_1 = require("./modules/billing/billing.module");
const articles_module_1 = require("./modules/articles/articles.module");
const correlation_middleware_1 = require("./common/correlation.middleware");
const doctors_module_1 = require("./modules/doctors/doctors.module");
const roles_guard_1 = require("./modules/admin-web-core/guards/roles.guard");
let AppModule = class AppModule {
    configure(consumer) {
        consumer.apply(bans_middleware_1.BansMiddleware, correlation_middleware_1.CorrelationMiddleware).forRoutes('*');
    }
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            home_module_1.HomeModule,
            hospital_module_1.HospitalModule,
            livekit_module_1.LiveKitModule,
            coturn_module_1.CoturnModule,
            redis_module_1.RedisModule,
            mail_module_1.MailModule,
            admin_notification_center_module_1.AdminNotificationCenterModule,
            analytics_module_1.AnalyticsModule,
            api_security_module_1.ApiSecurityModule,
            device_trust_module_1.DeviceTrustModule,
            seo_search_module_1.SeoSearchModule,
            legal_module_1.LegalModule,
            ratings_module_1.RatingsModule,
            presence_module_1.PresenceModule,
            ops_module_1.OpsModule,
            feature_flags_module_1.FeatureFlagsModule,
            media_module_1.MediaModule,
            notification_module_1.NotificationModule,
            config_1.ConfigModule.forRoot({ isGlobal: true, validate: env_validation_1.validateEnvironment }),
            mongoose_1.MongooseModule.forRootAsync({
                useFactory: () => ({
                    uri: process.env.MONGO_URL || 'mongodb://localhost:27017',
                    dbName: process.env.DB_NAME || 'nabd_nestjs',
                    connectionFactory: (connection) => {
                        connection.plugin(require('./common/database/audit.plugin').AuditPlugin);
                        return connection;
                    }
                }),
            }),
            bullmq_1.BullModule.forRoot({
                connection: bullRedisConnection(),
            }),
            event_emitter_1.EventEmitterModule.forRoot({ wildcard: true, maxListeners: 50 }),
            schedule_1.ScheduleModule.forRoot(),
            throttler_1.ThrottlerModule.forRoot([{ ttl: 60_000, limit: process.env.THROTTLER_LIMIT ? parseInt(process.env.THROTTLER_LIMIT, 10) : 200 }]),
            i18n_module_1.I18nCoreModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            medicines_module_1.MedicinesModule,
            providers_module_1.ProvidersModule,
            prescriptions_module_1.PrescriptionsModule,
            orders_module_1.OrdersModule,
            emergency_module_1.EmergencyModule,
            ai_module_1.AiModule,
            notifications_module_1.NotificationsModule,
            events_module_1.EventsModule,
            realtime_module_1.RealtimeModule,
            seed_module_1.SeedModule,
            drivers_module_1.DriversModule,
            pharmacy_ops_module_1.PharmacyOpsModule,
            care_module_1.CareModule,
            doctors_module_1.DoctorsModule,
            labs_module_1.LabsModule,
            health_module_1.HealthModule,
            system_health_module_1.SystemHealthModule,
            support_module_1.SupportModule,
            custom_services_module_1.CustomServicesModule,
            medical_profile_module_1.MedicalProfileModule,
            timeline_module_1.TimelineModule,
            seo_module_1.SeoModule,
            radiology_module_1.RadiologyModule,
            medical_reports_module_1.MedicalReportsModule,
            storage_module_1.StorageModule,
            provider_module_1.ProviderModule,
            pharmacy_module_1.PharmacyModule,
            service_catalog_module_1.ServiceCatalogModule,
            cart_module_1.CartModule,
            admin_authority_module_1.AdminAuthorityModule,
            provider_onboarding_module_1.ProviderOnboardingModule,
            unified_bookings_module_1.UnifiedBookingsModule,
            admin_governance_module_1.AdminGovernanceModule,
            workflow_engine_module_1.WorkflowEngineModule,
            booking_flow_module_1.BookingFlowModule,
            provider_jobs_module_1.ProviderJobsModule,
            admin_command_center_module_1.AdminCommandCenterModule,
            business_rules_module_1.BusinessRulesModule,
            consistency_module_1.ConsistencyModule,
            event_reliability_module_1.EventReliabilityModule,
            operations_safety_module_1.OperationsSafetyModule,
            legacy_module_1.LegacyModule,
            booking_ops_module_1.BookingOpsModule,
            payments_module_1.PaymentsModule,
            moyasar_module_1.MoyasarModule,
            finance_engine_module_1.FinanceEngineModule,
            slot_locks_module_1.SlotLocksModule,
            push_module_1.PushModule,
            security_module_1.SecurityModule,
            realtime_sse_1.RealtimeSseModule,
            provider_ops_module_1.ProviderOpsModule,
            patient_ux_module_1.PatientUxModule,
            chat_module_1.ChatModule,
            hospital_staff_module_1.HospitalStaffModule,
            webhooks_module_1.WebhooksModule,
            config_module_1.ClientConfigModule,
            export_module_1.ExportModule,
            insurance_module_1.InsuranceModule,
            approval_workflow_module_1.ApprovalWorkflowModule,
            recruitment_module_1.RecruitmentModule,
            family_module_1.FamilyModule,
            community_module_1.CommunityModule,
            loyalty_module_1.LoyaltyModule,
            referral_module_1.ReferralModule,
            facility_ops_module_1.FacilityOpsModule,
            provider_production_module_1.ProviderProductionModule,
            admin_enterprise_module_1.AdminEnterpriseModule,
            maternity_module_1.MaternityModule,
            nabd_extensions_module_1.NabdExtensionsModule,
            nutrition_module_1.NutritionModule,
            mental_health_module_1.MentalHealthModule,
            wallet_module_1.WalletModule,
            returns_module_1.ReturnsModule,
            bans_module_1.BansModule,
            home_care_compat_module_1.HomeCareCompatModule,
            home_care_module_1.HomeCareModule,
            billing_module_1.BillingModule,
            articles_module_1.ArticlesModule,
            insurance_engine_module_1.InsuranceEngineModule,
            admin_module_1.AdminModule,
            admin_web_core_module_1.AdminWebCoreModule,
            compat_module_1.CompatModule,
            admin_spa_module_1.AdminSpaModule,
        ],
        controllers: [health_controller_1.HealthController, health_dashboard_controller_1.HealthDashboardController, provider_payouts_controller_1.ProviderPayoutsController],
        providers: [
            impersonation_session_service_1.ImpersonationSessionService,
            { provide: core_1.APP_GUARD, useClass: auth_guard_1.JwtAuthGuard },
            { provide: core_1.APP_GUARD, useClass: roles_guard_1.RolesGuard },
            { provide: core_1.APP_GUARD, useClass: throttler_1.ThrottlerGuard },
            { provide: core_1.APP_INTERCEPTOR, useClass: audit_log_interceptor_1.AuditLogInterceptor },
            { provide: core_1.APP_INTERCEPTOR, useClass: idempotency_interceptor_1.IdempotencyInterceptor },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map