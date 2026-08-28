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
exports.AdminOpsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const i18n_service_1 = require("../i18n/i18n.service");
const audit_service_1 = require("./audit.service");
const seo_service_1 = require("../seo/seo.service");
const bullmq_1 = require("bullmq");
let AdminOpsController = class AdminOpsController {
    constructor(conn, notificationsQueue, audit, seoService) {
        this.conn = conn;
        this.notificationsQueue = notificationsQueue;
        this.audit = audit;
        this.seoService = seoService;
    }
    async queues() {
        const counts = await this.notificationsQueue.getJobCounts('waiting', 'active', 'completed', 'failed', 'delayed', 'paused');
        return {
            queues: [{
                    name: 'notifications-delivery',
                    ...counts,
                    is_paused: counts.paused > 0,
                }],
        };
    }
    async jobs(name, state = 'failed', start = '0', end = '19') {
        const s = Math.max(0, parseInt(start, 10) || 0);
        const e = Math.min(200, parseInt(end, 10) || 20);
        const validStates = ['failed', 'waiting', 'active', 'delayed', 'completed'];
        if (!validStates.includes(state))
            throw new common_1.BadRequestException(`state_must_be:${validStates.join('|')}`);
        const jobs = await this.notificationsQueue.getJobs([state], s, e);
        return {
            data: jobs.map((j) => ({
                id: j.id, name: j.name, attempts: j.attemptsMade, failedReason: j.failedReason,
                data_preview: JSON.stringify(j.data || {}).slice(0, 180),
                timestamp: j.timestamp, processedOn: j.processedOn, finishedOn: j.finishedOn,
            })),
            state, total_shown: jobs.length,
        };
    }
    async retryJob(name, jobId, b, me) {
        const job = await this.notificationsQueue.getJob(String(jobId));
        if (!job)
            throw new common_1.NotFoundException('job_not_found');
        await job.retry();
        await this.audit.write({
            action: 'queue_job_retry', actor: me, target_type: 'bullmq_job',
            target_id: String(jobId), reason: b?.reason || 'ops retry',
            meta: { queue: name },
        });
        return { ok: true, job_id: String(jobId), queue: name };
    }
    async retryFailed(name, b, me) {
        let reason = '';
        try {
            reason = String(b?.reason || '').trim();
        }
        catch { }
        if (reason.length < 5)
            throw new common_1.BadRequestException('reason_required');
        const cap = Math.min(500, Number(b?.limit ?? 100));
        const failed = await this.notificationsQueue.getFailed(0, cap - 1);
        let retried = 0;
        for (const j of failed) {
            try {
                await j.retry();
                retried++;
            }
            catch { }
        }
        await this.audit.write({
            action: 'queue_retry_failed_bulk', actor: me, target_type: 'bullmq_queue',
            target_id: name, reason, after: { attempted: failed.length, retried },
        });
        return { ok: true, attempted: failed.length, retried };
    }
    async translations(lang = 'ar', missing = '') {
        const overrides = await this.conn.collection('translation_overrides').find({ lang }).project({ _id: 0 }).toArray();
        const overrideMap = new Map(overrides.map((o) => [o.key, o]));
        const langs = ['ar', 'en', 'ur'];
        const rows = [];
        for (const [key, values] of Object.entries(i18n_service_1.DICTIONARY)) {
            const ov = overrideMap.get(key);
            const row = { key, base_ar: values.ar };
            for (const l of langs)
                row[`current_${l}`] = ov?.values?.[l] ?? values[l];
            row.overridden = !!ov;
            if (!missing || (missing === 'true' && !row.current_en && lang === 'en'))
                rows.push(row);
            else if (!missing)
                rows.push(row);
        }
        return { total_keys: Object.keys(i18n_service_1.DICTIONARY).length, data: rows.slice(0, 400), overridden_count: overrideMap.size };
    }
    async upsertTranslation(b, me) {
        const key = String(b?.key || '').trim();
        const value = String(b?.value ?? '').trim();
        if (!key || !(key in i18n_service_1.DICTIONARY))
            throw new common_1.BadRequestException('unknown_key');
        const values = {};
        for (const l of ['ar', 'en', 'ur']) {
            if (b?.[l] !== undefined)
                values[l] = String(b[l]).trim();
        }
        if (!Object.keys(values).length && !value)
            throw new common_1.BadRequestException('no_values_provided');
        const finalValues = value ? { [String(b.lang || 'ar')]: value, ...values } : values;
        await this.conn.collection('translation_overrides').updateOne({ key, lang: String(b.lang || '*') }, { $set: { key, values: finalValues, updated_by: me.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        await this.audit.write({
            action: 'translation_override_upsert', actor: me, target_type: 'translation_key', target_id: key,
            after: finalValues, reason: b?.reason || undefined,
        });
        return { ok: true, key, values: finalValues };
    }
    async seoControls() {
        const docs = await this.conn.collection('seo_controls').find({}).project({ _id: 0 }).toArray();
        return { data: docs, note: 'indexable=false يستبعد المسار من sitemap وrobots عبر طبقة النشر' };
    }
    async setSeoControl(b, me) {
        const routeKey = String(b?.route_key || '').trim().toLowerCase();
        if (!routeKey)
            throw new common_1.BadRequestException('route_key_required');
        if (typeof b?.indexable !== 'boolean')
            throw new common_1.BadRequestException('indexable_boolean_required');
        const before = await this.conn.collection('seo_controls').findOne({ route_key: routeKey });
        await this.conn.collection('seo_controls').updateOne({ route_key: routeKey }, { $set: { indexable: b.indexable, updated_by: me.id, updatedAt: new Date(), reason: String(b?.reason || '').trim() || null }, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
        try {
            this.seoService.invalidateControlsCache();
        }
        catch { }
        await this.audit.write({
            action: 'seo_control_update', actor: me, target_type: 'seo_route', target_id: routeKey,
            reason: String(b?.reason || ''),
            before: before ? { indexable: before.indexable } : null,
            after: { indexable: b.indexable },
        });
        return { ok: true, route_key: routeKey, indexable: b.indexable };
    }
};
exports.AdminOpsController = AdminOpsController;
__decorate([
    (0, common_1.Get)('queues'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.OPS_QUEUES_MANAGE),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "queues", null);
__decorate([
    (0, common_1.Get)('queues/:name/jobs'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Query)('state')),
    __param(2, (0, common_1.Query)('start')),
    __param(3, (0, common_1.Query)('end')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "jobs", null);
__decorate([
    (0, common_1.Post)('queues/:name/jobs/:jobId/retry'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Param)('jobId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "retryJob", null);
__decorate([
    (0, common_1.Post)('queues/:name/retry-failed'),
    __param(0, (0, common_1.Param)('name')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "retryFailed", null);
__decorate([
    (0, common_1.Get)('translations'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.TRANSLATIONS_EDIT),
    __param(0, (0, common_1.Query)('lang')),
    __param(1, (0, common_1.Query)('missing')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "translations", null);
__decorate([
    (0, common_1.Post)('translations'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "upsertTranslation", null);
__decorate([
    (0, common_1.Get)('seo/controls'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.SEO_CONTROL),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "seoControls", null);
__decorate([
    (0, common_1.Post)('seo/controls'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminOpsController.prototype, "setSeoControl", null);
exports.AdminOpsController = AdminOpsController = __decorate([
    (0, common_1.Controller)('admin/ops'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __param(1, (0, common_1.Inject)('BullQueue_notifications-delivery')),
    __param(3, (0, common_1.Optional)()),
    __param(3, (0, common_1.Inject)(seo_service_1.SeoService)),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        bullmq_1.Queue,
        audit_service_1.AdminAuditService,
        seo_service_1.SeoService])
], AdminOpsController);
//# sourceMappingURL=admin-ops.controller.js.map