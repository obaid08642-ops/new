"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminWebCoreModule = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const analytics_controller_1 = require("./controllers/analytics.controller");
const finance_controller_1 = require("./controllers/finance.controller");
const provider_moderation_controller_1 = require("./controllers/provider-moderation.controller");
const system_health_controller_1 = require("./controllers/system-health.controller");
const admin_config_controller_1 = require("./controllers/admin-config.controller");
const admin_governance_controller_1 = require("./controllers/admin-governance.controller");
const admin_extended_operations_controller_1 = require("./controllers/admin-extended-operations.controller");
const heatmap_data_schema_1 = require("./schemas/heatmap-data.schema");
const commission_ledger_schema_1 = require("./schemas/commission-ledger.schema");
const fraud_alert_schema_1 = require("./schemas/fraud-alert.schema");
const audit_log_schema_1 = require("./schemas/audit-log.schema");
const procurement_request_schema_1 = require("./schemas/procurement-request.schema");
const provider_schema_1 = require("./schemas/provider.schema");
const system_config_extended_schema_1 = require("./schemas/system-config-extended.schema");
const withdrawal_request_schema_1 = require("./schemas/withdrawal-request.schema");
const provider_ops_module_1 = require("../provider-ops/provider-ops.module");
const emergency_schema_1 = require("../../schemas/emergency.schema");
const appointment_schema_1 = require("../../schemas/appointment.schema");
const finance_engine_module_1 = require("../finance-engine/finance-engine.module");
let AdminWebCoreModule = class AdminWebCoreModule {
};
exports.AdminWebCoreModule = AdminWebCoreModule;
exports.AdminWebCoreModule = AdminWebCoreModule = __decorate([
    (0, common_1.Module)({
        imports: [
            finance_engine_module_1.FinanceEngineModule,
            mongoose_1.MongooseModule.forFeature([
                { name: heatmap_data_schema_1.HeatmapData.name, schema: heatmap_data_schema_1.HeatmapDataSchema },
                { name: commission_ledger_schema_1.CommissionLedger.name, schema: commission_ledger_schema_1.CommissionLedgerSchema },
                { name: fraud_alert_schema_1.FraudAlert.name, schema: fraud_alert_schema_1.FraudAlertSchema },
                { name: audit_log_schema_1.AuditLog.name, schema: audit_log_schema_1.AuditLogSchema },
                { name: procurement_request_schema_1.ProcurementRequest.name, schema: procurement_request_schema_1.ProcurementRequestSchema },
                { name: provider_schema_1.Provider.name, schema: provider_schema_1.ProviderSchema },
                { name: system_config_extended_schema_1.SystemConfigExtended.name, schema: system_config_extended_schema_1.SystemConfigExtendedSchema },
                { name: withdrawal_request_schema_1.WithdrawalRequest.name, schema: withdrawal_request_schema_1.WithdrawalRequestSchema },
                { name: 'ProviderWithdrawal', schema: provider_ops_module_1.ProviderWithdrawalSchema },
                { name: 'EmergencyRequest', schema: emergency_schema_1.EmergencyRequestSchema },
                { name: 'Appointment', schema: appointment_schema_1.AppointmentSchema }
            ])
        ],
        controllers: [
            analytics_controller_1.AnalyticsController,
            finance_controller_1.FinanceController,
            provider_moderation_controller_1.ProviderModerationController,
            system_health_controller_1.SystemHealthController,
            admin_config_controller_1.AdminConfigController,
            admin_governance_controller_1.AdminGovernanceController,
            admin_extended_operations_controller_1.AdminExtendedOperationsController
        ]
    })
], AdminWebCoreModule);
//# sourceMappingURL=admin-web-core.module.js.map