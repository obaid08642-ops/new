/**
 * M6 / SEO-2: articles module — public reading endpoints + admin CMS.
 * Public list/detail serve ONLY published articles (soft-delete aware).
 */
import { SeoController } from './seo.controller';
import {
  Body, Controller, Delete, Get, Injectable, Module,
  NotFoundException, Param, Patch, Post, Query, Req, UseGuards,
} from '@nestjs/common';
import { InjectConnection, InjectModel, MongooseModule } from '@nestjs/mongoose';
import { Connection, Model } from 'mongoose';
import { v4 as uuidv4 } from 'uuid';
import { JwtAuthGuard, Public, Roles, CurrentUser } from '../../common/auth.guard';
import { RequireIdempotency } from '../../common/idempotency.interceptor';
import { UserRole } from '../../common/enums';
import { Article, ArticleSchema } from '../../schemas/article.schema';
import { buildSlug, slugify } from '../../common/slug.util';

@Injectable()
export class ArticlesService {
  constructor(@InjectModel(Article.name) private model: Model<any>) {}

  list(query: any) {
    const { category, q, limit = '20', page = '1' } = query;
    const filter: any = { status: 'PUBLISHED', is_deleted: { $ne: true } };
    if (category) filter.category = category;
    if (q) filter.$or = [{ title_ar: new RegExp(q, 'i') }, { title_en: new RegExp(q, 'i') }, { tags: q }];
    const lim = Math.min(Number(limit) || 20, 50);
    const skip = (Math.max(Number(page) || 1, 1) - 1) * lim;
    return this.model
      .find(filter, { _id: 0, __v: 0, body_ar: 0, body_en: 0 })
      .sort({ published_at: -1 }).skip(skip).limit(lim).lean();
  }

  categories() {
    return this.model.distinct('category', { status: 'PUBLISHED', is_deleted: { $ne: true } });
  }

