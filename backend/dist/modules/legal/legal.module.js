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
exports.LegalModule = exports.LegalController = exports.LegalService = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const legal_enterprise_service_1 = require("./legal-enterprise.service");
const legal_enterprise_controller_1 = require("./legal-enterprise.controller");
const enums_1 = require("../../common/enums");
const DEFAULT_COMMISSIONS = {
    service_types: {
        pharmacy: { percent: 10, note: 'medicine orders' },
        doctor: { percent: 15, note: 'consultations' },
        lab: { percent: 12, note: 'lab tests' },
        radiology: { percent: 12, note: 'imaging' },
        nursing: { percent: 15, note: 'home nursing' },
        ambulance: { percent: 10, note: 'emergency rides' },
    },
    provider_overrides: {},
    payout_schedule: { frequency: 'weekly', day: 'sunday', minimum_payout_sar: 100, processing_days: 3 },
    tax: { vat_percent: 15, note: 'KSA VAT applied on commission only' },
};
let LegalService = class LegalService {
    constructor(conn, enterprise) {
        this.conn = conn;
        this.enterprise = enterprise;
    }
    get policies() { return this.conn.collection('legal_policies'); }
    get acceptances() { return this.conn.collection('legal_acceptances'); }
    get financeConfig() { return this.conn.collection('finance_config'); }
    async ensureFinanceConfig() {
        const existing = await this.financeConfig.findOne({ key: 'commissions' });
        if (!existing) {
            await this.financeConfig.insertOne({ key: 'commissions', ...DEFAULT_COMMISSIONS, updatedAt: new Date() });
        }
    }
    async getPolicy(key, lang = 'ar') {
        const p = await this.policies.findOne({ key }, { projection: { _id: 0 } });
        if (!p)
            return null;
        const content = lang === 'ar' && p.content_ar ? p.content_ar : (p.content_en || p.content_ar);
        return {
            key: p.key,
            title: lang === 'ar' ? p.title_ar : p.title_en,
            version: p.version,
            effective_date: p.effective_date,
            last_updated: p.last_updated,
            change_log: p.change_log || [],
            content,
            language: lang === 'ar' && p.content_ar ? 'ar' : 'en',
        };
    }
    async listPolicies() {
        return this.policies.find({}, { projection: { _id: 0, key: 1, title_ar: 1, title_en: 1, version: 1, last_updated: 1, requires_acceptance: 1, applies_to: 1 } }).sort({ key: 1 }).toArray();
    }
    async upsertPolicy(adminId, key, patch) {
        const existing = await this.policies.findOne({ key });
        const { change_note, ...fields } = patch;
        if (!existing) {
            const doc = {
                key,
                title_ar: fields.title_ar || key,
                title_en: fields.title_en || key,
                version: fields.version || '1.0',
                effective_date: fields.effective_date ? new Date(fields.effective_date) : new Date(),
                last_updated: new Date(),
                change_log: [{ version: fields.version || '1.0', date: new Date(), note: change_note || 'initial', by: adminId }],
                content_ar: fields.content_ar || '',
                content_en: fields.content_en || '',
                requires_acceptance: fields.requires_acceptance ?? true,
                applies_to: fields.applies_to || ['all'],
            };
            await this.policies.insertOne(doc);
            return { created: true, version: doc.version };
        }
        const [maj, min] = String(existing.version || '1.0').split('.').map(Number);
        const newVersion = `${maj}.${(min || 0) + 1}`;
        await this.policies.updateOne({ key }, {
            $set: { ...fields, version: newVersion, last_updated: new Date() },
            $push: { change_log: { version: newVersion, date: new Date(), note: change_note || 'update', by: adminId } },
        });
        await this.enterprise.recordAudit(adminId, 'legal.policy.edit', `legal_policies:${key}`, { version: existing.version, content_len: (existing.content_ar || '').length }, { version: newVersion, patch: fields }, {});
        return { updated: true, version: newVersion };
    }
    async accept(user, key, req) {
        const policy = await this.policies.findOne({ key });
        if (!policy)
            throw new common_1.BadRequestException('policy_not_found');
        const existing = await this.acceptances.findOne({ user_id: user.id, policy_key: key, version: policy.version });
        if (existing)
            return { ok: true, already_accepted: true, version: policy.version };
        await this.acceptances.insertOne({
            user_id: user.id,
            policy_key: key,
            version: policy.version,
            timestamp: new Date(),
            device: req.headers['x-device-id'] || null,
            ip: req.ip || null,
            platform: req.headers['x-app-platform'] || (req.headers['user-agent']?.includes('okhttp') ? 'android' : req.headers['user-agent']?.includes('iPhone') ? 'ios' : 'web'),
            user_agent: req.headers['user-agent'] || null,
        });
        const archive = await this.enterprise.snapshotAcceptance(user, policy, {
            ip: req.ip || null,
            device: req.headers['x-device-id'] || null,
            platform: req.headers['x-app-platform'] || 'web',
            user_agent: req.headers['user-agent'] || null,
        });
        return { ok: true, accepted: true, version: policy.version, archive_id: archive.archive_id, sha256: archive.sha256, pdf: `/legal/archive/${archive.archive_id}/pdf` };
    }
    async pendingAcceptances(user) {
        const applicable = await this.policies.find({ requires_acceptance: true }, { projection: { key: 1, version: 1, title_ar: 1, title_en: 1, applies_to: 1 } }).toArray();
        const accepted = await this.acceptances.find({ user_id: user.id }, { projection: { policy_key: 1, version: 1 } }).toArray();
        const accMap = new Map(accepted.map((a) => [`${a.policy_key}:${a.version}`, true]));
        return applicable.filter((p) => !accMap.has(`${p.key}:${p.version}`) && ((p.applies_to || ['all']).includes('all') || (p.applies_to || []).includes(user.role) || (p.applies_to || []).includes('provider') || (p.applies_to || []).includes('patient')));
    }
    async getCommissions() {
        await this.ensureFinanceConfig();
        const doc = await this.financeConfig.findOne({ key: 'commissions' });
        const { _id, key, ...rest } = doc;
        return rest;
    }
    async updateCommissions(adminId, patch) {
        await this.ensureFinanceConfig();
        const before = await this.getCommissions();
        await this.financeConfig.updateOne({ key: 'commissions' }, { $set: { ...patch, updatedAt: new Date(), updated_by: adminId } });
        const after = await this.getCommissions();
        await this.enterprise.recordCommissionChange(adminId, before, after, {});
        return { ok: true, config: after };
    }
    async commissionFor(providerId, serviceType) {
        const cfg = await this.getCommissions();
        const override = cfg.provider_overrides?.[providerId];
        if (override)
            return { percent: override.percent, source: 'provider_override' };
        const t = cfg.service_types?.[serviceType];
        return { percent: t?.percent ?? 10, source: `service_type:${serviceType}` };
    }
};
exports.LegalService = LegalService;
exports.LegalService = LegalService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        legal_enterprise_service_1.LegalEnterpriseService])
], LegalService);
let LegalController = class LegalController {
    constructor(svc) {
        this.svc = svc;
    }
    list() { return this.svc.listPolicies(); }
    policy(key, lang) {
        return this.svc.getPolicy(key, lang || 'ar');
    }
    pending(user) { return this.svc.pendingAcceptances(user); }
    accept(user, key, req) {
        return this.svc.accept(user, key, req);
    }
    upsert(adminId, key, body) {
        return this.svc.upsertPolicy(adminId, key, body);
    }
    commissions() { return this.svc.getCommissions(); }
    updateCommissions(adminId, body) {
        return this.svc.updateCommissions(adminId, body);
    }
    commissionFor(pid, st) {
        return this.svc.commissionFor(pid || '', st || 'pharmacy');
    }
};
exports.LegalController = LegalController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('legal/policies'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], LegalController.prototype, "list", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('legal/policy/:key'),
    __param(0, (0, common_1.Param)('key')),
    __param(1, (0, common_1.Query)('lang')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "policy", null);
