"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminGovernanceController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const system_config_extended_schema_1 = require("../schemas/system-config-extended.schema");
const fraud_alert_schema_1 = require("../schemas/fraud-alert.schema");
const audit_log_schema_1 = require("../schemas/audit-log.schema");
const auth_guard_1 = require("../../../common/auth.guard");
const enums_1 = require("../../../common/enums");
let AdminGovernanceController = class AdminGovernanceController {
    constructor(configModel, fraudAlertModel, auditLogModel) {
        this.configModel = configModel;
        this.fraudAlertModel = fraudAlertModel;
        this.auditLogModel = auditLogModel;
    }
    async triggerEmergencyMaintenance(_admin, _payload) {
        throw new common_1.ServiceUnavailableException('emergency maintenance command is not configured');
    }
    async getFraudAlerts() {
        const alerts = await this.fraudAlertModel.find().sort({ createdAt: -1 }).limit(100).exec();
        return { data: alerts };
    }
    async getAuditLogs() {
        const logs = await this.auditLogModel.find().sort({ createdAt: -1 }).limit(100).exec();
        return { data: logs };
    }
};
exports.AdminGovernanceController = AdminGovernanceController;
__decorate([
    (0, common_1.Put)('trigger-emergency-maintenance'),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminGovernanceController.prototype, "triggerEmergencyMaintenance", null);
__decorate([
    (0, common_1.Get)('fraud-alerts'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGovernanceController.prototype, "getFraudAlerts", null);
__decorate([
    (0, common_1.Get)('audit-logs'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGovernanceController.prototype, "getAuditLogs", null);
exports.AdminGovernanceController = AdminGovernanceController = __decorate([
    (0, common_1.Controller)('admin/governance'),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectModel)(system_config_extended_schema_1.SystemConfigExtended.name)),
    __param(1, (0, mongoose_1.InjectModel)(fraud_alert_schema_1.FraudAlert.name)),
    __param(2, (0, mongoose_1.InjectModel)(audit_log_schema_1.AuditLog.name)),
    __metadata("design:paramtypes", [mongoose_2.Model,
        mongoose_2.Model,
        mongoose_2.Model])
], AdminGovernanceController);
//# sourceMappingURL=admin-governance.controller.js.map