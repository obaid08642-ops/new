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
exports.AdminScheduledReportsController = exports.AdminAnalyticsSuiteController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const analytics_suite_service_1 = require("./analytics-suite.service");
const scheduled_reports_runner_1 = require("./scheduled-reports.runner");
let AdminAnalyticsSuiteController = class AdminAnalyticsSuiteController {
    constructor(svc, conn) {
        this.svc = svc;
        this.conn = conn;
    }
    funnels(from, to) {
        return this.svc.funnel(from, to);
    }
    cohorts(from, to) {
        return this.svc.cohorts(from, to);
    }
    providerLeague(from, to, domain) {
        return this.svc.providerLeague(from, to, domain);
    }
    search(from, to) {
        return this.svc.searchAnalytics(from, to);
    }
    nps(from, to) {
        return this.svc.nps(from, to);
    }
    anomalies(days = '45') {
        return this.svc.anomalies(Math.min(120, Math.max(7, parseInt(days, 10) || 45)));
    }
};
exports.AdminAnalyticsSuiteController = AdminAnalyticsSuiteController;
__decorate([
    (0, common_1.Get)('funnels'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "funnels", null);
__decorate([
    (0, common_1.Get)('cohorts'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "cohorts", null);
__decorate([
    (0, common_1.Get)('provider-league'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __param(2, (0, common_1.Query)('domain')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "providerLeague", null);
__decorate([
    (0, common_1.Get)('search'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('nps'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('from')),
    __param(1, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "nps", null);
__decorate([
    (0, common_1.Get)('anomalies'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.ANALYTICS_READ),
    __param(0, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], AdminAnalyticsSuiteController.prototype, "anomalies", null);
exports.AdminAnalyticsSuiteController = AdminAnalyticsSuiteController = __decorate([
    (0, common_1.Controller)('admin/analytics-suite'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [analytics_suite_service_1.AnalyticsSuiteService,
        mongoose_2.Connection])
], AdminAnalyticsSuiteController);
let AdminScheduledReportsController = class AdminScheduledReportsController {
    constructor(conn, runner) {
        this.conn = conn;
        this.runner = runner;
    }
    async list() {
        const docs = await this.conn.collection('scheduled_reports').find({}).sort({ createdAt: -1 }).limit(200).toArray();
        return docs.map(({ _id, ...r }) => r);
    }
    async create(b, me) {
        const report = String(b?.report || '');
        if (!['revenue', 'commissions', 'funnels', 'cohorts', 'anomalies', 'provider_league'].includes(report)) {
            throw new common_1.BadRequestException('unknown_report');
        }
        if (!['daily', 'weekly', 'monthly'].includes(String(b?.frequency))) {
            throw new common_1.BadRequestException('invalid_frequency');
        }
        const emails = Array.isArray(b?.recipients) ? b.recipients.map(String).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) : [];
        if (!emails.length)
            throw new common_1.BadRequestException('valid_recipients_required');
        const doc = {
            id: `sr_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
            report, frequency: b.frequency, recipients: emails,
            hour_utc: Math.min(23, Math.max(0, Number(b?.hour_utc ?? 4))),
            format: b?.format === 'json' ? 'json' : 'csv',
            enabled: b?.enabled !== false,
            created_by: me.id,
            last_run_at: null, last_status: null,
            createdAt: new Date(),
        };
        await this.conn.collection('scheduled_reports').insertOne(doc);
        const { _id, ...clean } = doc;
        return clean;
    }
    async update(id, b, me) {
        const before = await this.conn.collection('scheduled_reports').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('report_not_found');
        const $set = {};
        if (b?.enabled !== undefined)
            $set.enabled = !!b.enabled;
        if (b?.recipients !== undefined)
            $set.recipients = Array.isArray(b.recipients) ? b.recipients.map(String) : before.recipients;
        if (b?.hour_utc !== undefined)
            $set.hour_utc = Math.min(23, Math.max(0, Number(b.hour_utc)));
        await this.conn.collection('scheduled_reports').updateOne({ id }, { $set });
        void me;
        const after = await this.conn.collection('scheduled_reports').findOne({ id }, { projection: { _id: 0 } });
        return after;
    }
    async runNow(id, me) {
        const row = await this.conn.collection('scheduled_reports').findOne({ id });
        if (!row)
            throw new common_1.NotFoundException('report_not_found');
        if (!row.enabled)
            throw new common_1.BadRequestException('report_disabled');
        const res = await this.runner.runOne(row);
        void me;
        return { ok: res.ok, detail: res.detail, report: row.report, recipients: row.recipients };
    }
    async runs(id) {
        const rows = await this.conn.collection('scheduled_report_runs')
            .find({ report_id: id }).sort({ created_at: -1 }).limit(30).project({ _id: 0 }).toArray();
        return { data: rows };
    }
    async remove(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const res = await this.conn.collection('scheduled_reports').deleteOne({ id });
        if (!res.deletedCount)
            throw new common_1.NotFoundException('report_not_found');
        void me;
        void reason;
        return { ok: true };
    }
};
exports.AdminScheduledReportsController = AdminScheduledReportsController;
__decorate([
    (0, common_1.Get)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SCHEDULED_REPORTS_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SCHEDULED_REPORTS_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SCHEDULED_REPORTS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/run'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.OPS_CRONS_RUN),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "runNow", null);
__decorate([
    (0, common_1.Get)(':id/runs'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SCHEDULED_REPORTS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "runs", null);
__decorate([
    (0, common_1.Delete)(':id'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SCHEDULED_REPORTS_MANAGE),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminScheduledReportsController.prototype, "remove", null);
exports.AdminScheduledReportsController = AdminScheduledReportsController = __decorate([
    (0, common_1.Controller)('admin/scheduled-reports'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        scheduled_reports_runner_1.ScheduledReportsRunner])
], AdminScheduledReportsController);
//# sourceMappingURL=admin-analytics.controller.js.map