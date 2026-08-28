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
exports.ArticlesModule = exports.ArticleBookmarksController = exports.ArticleBookmarkContractController = exports.ArticlesAdminController = exports.ArticlesPublicController = exports.ArticlesService = void 0;
const seo_controller_1 = require("./seo.controller");
const common_1 = require("@nestjs/common");
const mongoose_1 = require("@nestjs/mongoose");
const mongoose_2 = require("mongoose");
const uuid_1 = require("uuid");
const auth_guard_1 = require("../../common/auth.guard");
const idempotency_interceptor_1 = require("../../common/idempotency.interceptor");
const enums_1 = require("../../common/enums");
const article_schema_1 = require("../../schemas/article.schema");
const slug_util_1 = require("../../common/slug.util");
let ArticlesService = class ArticlesService {
    constructor(model) {
        this.model = model;
    }
    list(query) {
        const { category, q, limit = '20', page = '1' } = query;
        const filter = { status: 'PUBLISHED', is_deleted: { $ne: true } };
        if (category)
            filter.category = category;
        if (q)
            filter.$or = [{ title_ar: new RegExp(q, 'i') }, { title_en: new RegExp(q, 'i') }, { tags: q }];
        const lim = Math.min(Number(limit) || 20, 50);
        const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;
        return this.model
            .find(filter, { _id: 0, __v: 0, body_ar: 0, body_en: 0 })
            .sort({ published_at: -1 }).skip(skip).limit(lim).lean();
    }
    categories() {
        return this.model.distinct('category', { status: 'PUBLISHED', is_deleted: { $ne: true } });
    }
    async bySlug(slug) {
        const doc = await this.model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).lean();
        if (!doc)
            throw new common_1.NotFoundException('article not found');
        this.model.updateOne({ id: doc.id }, { $inc: { views: 1 } }).exec().catch(() => null);
        return doc;
    }
    async publishedById(id) {
        const article = await this.model.findOne({ id, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
        if (!article)
            throw new common_1.NotFoundException('article_not_found');
        return article;
    }
    async create(body) {
        const slug = (0, slug_util_1.buildSlug)(body.title_ar || body.title_en || 'article', require('crypto').randomUUID());
        return this.model.create({
            title_ar: body.title_ar,
            title_en: body.title_en,
            excerpt_ar: body.excerpt_ar,
            excerpt_en: body.excerpt_en,
            body_ar: body.body_ar,
            body_en: body.body_en,
            category: body.category,
            tags: body.tags || [],
            cover_image: body.cover_image,
            author_name: body.author_name,
            author_title: body.author_title,
            seo_description_ar: body.seo_description_ar,
            seo_description_en: body.seo_description_en,
            slug,
            status: 'DRAFT',
        });
    }
    update(id, body) {
        const { id: _i, slug: _s, ...rest } = body || {};
        return this.model.findOneAndUpdate({ id }, { $set: rest }, { new: true });
    }
    publish(id) {
        return this.model.findOneAndUpdate({ id }, { $set: { status: 'PUBLISHED', published_at: new Date() } }, { new: true });
    }
    unpublish(id) {
        return this.model.findOneAndUpdate({ id }, { $set: { status: 'DRAFT' } }, { new: true });
    }
    remove(id) {
        return this.model.findOneAndUpdate({ id }, { $set: { is_deleted: true } }, { new: true });
    }
    adminList() {
        return this.model.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0, body_ar: 0, body_en: 0 }).sort({ createdAt: -1 }).limit(200).lean();
    }
};
exports.ArticlesService = ArticlesService;
exports.ArticlesService = ArticlesService = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, mongoose_1.InjectModel)(article_schema_1.Article.name)),
    __metadata("design:paramtypes", [mongoose_2.Model])
], ArticlesService);
let ArticlesPublicController = class ArticlesPublicController {
    constructor(svc) {
        this.svc = svc;
    }
    list(q) { return this.svc.list(q); }
    cats() { return this.svc.categories(); }
    one(slug) { return this.svc.bySlug(slug); }
};
exports.ArticlesPublicController = ArticlesPublicController;
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(),
    __param(0, (0, common_1.Query)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ArticlesPublicController.prototype, "list", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)('categories'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArticlesPublicController.prototype, "cats", null);
