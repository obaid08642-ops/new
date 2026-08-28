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
exports.AdminFinanceSuiteController = void 0;
const common_1 = require("@nestjs/common");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const finance_suite_service_1 = require("./finance-suite.service");
let AdminFinanceSuiteController = class AdminFinanceSuiteController {
    constructor(svc) {
        this.svc = svc;
    }
    revenue(from, to, granularity = 'day') {
        const g = ['day', 'week', 'month'].includes(String(granularity)) ? granularity : 'day';
        return this.svc.revenue({ from, to, granularity: g });
    }
    commissions(from, to) {
        return this.svc.commissions({ from, to });
    }
    updateConfig(b, me) {
        return this.svc.upsertCommissionConfig(b || {}, me, b?.reason);
    }
    reconciliation(date) {
        return this.svc.reconciliation(date);
    }
    payoutQueue(status, page = '1', limit = '25') {
        return this.svc.payoutQueue(status, parseInt(page, 10) || 1, parseInt(limit, 10) || 25);
    }
    approvePayout(id, b, me) {
        return this.svc.approvePayout(id, me, b?.reason, 'approve');
    }
    rejectPayout(id, b, me) {
        return this.svc.approvePayout(id, me, b?.reason, 'reject');
    }
    providerStatement(providerId, from, to) {
        return this.svc.providerStatement(providerId, from, to);
    }
};
exports.AdminFinanceSuiteController = AdminFinanceSuiteController;
__decorate([
    (0, common_1.Get)('revenue'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('granularity')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "revenue", null);
__decorate([
    (0, common_1.Get)('commissions'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "commissions", null);
__decorate([
    (0, common_1.Post)('commissions/config'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_CONFIG_EDIT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "updateConfig", null);
__decorate([
    (0, common_1.Get)('reconciliation'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_READ),
    __param(0, (0, common_1.Query)('date')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "reconciliation", null);
__decorate([
    (0, common_1.Get)('payouts'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_READ),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('page')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "payoutQueue", null);
__decorate([
    (0, common_1.Post)('payouts/:id/approve'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_PAYOUT_APPROVE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "approvePayout", null);
__decorate([
    (0, common_1.Post)('payouts/:id/reject'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_PAYOUT_APPROVE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "rejectPayout", null);
__decorate([
    (0, common_1.Get)('providers/:providerId/statement'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.FINANCE_READ),
    __param(0, (0, common_1.Param)('providerId')),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminFinanceSuiteController.prototype, "providerStatement", null);
exports.AdminFinanceSuiteController = AdminFinanceSuiteController = __decorate([
    (0, common_1.Controller)('admin/finance'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [finance_suite_service_1.FinanceSuiteService])
], AdminFinanceSuiteController);
//# sourceMappingURL=admin-finance.controller.js.map