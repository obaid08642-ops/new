import { BadRequestException, Controller, Get, Inject, NotFoundException, Optional, Param, Post, Query, Body, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard, Roles, CurrentUser } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { DICTIONARY } from '../i18n/i18n.service';
import { AdminAuditService } from './audit.service';
import { SeoService } from '../seo/seo.service';
import { Queue } from 'bullmq';

/**
 * A6 — System Ops:
 *  • BullMQ queue monitor (real depths) with failed-job retry + purge
 *  • Translations manager: DB overrides layered over the static dictionary
 *  • SEO publishing controls: route indexability consumed by robots/sitemap
 * Cron registry lives in ops-crons.service (A7 wires the runners).
 */
@Controller('admin/ops')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminOpsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    @Inject('BullQueue_notifications-delivery') private readonly notificationsQueue: Queue,
    private readonly audit: AdminAuditService,
    @Optional() @Inject(SeoService) private readonly seoService: SeoService | null,
  ) {}

  // ── Queues ───────────────────────────────────────────────────

  @Get('queues')
  @RequirePermissions(Permission.OPS_QUEUES_MANAGE)
  async queues() {
    const counts = await this.notificationsQueue.getJobCounts(
      'waiting', 'active', 'completed', 'failed', 'delayed', 'paused',
    );
    return {
      queues: [{
        name: 'notifications-delivery',
        ...counts,
        is_paused: (counts as any).paused > 0,
      }],
    };
  }

  @Get('queues/:name/jobs')
  async jobs(@Param('name') name: string, @Query('state') state = 'failed', @Query('start') start = '0', @Query('end') end = '19') {
    const s = Math.max(0, parseInt(start as any, 10) || 0);
    const e = Math.min(200, parseInt(end as any, 10) || 20);
    const validStates = ['failed', 'waiting', 'active', 'delayed', 'completed'];
    if (!validStates.includes(state)) throw new BadRequestException(`state_must_be:${validStates.join('|')}`);
    // only notifications queue exists today
    const jobs = await this.notificationsQueue.getJobs([state as any] as any, s, e);
    return {
      data: jobs.map((j: any) => ({
        id: j.id, name: j.name, attempts: j.attemptsMade, failedReason: j.failedReason,
        data_preview: JSON.stringify(j.data || {}).slice(0, 180),
        timestamp: j.timestamp, processedOn: j.processedOn, finishedOn: j.finishedOn,
      })),
      state, total_shown: jobs.length,
    };
  }

  /** Real retry of a single failed job. */
  @Post('queues/:name/jobs/:jobId/retry')
  async retryJob(@Param('name') name: string, @Param('jobId') jobId: string, @Body() b: any, @CurrentUser() me: any) {
    const job = await this.notificationsQueue.getJob(String(jobId));
    if (!job) throw new NotFoundException('job_not_found');
    await job.retry();
    await this.audit.write({
      action: 'queue_job_retry', actor: me, target_type: 'bullmq_job',
      target_id: String(jobId), reason: b?.reason || 'ops retry',
      meta: { queue: name },
    });
    return { ok: true, job_id: String(jobId), queue: name };
  }

  /** Retry ALL failed jobs up to a cap — audited, reason mandatory. */
  @Post('queues/:name/retry-failed')
  async retryFailed(@Param('name') name: string, @Body() b: any, @CurrentUser() me: any) {
    let reason = '';
    try { reason = String(b?.reason || '').trim(); } catch { /* handled below */ }
    if (reason.length < 5) throw new BadRequestException('reason_required');
    const cap = Math.min(500, Number(b?.limit ?? 100));
    const failed = await this.notificationsQueue.getFailed(0, cap - 1);
    let retried = 0;
    for (const j of failed) {
      try { await j.retry(); retried++; } catch { /* already active */ }
    }
    await this.audit.write({
      action: 'queue_retry_failed_bulk', actor: me, target_type: 'bullmq_queue',
      target_id: name, reason, after: { attempted: failed.length, retried },
    });
    return { ok: true, attempted: failed.length, retried };
  }

  // ── Translations ─────────────────────────────────────────────

  /** Static keys + live override diff for ar/en (+ur). */
  @Get('translations')
  @RequirePermissions(Permission.TRANSLATIONS_EDIT)
  async translations(@Query('lang') lang = 'ar', @Query('missing') missing = '') {
    const overrides = await this.conn.collection('translation_overrides').find({ lang }).project({ _id: 0 }).toArray();
    const overrideMap = new Map((overrides as any[]).map((o) => [o.key, o]));
    const langs = ['ar', 'en', 'ur'];
    const rows: any[] = [];
    for (const [key, values] of Object.entries(DICTIONARY)) {
      const ov: any = overrideMap.get(key);
      const row: any = { key, base_ar: (values as any).ar };
      for (const l of langs) row[`current_${l}`] = ov?.values?.[l] ?? (values as any)[l];
      row.overridden = !!ov;
      if (!missing || (missing === 'true' && !row.current_en && lang === 'en')) rows.push(row);
      else if (!missing) rows.push(row);
    }
    return { total_keys: Object.keys(DICTIONARY).length, data: rows.slice(0, 400), overridden_count: overrideMap.size };
  }

  @Post('translations')
  async upsertTranslation(@Body() b: any, @CurrentUser() me: any) {
    const key = String(b?.key || '').trim();
    const value = String(b?.value ?? '').trim();
    if (!key || !(key in DICTIONARY)) throw new BadRequestException('unknown_key');
    const values: any = {};
    for (const l of ['ar', 'en', 'ur']) {
      if (b?.[l] !== undefined) values[l] = String(b[l]).trim();
    }
    if (!Object.keys(values).length && !value) throw new BadRequestException('no_values_provided');
    const finalValues = value ? { [String(b.lang || 'ar')]: value, ...values } : values;

    await this.conn.collection('translation_overrides').updateOne(
      { key, lang: String(b.lang || '*') },
      { $set: { key, values: finalValues, updated_by: me.id, updatedAt: new Date() }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    await this.audit.write({
      action: 'translation_override_upsert', actor: me, target_type: 'translation_key', target_id: key,
      after: finalValues, reason: b?.reason || undefined,
    });
    return { ok: true, key, values: finalValues };
  }

  // ── SEO publishing controls ──────────────────────────────────

  @Get('seo/controls')
  @RequirePermissions(Permission.SEO_CONTROL)
  async seoControls() {
    const docs = await this.conn.collection('seo_controls').find({}).project({ _id: 0 }).toArray();
    return { data: docs, note: 'indexable=false يستبعد المسار من sitemap وrobots عبر طبقة النشر' };
  }

  @Post('seo/controls')
  async setSeoControl(@Body() b: any, @CurrentUser() me: any) {
    const routeKey = String(b?.route_key || '').trim().toLowerCase(); // e.g. medicine-catalog | articles | doctors
    if (!routeKey) throw new BadRequestException('route_key_required');
    if (typeof b?.indexable !== 'boolean') throw new BadRequestException('indexable_boolean_required');
    const before: any = await this.conn.collection('seo_controls').findOne({ route_key: routeKey });
    await this.conn.collection('seo_controls').updateOne(
      { route_key: routeKey },
      { $set: { indexable: b.indexable, updated_by: me.id, updatedAt: new Date(), reason: String(b?.reason || '').trim() || null }, $setOnInsert: { createdAt: new Date() } },
      { upsert: true },
    );
    // robots()/sitemap() cache controls for 30s — flush so the flip is instant.
    try { this.seoService.invalidateControlsCache(); } catch { /* service optional in some contexts */ }
    await this.audit.write({
      action: 'seo_control_update', actor: me, target_type: 'seo_route', target_id: routeKey,
      reason: String(b?.reason || ''),
      before: before ? { indexable: before.indexable } : null,
      after: { indexable: b.indexable },
    });
    return { ok: true, route_key: routeKey, indexable: b.indexable };
  }
}
