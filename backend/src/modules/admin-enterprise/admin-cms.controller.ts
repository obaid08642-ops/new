import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';

/**
 * A5 — CMS: full article authoring on top of the existing articles module —
 * edit every field (incl. SEO descriptions + tags) and SCHEDULE publication.
 * A cron publishes due scheduled articles automatically (see crons.service).
 */
@Controller('admin/cms')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminCmsController {
  private static EDITABLE = [
    'title_ar', 'title_en', 'excerpt_ar', 'excerpt_en', 'body_ar', 'body_en',
    'category', 'cover_image', 'author_name', 'author_title',
    'seo_description_ar', 'seo_description_en',
  ];

  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('articles')
  @RequirePermissions(Permission.CMS_EDIT)
  async list(@Query('status') status?: string, @Query('q') q?: string, @Query('page') page = '1', @Query('limit') limit = '25') {
    const filter: any = { is_deleted: { $ne: true } };
    if (['DRAFT', 'PUBLISHED'].includes(String(status))) filter.status = status;
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

  /** Create or full-edit; returns the updated document. */
  @Post('articles')
  async upsert(@Body() b: any, @CurrentUser() me: any): Promise<any> {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    if (!String(b?.title_ar || '').trim()) throw new BadRequestException('title_ar_required');

    const $set: any = { updatedAt: new Date(), last_edited_by: me.id };
    for (const f of AdminCmsController.EDITABLE) {
      if (b[f] !== undefined) $set[f] = String(b[f] ?? '');
    }
    if (Array.isArray(b.tags)) $set.tags = b.tags.map(String).slice(0, 12);
    if (b.slug !== undefined && String(b.slug).trim()) $set.slug = String(b.slug).trim().toLowerCase().replace(/\s+/g, '-').slice(0, 80);

    let id = b?.id;
    if (id) {
      const before: any = await this.conn.collection('articles').findOne({ id });
      if (!before) throw new NotFoundException('article_not_found');
      await this.conn.collection('articles').updateOne({ id }, { $set });
      await this.audit.write({
        action: 'cms_article_update', actor: me, target_type: 'article', target_id: id, reason,
        before: { title_ar: before.title_ar, status: before.status }, after: { title_ar: $set.title_ar ?? before.title_ar },
      });
    } else {
      id = `art_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      await this.conn.collection('articles').insertOne({
        id, ...$set, slug: $set.slug ?? id,
        tags: $set.tags ?? [], status: 'DRAFT', views: 0, is_deleted: false,
        created_by: me.id, createdAt: new Date(),
      } as any);
      await this.audit.write({
        action: 'cms_article_create', actor: me, target_type: 'article', target_id: id, reason,
        after: { title_ar: $set.title_ar },
      });
    }
    return this.conn.collection('articles').findOne({ id }, { projection: { _id: 0 } });
  }

  @Post(':id/publish')
  async publish(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const before: any = await this.conn.collection('articles').findOne({ id });
    if (!before) throw new NotFoundException('article_not_found');
    if (!String(before.title_ar || '').trim()) throw new BadRequestException('title_required_before_publish');
    await this.conn.collection('articles').updateOne(
      { id },
      { $set: { status: 'PUBLISHED', published_at: new Date(), scheduled_at: null } },
    );
    await this.audit.write({
      action: 'cms_article_publish', actor: me, target_type: 'article', target_id: id,
      reason, before: { status: before.status }, after: { status: 'PUBLISHED' },
    });
    return { ok: true, id, status: 'PUBLISHED' };
  }

  /** Schedule a future publish — the cron flips it when due. */
  @Post(':id/schedule')
  async schedule(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const at = new Date(b?.scheduled_at);
    if (isNaN(at.getTime()) || at.getTime() < Date.now()) throw new BadRequestException('scheduled_at_must_be_future');
    const before: any = await this.conn.collection('articles').findOne({ id });
    if (!before) throw new NotFoundException('article_not_found');
    await this.conn.collection('articles').updateOne({ id }, { $set: { scheduled_at: at, status: 'DRAFT' } });
    await this.audit.write({
      action: 'cms_article_schedule', actor: me, target_type: 'article', target_id: id,
      reason, after: { scheduled_at: at.toISOString() },
    });
    return { ok: true, id, scheduled_at: at.toISOString() };
  }

  @Patch(':id/unpublish')
  async unpublish(@Param('id') id: string, @Body() b: any, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(b?.reason); } catch (e) { if (e instanceof ReasonError) throw new BadRequestException(e.code); throw e; }
    const res = await this.conn.collection('articles').updateOne(
      { id, status: 'PUBLISHED' },
      { $set: { status: 'DRAFT', unpublished_at: new Date() } },
    );
    if (!res.matchedCount) throw new NotFoundException('published_article_not_found');
    await this.audit.write({
      action: 'cms_article_unpublish', actor: me, target_type: 'article', target_id: id, reason,
      before: { status: 'PUBLISHED' }, after: { status: 'DRAFT' },
    });
    void b;
    return { ok: true, id, status: 'DRAFT' };
  }
}
