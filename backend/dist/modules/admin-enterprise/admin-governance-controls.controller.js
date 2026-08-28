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
exports.AdminGovernanceControlsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
let AdminGovernanceControlsController = class AdminGovernanceControlsController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    async homeCuration() {
        const doc = await this.conn.collection('home_curation').findOne({ key: 'primary' }, { projection: { _id: 0 } });
        return doc || { key: 'primary', version: 0, sections: [], updatedAt: null };
    }
    async saveHomeCuration(body, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(body?.reason);
        }
        catch (error) {
            if (error instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(error.code);
            throw error;
        }
        if (!Array.isArray(body?.sections) || body.sections.length > 40)
            throw new common_1.BadRequestException('sections_array_up_to_40_required');
        const ids = new Set();
        const sections = body.sections.map((section, index) => {
            const id = String(section?.id || '').trim();
            const type = String(section?.type || '').trim();
            if (!id || !type || id.length > 80 || type.length > 60 || ids.has(id))
                throw new common_1.BadRequestException('section_id_and_type_must_be_unique');
            ids.add(id);
            const items = Array.isArray(section?.items) ? section.items.slice(0, 30).map((item) => ({
                id: String(item?.id || '').slice(0, 100),
                title_ar: String(item?.title_ar || '').slice(0, 160),
                image_url: String(item?.image_url || '').slice(0, 800),
                deep_link: String(item?.deep_link || '').slice(0, 160),
            })) : [];
            return { id, type, title_ar: String(section?.title_ar || '').slice(0, 160), position: index, enabled: section?.enabled !== false, items };
        });
        const before = await this.conn.collection('home_curation').findOne({ key: 'primary' });
        const doc = { key: 'primary', version: Number(before?.version || 0) + 1, sections, updated_by: me.id, updatedAt: new Date() };
        await this.conn.collection('home_curation').updateOne({ key: 'primary' }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        await this.audit.write({ action: 'home_curation_update', actor: me, target_type: 'home_curation', target_id: 'primary', reason, before: { version: before?.version ?? 0 }, after: { version: doc.version, sections: sections.length } });
        return doc;
    }
    async featureFlags() {
        const [canonical, legacy] = await Promise.all([
            this.conn.collection('feature_flags').find({}).project({ _id: 0 }).toArray(),
            this.conn.collection('featureflags').find({}).project({ _id: 0 }).toArray(),
        ]);
        const merged = new Map();
        for (const source of [...legacy, ...canonical]) {
            const key = String(source.key || source.name || '').trim();
            if (!key)
                continue;
            const current = merged.get(key);
            const incomingAt = new Date(source.updatedAt || source.updated_at || 0).getTime();
            const currentAt = new Date(current?.updatedAt || current?.updated_at || 0).getTime();
            if (!current || incomingAt >= currentAt)
                merged.set(key, { key, enabled: !!source.enabled, rollout_percentage: Number(source.rollout_percentage ?? source.rollout ?? 100), updatedAt: source.updatedAt || source.updated_at || null, source: source.source || 'database' });
        }
        return { data: [...merged.values()].sort((a, b) => a.key.localeCompare(b.key)), stores: { canonical: canonical.length, legacy: legacy.length } };
    }
    async saveFeatureFlag(body, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(body?.reason);
        }
        catch (error) {
            if (error instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(error.code);
            throw error;
        }
        const key = String(body?.key || '').trim();
        const rollout = Number(body?.rollout_percentage);
        if (!/^[a-z0-9._-]{2,80}$/i.test(key))
            throw new common_1.BadRequestException('feature_flag_key_invalid');
        if (typeof body?.enabled !== 'boolean')
            throw new common_1.BadRequestException('enabled_boolean_required');
        if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100)
            throw new common_1.BadRequestException('rollout_percentage_must_be_0_to_100');
        const before = await this.conn.collection('feature_flags').findOne({ key });
        const doc = { key, enabled: body.enabled, rollout_percentage: Math.round(rollout), updated_by: me.id, updatedAt: new Date(), source: 'admin_governance_controls' };
        await Promise.all([
            this.conn.collection('feature_flags').updateOne({ key }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true }),
            this.conn.collection('featureflags').updateOne({ key }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true }),
        ]);
        await this.audit.write({ action: 'feature_flag_update', actor: me, target_type: 'feature_flag', target_id: key, reason, before: before ? { enabled: before.enabled, rollout_percentage: before.rollout_percentage } : null, after: { enabled: doc.enabled, rollout_percentage: doc.rollout_percentage } });
        return doc;
    }
};
exports.AdminGovernanceControlsController = AdminGovernanceControlsController;
__decorate([
    (0, common_1.Get)('home-curation'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CMS_EDIT),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGovernanceControlsController.prototype, "homeCuration", null);
__decorate([
    (0, common_1.Post)('home-curation'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CMS_EDIT),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminGovernanceControlsController.prototype, "saveHomeCuration", null);
__decorate([
    (0, common_1.Get)('feature-flags'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.OPS_QUEUES_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminGovernanceControlsController.prototype, "featureFlags", null);
__decorate([
    (0, common_1.Post)('feature-flags'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.OPS_QUEUES_MANAGE),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminGovernanceControlsController.prototype, "saveFeatureFlag", null);
exports.AdminGovernanceControlsController = AdminGovernanceControlsController = __decorate([
    (0, common_1.Controller)('admin/governance-controls'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminGovernanceControlsController);
//# sourceMappingURL=admin-governance-controls.controller.js.map