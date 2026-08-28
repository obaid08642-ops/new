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
exports.LegalEnterpriseController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const enums_1 = require("../../common/enums");
const legal_enterprise_service_1 = require("./legal-enterprise.service");
let LegalEnterpriseController = class LegalEnterpriseController {
    constructor(svc, conn) {
        this.svc = svc;
        this.conn = conn;
    }
    meta(req) {
        return {
            ip: req.ip || null,
            device: req.headers['x-device-id'] || null,
            platform: req.headers['x-app-platform'] || 'web',
            user_agent: req.headers['user-agent'] || null,
        };
    }
    async policyPdf(key, res) {
        const p = await this.conn.collection('legal_policies').findOne({ key });
        if (!p)
            return res.status(404).json({ error: 'not_found' });
        const pdf = this.svc.buildPdf(`${p.title_en} — v${p.version}`, [
            `${p.title_ar}`,
            `Version ${p.version} · Effective ${new Date(p.effective_date).toISOString().slice(0, 10)} · Updated ${new Date(p.last_updated).toISOString().slice(0, 10)}`,
            '',
            ...(p.content_en || p.content_ar || '').split('\n').slice(0, 48),
        ]);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${key}-v${p.version}.pdf"`);
        res.send(pdf);
    }
    async archivePdf(id, res) {
        const result = await this.svc.acceptancePdf(id);
        if (!result)
            return res.status(404).json({ error: 'archive_not_found' });
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="acceptance-${id.slice(0, 8)}.pdf"`);
        res.setHeader('X-SHA256', result.sha256);
        res.send(result.pdf);
    }
    verifyArchive(id) { return this.svc.verifyArchive(id); }
    commissionHistory(limit) {
        return this.svc.getCommissionHistory(parseInt(limit || '100'));
    }
    auditLog(action, adminId, limit) {
        return this.svc.getAuditLog({ action, admin_id: adminId, limit: limit ? parseInt(limit) : 100 });
    }
    settlements(user, from, to) {
        return this.svc.settlementData(user.id, from, to);
    }
    async settlementsExcel(user, res, from, to) {
        const buf = await this.svc.settlementExcel(user.id, from, to);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename="settlements-${user.id.slice(0, 8)}.xlsx"`);
        res.send(buf);
    }
    async settlementsPdf(user, res, from, to) {
        const buf = await this.svc.settlementPdf(user.id, from, to);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="settlements-${user.id.slice(0, 8)}.pdf"`);
        res.send(buf);
    }
    licenseRun() { return this.svc.licenseMonitorRun(); }
    getMatrix(user) { return this.svc.getProviderInsurance(user.id); }
    setMatrix(user, body) {
        if (!Array.isArray(body?.companies))
            return { ok: false, error: 'companies array required' };
        return this.svc.setProviderInsurance(user.id, body.companies);
    }
    sla(user, days) {
        return this.svc.providerSla(user.id, days ? parseInt(days) : 30, user.role);
    }
    getConsents(user) { return this.svc.getConsents(user.id); }
    setConsent(user, type, body, req) {
        try {
            return this.svc.setConsent(user.id, type, !!body?.value, this.meta(req));
        }
        catch (e) {
            return { ok: false, error: e.message };
        }
    }
    async diff(key, from) {
        const p = await this.conn.collection('legal_policies').findOne({ key });
        if (!p)
            return { error: 'not_found' };
        const changeLog = p.change_log || [];
        return {
            key,
            current_version: p.version,
            change_log: changeLog,
            diff_from_previous: changeLog.length >= 2
                ? await this.svc.diffVersions(key, changeLog[changeLog.length - 2]?.note || '', changeLog[changeLog.length - 1]?.note || '')
                : { note: 'single version — nothing to compare' },
        };
    }
    async snapshot(user, policy, req) {
        return this.svc.snapshotAcceptance(user, policy, this.meta(req));
    }
};
exports.LegalEnterpriseController = LegalEnterpriseController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('legal/policy/:key/pdf'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "policyPdf", null);
__decorate([
    (0, common_1.Get)('legal/archive/:id/pdf'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "archivePdf", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('legal/archive/:id/verify'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "verifyArchive", null);
__decorate([
    (0, common_1.Get)('admin/finance/commission-history'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "commissionHistory", null);
__decorate([
    (0, common_1.Get)('admin/audit-log'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Query)('action')),
    __param(1, (0, common_1.Query)('admin_id')),
    __param(2, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "auditLog", null);
__decorate([
    (0, common_1.Get)('provider/settlements'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('from')),
    __param(2, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "settlements", null);
__decorate([
    (0, common_1.Get)('provider/settlements/excel'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "settlementsExcel", null);
__decorate([
    (0, common_1.Get)('provider/settlements/pdf'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Res)()),
    __param(2, (0, common_1.Query)('from')),
    __param(3, (0, common_1.Query)('to')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String, String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "settlementsPdf", null);
__decorate([
    (0, common_1.Post)('admin/providers/license-monitor/run'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "licenseRun", null);
__decorate([
    (0, common_1.Get)('provider/insurance-matrix'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "getMatrix", null);
__decorate([
    (0, common_1.Put)('provider/insurance-matrix'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "setMatrix", null);
__decorate([
    (0, common_1.Get)('provider/sla'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Query)('days')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "sla", null);
__decorate([
    (0, common_1.Get)('consents'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "getConsents", null);
__decorate([
    (0, common_1.Put)('consents/:type'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('type')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object, Object]),
    __metadata("design:returntype", void 0)
], LegalEnterpriseController.prototype, "setConsent", null);
__decorate([
    (0, common_1.Get)('admin/legal/policy/:key/diff'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Query)('from_content')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], LegalEnterpriseController.prototype, "diff", null);
exports.LegalEnterpriseController = LegalEnterpriseController = __decorate([
    (0, common_1.Controller)(),
    __param(1, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [legal_enterprise_service_1.LegalEnterpriseService,
        mongoose_2.Connection])
], LegalEnterpriseController);
//# sourceMappingURL=legal-enterprise.controller.js.map