__decorate([
    (0, common_1.Get)('legal/pending'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], LegalController.prototype, "pending", null);
__decorate([
    (0, common_1.Post)('legal/accept/:key'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "accept", null);
__decorate([
    (0, common_1.Put)('admin/legal/policy/:key'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Param)('key')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "upsert", null);
__decorate([
    (0, common_1.Get)('admin/finance/commissions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "commissions", null);
__decorate([
    (0, common_1.Put)('admin/finance/commissions'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, auth_guard_1.CurrentUser)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "updateCommissions", null);
__decorate([
    (0, common_1.Get)('finance/commission-for'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, common_1.Query)('provider_id')),
    __param(1, (0, common_1.Query)('service_type')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], LegalController.prototype, "commissionFor", null);
exports.LegalController = LegalController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [LegalService])
], LegalController);
let LegalModule = class LegalModule {
};
exports.LegalModule = LegalModule;
exports.LegalModule = LegalModule = __decorate([
    (0, common_1.Module)({
        controllers: [LegalController, legal_enterprise_controller_1.LegalEnterpriseController],
        providers: [LegalService, legal_enterprise_service_1.LegalEnterpriseService],
        exports: [LegalService, legal_enterprise_service_1.LegalEnterpriseService],
    })
], LegalModule);
//# sourceMappingURL=legal.module.js.map