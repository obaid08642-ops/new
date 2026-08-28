"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminEnterpriseModule = void 0;
const common_1 = require("@nestjs/common");
const bullmq_1 = require("@nestjs/bullmq");
const mail_module_1 = require("../mail/mail.module");
const seo_module_1 = require("../seo/seo.module");
const wallet_module_1 = require("../wallet/wallet.module");
const audit_service_1 = require("./audit.service");
const admin_security_controller_1 = require("./admin-security.controller");
const admin_disputes_controller_1 = require("./admin-disputes.controller");
const admin_orders_controller_1 = require("./admin-orders.controller");
const orders_console_service_1 = require("./orders-console.service");
const admin_finance_controller_1 = require("./admin-finance.controller");
const finance_suite_service_1 = require("./finance-suite.service");
const analytics_suite_service_1 = require("./analytics-suite.service");
const admin_analytics_controller_1 = require("./admin-analytics.controller");
const admin_crm_controller_1 = require("./admin-crm.controller");
const patient_gdpr_controller_1 = require("./patient-gdpr.controller");
const admin_segments_controller_1 = require("./admin-segments.controller");
const admin_coupons_controller_1 = require("./admin-coupons.controller");
const admin_cms_controller_1 = require("./admin-cms.controller");
const admin_ops_controller_1 = require("./admin-ops.controller");
const scheduled_reports_runner_1 = require("./scheduled-reports.runner");
const command_center_v2_controller_1 = require("./command-center-v2.controller");
const admin_governance_controls_controller_1 = require("./admin-governance-controls.controller");
const admin_impersonation_controller_1 = require("./admin-impersonation.controller");
const impersonation_security_module_1 = require("../../common/impersonation-security.module");
let AdminEnterpriseModule = class AdminEnterpriseModule {
};
exports.AdminEnterpriseModule = AdminEnterpriseModule;
exports.AdminEnterpriseModule = AdminEnterpriseModule = __decorate([
    (0, common_1.Module)({
        imports: [
            impersonation_security_module_1.ImpersonationSecurityModule,
            wallet_module_1.WalletModule,
            mail_module_1.MailModule,
            seo_module_1.SeoModule,
            bullmq_1.BullModule.registerQueue({ name: 'notifications-delivery' }),
        ],
        controllers: [
            admin_security_controller_1.AdminSecurityController,
            admin_impersonation_controller_1.AdminImpersonationController,
            admin_disputes_controller_1.AdminDisputesController,
            admin_orders_controller_1.AdminOrdersConsoleController,
            admin_finance_controller_1.AdminFinanceSuiteController,
            admin_analytics_controller_1.AdminAnalyticsSuiteController,
            admin_analytics_controller_1.AdminScheduledReportsController,
            admin_crm_controller_1.AdminCrmController,
            admin_crm_controller_1.AdminGdprController,
            patient_gdpr_controller_1.PatientGdprController,
            admin_segments_controller_1.AdminSegmentsController,
            admin_cms_controller_1.AdminCmsController,
            admin_coupons_controller_1.AdminCouponsController,
            admin_ops_controller_1.AdminOpsController,
            admin_governance_controls_controller_1.AdminGovernanceControlsController,
            command_center_v2_controller_1.AdminCommandCenterV2Controller,
        ],
        providers: [
            audit_service_1.AdminAuditService,
            orders_console_service_1.OrdersConsoleService,
            finance_suite_service_1.FinanceSuiteService,
            analytics_suite_service_1.AnalyticsSuiteService,
            scheduled_reports_runner_1.ScheduledReportsRunner,
        ],
        exports: [audit_service_1.AdminAuditService, orders_console_service_1.OrdersConsoleService, finance_suite_service_1.FinanceSuiteService, analytics_suite_service_1.AnalyticsSuiteService],
    })
], AdminEnterpriseModule);
//# sourceMappingURL=admin-enterprise.module.js.map