__decorate([
    (0, auth_guard_1.Public)(),
    (0, common_1.Get)(':slug'),
    __param(0, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesPublicController.prototype, "one", null);
exports.ArticlesPublicController = ArticlesPublicController = __decorate([
    (0, common_1.Controller)('articles'),
    __metadata("design:paramtypes", [ArticlesService])
], ArticlesPublicController);
let ArticlesAdminController = class ArticlesAdminController {
    constructor(svc) {
        this.svc = svc;
    }
    list() { return this.svc.adminList(); }
    create(body) { return this.svc.create(body); }
    update(id, body) { return this.svc.update(id, body); }
    publish(id) { return this.svc.publish(id); }
    unpublish(id) { return this.svc.unpublish(id); }
    remove(id) { return this.svc.remove(id); }
};
exports.ArticlesAdminController = ArticlesAdminController;
__decorate([
    (0, common_1.Get)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "list", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "create", null);
__decorate([
    (0, common_1.Patch)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/publish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "publish", null);
__decorate([
    (0, common_1.Post)(':id/unpublish'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "unpublish", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ArticlesAdminController.prototype, "remove", null);
exports.ArticlesAdminController = ArticlesAdminController = __decorate([
    (0, common_1.Controller)('admin/articles'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    (0, auth_guard_1.Roles)(enums_1.UserRole.ADMIN),
    __metadata("design:paramtypes", [ArticlesService])
], ArticlesAdminController);
let ArticleBookmarkContractController = class ArticleBookmarkContractController {
    constructor(conn, svc) {
        this.conn = conn;
        this.svc = svc;
    }
    get col() { return this.conn.db.collection('article_bookmarks'); }
    async add(user, id) {
        const article = await this.svc.publishedById(id);
        await this.col.updateOne({ user_id: user?.id, article_id: article.id }, { $setOnInsert: { id: (0, uuid_1.v4)(), user_id: user?.id, article_id: article.id, createdAt: new Date() } }, { upsert: true });
        return { bookmarked: true };
    }
    async remove(user, id) {
        const article = await this.svc.publishedById(id);
        await this.col.deleteOne({ user_id: user?.id, article_id: article.id });
        return { bookmarked: false };
    }
};
exports.ArticleBookmarkContractController = ArticleBookmarkContractController;
__decorate([
    (0, common_1.Post)(':id/bookmark'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ArticleBookmarkContractController.prototype, "add", null);
__decorate([
    (0, common_1.Delete)(':id/bookmark'),
    (0, idempotency_interceptor_1.RequireIdempotency)(),
    __param(0, (0, auth_guard_1.CurrentUser)()),
    __param(1, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ArticleBookmarkContractController.prototype, "remove", null);
exports.ArticleBookmarkContractController = ArticleBookmarkContractController = __decorate([
    (0, common_1.Controller)('articles'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection, ArticlesService])
], ArticleBookmarkContractController);
let ArticleBookmarksController = class ArticleBookmarksController {
    constructor(conn, svc) {
        this.conn = conn;
        this.svc = svc;
    }
    get col() { return this.conn.db.collection('article_bookmarks'); }
    async mine(req) {
        const rows = await this.col.find({ user_id: req.user?.id }).sort({ createdAt: -1 }).limit(100).toArray();
        const ids = rows.map((r) => r.article_id);
        return this.svc.model
            .find({ id: { $in: ids }, status: 'PUBLISHED', is_deleted: { $ne: true } }, { _id: 0, __v: 0, body_ar: 0, body_en: 0 })
            .lean();
    }
    async status(req, slug) {
        const article = await this.svc.model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
        if (!article)
            throw new common_1.NotFoundException('article not found');
        const row = await this.col.findOne({ user_id: req.user?.id, article_id: article.id });
        return { bookmarked: !!row };
    }
    async toggle(req, slug) {
        const article = await this.svc.model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
        if (!article)
            throw new common_1.NotFoundException('article not found');
        const existing = await this.col.findOne({ user_id: req.user?.id, article_id: article.id });
        if (existing) {
            await this.col.deleteOne({ id: existing.id });
            return { bookmarked: false };
        }
        await this.col.insertOne({ id: (0, uuid_1.v4)(), user_id: req.user?.id, article_id: article.id, createdAt: new Date() });
        return { bookmarked: true };
    }
};
exports.ArticleBookmarksController = ArticleBookmarksController;
__decorate([
    (0, common_1.Get)('mine'),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], ArticleBookmarksController.prototype, "mine", null);
__decorate([
    (0, common_1.Get)(':slug/status'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ArticleBookmarksController.prototype, "status", null);
__decorate([
    (0, common_1.Post)(':slug/toggle'),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('slug')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], ArticleBookmarksController.prototype, "toggle", null);
exports.ArticleBookmarksController = ArticleBookmarksController = __decorate([
    (0, common_1.Controller)('articles/bookmarks'),
    (0, common_1.UseGuards)(auth_guard_1.JwtAuthGuard),
    __param(0, (0, mongoose_1.InjectConnection)()),
    __metadata("design:paramtypes", [mongoose_2.Connection, ArticlesService])
], ArticleBookmarksController);
let ArticlesModule = class ArticlesModule {
};
exports.ArticlesModule = ArticlesModule;
exports.ArticlesModule = ArticlesModule = __decorate([
    (0, common_1.Module)({
        imports: [mongoose_1.MongooseModule.forFeature([{ name: article_schema_1.Article.name, schema: article_schema_1.ArticleSchema }])],
        controllers: [ArticlesPublicController, ArticlesAdminController, seo_controller_1.SeoController, ArticleBookmarkContractController, ArticleBookmarksController],
        providers: [ArticlesService],
        exports: [ArticlesService],
    })
], ArticlesModule);
//# sourceMappingURL=articles.module.js.map