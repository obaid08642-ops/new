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
var AdminCmsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminCmsController = void 0;
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const auth_guard_1 = require("../../common/auth.guard");
const permissions_1 = require("../../common/permissions");
const enums_1 = require("../../common/enums");
const rbac_1 = require("../../common/rbac");
const audit_service_1 = require("./audit.service");
let AdminCmsController = AdminCmsController_1 = class AdminCmsController {
    constructor(conn, audit) {
        this.conn = conn;
        this.audit = audit;
    }
    async list(status, q, page = '1', limit = '25') {
        const filter = { is_deleted: { $ne: true } };
        if (['DRAFT', 'PUBLISHED'].includes(String(status)))
            filter.status = status;
        if (q?.trim()) {
            const rx = new RegExp(q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
            filter.$or = [{ title_ar: rx }, { title_en: rx }, { slug: rx }];
        }
        const p = Math.max(1, parseInt(page, 10) || 1);
        const l = Math.min(100, parseInt(limit, 10) || 25);
        const col = this.conn.collection('articles');
        const [items, total] = await Promise.all([
            col.find(filter).sort({ updatedAt: -1 }).skip((p - 1) * l).limit(l).project({ _id: 0 }).toArray(),
            col.countDocuments(filter),
        ]);
        return { data: items, total, page: p, pages: Math.ceil(total / l) };
    }
    async upsert(b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        if (!String(b?.title_ar || '').trim())
            throw new common_1.BadRequestException('title_ar_required');
        const $set = { updatedAt: new Date(), last_edited_by: me.id };
        for (const f of AdminCmsController_1.EDITABLE) {
            if (b[f] !== undefined)
                $set[f] = String(b[f] ?? '');
        }
        if (Array.isArray(b.tags))
            $set.tags = b.tags.map(String).slice(0, 12);
        if (b.slug !== undefined && String(b.slug).trim())
            $set.slug = String(b.slug).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);
        let id = b?.id;
        if (id) {
            const before = await this.conn.collection('articles').findOne({ id });
            if (!before)
                throw new common_1.NotFoundException('article_not_found');
            await this.conn.collection('articles').updateOne({ id }, { $set });
            await this.audit.write({
                action: 'cms_article_update', actor: me, target_type: 'article', target_id: id, reason,
                before: { title_ar: before.title_ar, status: before.status }, after: { title_ar: $set.title_ar ?? before.title_ar },
            });
        }
        else {
            id = `art_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
            await this.conn.collection('articles').insertOne({
                id, ...$set, slug: $set.slug ?? id,
                tags: $set.tags ?? [], status: 'DRAFT', views: 0, is_deleted: false,
                created_by: me.id, createdAt: new Date(),
            });
            await this.audit.write({
                action: 'cms_article_create', actor: me, target_type: 'article', target_id: id, reason,
                after: { title_ar: $set.title_ar },
            });
        }
        return this.conn.collection('articles').findOne({ id }, { projection: { _id: 0 } });
    }
    async publish(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const before = await this.conn.collection('articles').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('article_not_found');
        if (!String(before.title_ar || '').trim())
            throw new common_1.BadRequestException('title_required_before_publish');
        await this.conn.collection('articles').updateOne({ id }, { $set: { status: 'PUBLISHED', published_at: new Date(), scheduled_at: null } });
        await this.audit.write({
            action: 'cms_article_publish', actor: me, target_type: 'article', target_id: id,
            reason, before: { status: before.status }, after: { status: 'PUBLISHED' },
        });
        return { ok: true, id, status: 'PUBLISHED' };
    }
    async schedule(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const at = new Date(b?.scheduled_at);
        if (isNaN(at.getTime()) || at.getTime() < Date.now())
            throw new common_1.BadRequestException('scheduled_at_must_be_future');
        const before = await this.conn.collection('articles').findOne({ id });
        if (!before)
            throw new common_1.NotFoundException('article_not_found');
        await this.conn.collection('articles').updateOne({ id }, { $set: { scheduled_at: at, status: 'DRAFT' } });
        await this.audit.write({
            action: 'cms_article_schedule', actor: me, target_type: 'article', target_id: id,
            reason, after: { scheduled_at: at.toISOString() },
        });
        return { ok: true, id, scheduled_at: at.toISOString() };
    }
    async unpublish(id, b, me) {
        let reason;
        try {
            reason = (0, rbac_1.validateReason)(b?.reason);
        }
        catch (e) {
            if (e instanceof rbac_1.ReasonError)
                throw new common_1.BadRequestException(e.code);
            throw e;
        }
        const res = await this.conn.collection('articles').updateOne({ id, status: 'PUBLISHED' }, { $set: { status: 'DRAFT', unpublished_at: new Date() } });
        if (!res.matchedCount)
            throw new common_1.NotFoundException('published_article_not_found');
        await this.audit.write({
            action: 'cms_article_unpublish', actor: me, target_type: 'article', target_id: id, reason,
            before: { status: 'PUBLISHED' }, after: { status: 'DRAFT' },
        });
        void b;
        return { ok: true, id, status: 'DRAFT' };
    }
};
exports.AdminCmsController = AdminCmsController;
AdminCmsController.EDITABLE = [
    'title_ar', 'title_en', 'excerpt_ar', 'excerpt_en', 'body_ar', 'body_en',
    'category', 'cover_image', 'author_name', 'author_title',
    'seo_description_ar', 'seo_description_en',
];
__decorate([
    (0, common_1.Get)('articles'),
    (0, permissions_1.RequirePermissions)(permissions_1.Permission.CMS_EDIT),
    __param(0, (0, common_1.Query)('status')),
    __param(1, (0, common_1.Query)('q')),
    __param(2, (0, common_1.Query)('page')),
    __param(3, (0, common_1.Query)('limit')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "list", null);
__decorate([
    (0, common_1.Post)('articles'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "upsert", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/schedule'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "schedule", null);
__decorate([
    (0, common_1.Patch)(':id/unpublish'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, auth_guard_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], AdminCmsController.prototype, "unpublish", null);
exports.AdminCmsController = AdminCmsController = AdminCmsController_1 = __decorate([
    (0, common_1.Controller)('admin/cms'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection,
        audit_service_1.AdminAuditService])
], AdminCmsController);
//# sourceMappingURL=admin-cms.controller.js.map