  async bySlug(slug: string) {
    const doc: any = await this.model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { _id: 0, __v: 0 }).lean();
    if (!doc) throw new NotFoundException('article not found');
    this.model.updateOne({ id: doc.id }, { $inc: { views: 1 } }).exec().catch(() => null);
    return doc;
  }

  async publishedById(id: string) {
    const article: any = await this.model.findOne({ id, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
    if (!article) throw new NotFoundException('article_not_found');
    return article;
  }

  async create(body: any) {
    const slug = buildSlug(body.title_ar || body.title_en || 'article', require('crypto').randomUUID());
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

  update(id: string, body: any) {
    const { id: _i, slug: _s, ...rest } = body || {};
    return this.model.findOneAndUpdate({ id }, { $set: rest }, { new: true });
  }

  publish(id: string) {
    return this.model.findOneAndUpdate({ id }, { $set: { status: 'PUBLISHED', published_at: new Date() } }, { new: true });
  }

  unpublish(id: string) {
    return this.model.findOneAndUpdate({ id }, { $set: { status: 'DRAFT' } }, { new: true });
  }

  remove(id: string) {
    return this.model.findOneAndUpdate({ id }, { $set: { is_deleted: true } }, { new: true });
  }

  adminList() {
    return this.model.find({ is_deleted: { $ne: true } }, { _id: 0, __v: 0, body_ar: 0, body_en: 0 }).sort({ createdAt: -1 }).limit(200).lean();
  }
}

// ── Public endpoints (crawlable content) ───────────────────────────────────
@Controller('articles')
export class ArticlesPublicController {
  constructor(private svc: ArticlesService) {}

  @Public() @Get() list(@Query() q: any) { return this.svc.list(q); }
  @Public() @Get('categories') cats() { return this.svc.categories(); }
  @Public() @Get(':slug') one(@Param('slug') slug: string) { return this.svc.bySlug(slug); }
}

// ── Admin CMS endpoints ────────────────────────────────────────────────────
@Controller('admin/articles')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class ArticlesAdminController {
  constructor(private svc: ArticlesService) {}

  @Get() list() { return this.svc.adminList(); }
  @Post() create(@Body() body: any) { return this.svc.create(body); }
  @Patch(':id') update(@Param('id') id: string, @Body() body: any) { return this.svc.update(id, body); }
  @Post(':id/publish') publish(@Param('id') id: string) { return this.svc.publish(id); }
  @Post(':id/unpublish') unpublish(@Param('id') id: string) { return this.svc.unpublish(id); }
  @Delete(':id') remove(@Param('id') id: string) { return this.svc.remove(id); }
}

// ── Contract bookmarks (authenticated, owner-scoped and idempotent) ────────
@Controller('articles')
@UseGuards(JwtAuthGuard)
export class ArticleBookmarkContractController {
  constructor(@InjectConnection() private conn: Connection, private svc: ArticlesService) {}
  private get col() { return this.conn.db.collection('article_bookmarks'); }

  @Post(':id/bookmark')
  @RequireIdempotency()
  async add(@CurrentUser() user: any, @Param('id') id: string) {
    const article = await this.svc.publishedById(id);
    await this.col.updateOne(
      { user_id: user?.id, article_id: article.id },
      { $setOnInsert: { id: uuidv4(), user_id: user?.id, article_id: article.id, createdAt: new Date() } },
      { upsert: true },
    );
    return { bookmarked: true };
  }

  @Delete(':id/bookmark')
  @RequireIdempotency()
  async remove(@CurrentUser() user: any, @Param('id') id: string) {
    const article = await this.svc.publishedById(id);
    await this.col.deleteOne({ user_id: user?.id, article_id: article.id });
    return { bookmarked: false };
  }
}

// ── Patient bookmarks (authenticated) ─────────────────────────────────────
@Controller('articles/bookmarks')
@UseGuards(JwtAuthGuard)
export class ArticleBookmarksController {
  constructor(@InjectConnection() private conn: Connection, private svc: ArticlesService) {}

  private get col() { return this.conn.db.collection('article_bookmarks'); }

  /** GET /articles/bookmarks/mine — my saved articles (full article docs) */
  @Get('mine')
  async mine(@Req() req: any) {
    const rows = await this.col.find({ user_id: req.user?.id }).sort({ createdAt: -1 }).limit(100).toArray();
    const ids = rows.map((r: any) => r.article_id);
    return (this.svc as any).model
      .find({ id: { $in: ids }, status: 'PUBLISHED', is_deleted: { $ne: true } }, { _id: 0, __v: 0, body_ar: 0, body_en: 0 })
      .lean();
  }

  /** GET /articles/bookmarks/:slug/status — is this article bookmarked by me? */
  @Get(':slug/status')
  async status(@Req() req: any, @Param('slug') slug: string) {
    const article: any = await (this.svc as any).model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
    if (!article) throw new NotFoundException('article not found');
    const row = await this.col.findOne({ user_id: req.user?.id, article_id: article.id });
    return { bookmarked: !!row };
  }

  /** POST /articles/bookmarks/:slug/toggle — add/remove bookmark */
  @Post(':slug/toggle')
  async toggle(@Req() req: any, @Param('slug') slug: string) {
    const article: any = await (this.svc as any).model.findOne({ slug, status: 'PUBLISHED', is_deleted: { $ne: true } }, { id: 1 }).lean();
    if (!article) throw new NotFoundException('article not found');
    const existing = await this.col.findOne({ user_id: req.user?.id, article_id: article.id });
    if (existing) {
      await this.col.deleteOne({ id: existing.id });
      return { bookmarked: false };
    }
    await this.col.insertOne({ id: uuidv4(), user_id: req.user?.id, article_id: article.id, createdAt: new Date() } as any);
    return { bookmarked: true };
  }
}

@Module({
  imports: [MongooseModule.forFeature([{ name: Article.name, schema: ArticleSchema }])],
  controllers: [ArticlesPublicController, ArticlesAdminController, SeoController, ArticleBookmarkContractController, ArticleBookmarksController],
  providers: [ArticlesService],
  exports: [ArticlesService],
})
export class ArticlesModule {}
