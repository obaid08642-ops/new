import { BadRequestException, Body, Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../../common/auth.guard';
import { Permission, RequirePermissions } from '../../../common/permissions';
import { UserRole } from '../../../common/enums';
import { validateReason, ReasonError } from '../../../common/rbac';
import { AdminAuditService } from './audit.service';
import { SaveHomeCurationDto, SaveFeatureFlagDto } from './admin-governance-controls.dto';
import { CATALOG_COLLECTIONS } from '../../catalogs/catalog-collections';

/**
 * Missing A5/A6 administrative controls. The stored documents are the source
 * of truth for downstream clients; no presentation-layer data is fabricated.
 */
@Controller('admin/governance-controls')
@UseGuards(JwtAuthGuard)
@Roles(UserRole.ADMIN)
export class AdminGovernanceControlsController {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly audit: AdminAuditService,
  ) {}

  @Get('home-curation')
  @RequirePermissions(Permission.CMS_EDIT)
  async homeCuration() {
    const doc: any = await this.conn.collection('home_curation').findOne({ key: 'primary' }, { projection: { _id: 0 } });
    return doc || { key: 'primary', version: 0, sections: [], updatedAt: null };
  }

  @Post('home-curation')
  @RequirePermissions(Permission.CMS_EDIT)
  async saveHomeCuration(@Body() body: SaveHomeCurationDto, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(body?.reason); } catch (error) {
      if (error instanceof ReasonError) throw new BadRequestException(error.code);
      throw error;
    }
    if (!Array.isArray(body?.sections) || body.sections.length > 40) throw new BadRequestException('sections_array_up_to_40_required');
    const ids = new Set<string>();
    const sections = body.sections.map((section: any, index: number) => {
      const id = String(section?.id || '').trim();
      const type = String(section?.type || '').trim();
      if (!id || !type || id.length > 80 || type.length > 60 || ids.has(id)) throw new BadRequestException('section_id_and_type_must_be_unique');
      ids.add(id);
      const items = Array.isArray(section?.items) ? section.items.slice(0, 30).map((item: any) => ({
        id: String(item?.id || '').slice(0, 100),
        title_ar: String(item?.title_ar || '').slice(0, 160),
        image_url: String(item?.image_url || '').slice(0, 800),
        deep_link: String(item?.deep_link || '').slice(0, 160),
      })) : [];
      return { id, type, title_ar: String(section?.title_ar || '').slice(0, 160), position: index, enabled: section?.enabled !== false, items };
    });
    const before: any = await this.conn.collection('home_curation').findOne({ key: 'primary' });
    const doc = { key: 'primary', version: Number(before?.version || 0) + 1, sections, updated_by: me.id, updatedAt: new Date() };
    await this.conn.collection('home_curation').updateOne({ key: 'primary' }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true });
    await this.audit.write({ action: 'home_curation_update', actor: me, target_type: 'home_curation', target_id: 'primary', reason, before: { version: before?.version ?? 0 }, after: { version: doc.version, sections: sections.length } });
    return doc;
  }

  /** Reads canonical and legacy stores into a single audited administrative view. */
  @Get('feature-flags')
  @RequirePermissions(Permission.OPS_QUEUES_MANAGE)
  async featureFlags() {
    const [canonical, legacy] = await Promise.all([
      this.conn.collection('feature_flags').find({}).project({ _id: 0 }).toArray(),
      this.conn.collection('featureflags').find({}).project({ _id: 0 }).toArray(),
    ]);
    const merged = new Map<string, any>();
    for (const source of [...legacy, ...canonical] as any[]) {
      const key = String(source.key || source.name || '').trim();
      if (!key) continue;
      const current = merged.get(key);
      const incomingAt = new Date(source.updatedAt || source.updated_at || 0).getTime();
      const currentAt = new Date(current?.updatedAt || current?.updated_at || 0).getTime();
      if (!current || incomingAt >= currentAt) merged.set(key, { key, enabled: !!source.enabled, rollout_percentage: Number(source.rollout_percentage ?? source.rollout ?? 100), updatedAt: source.updatedAt || source.updated_at || null, source: source.source || 'database' });
    }
    return { data: [...merged.values()].sort((a, b) => a.key.localeCompare(b.key)), stores: { canonical: canonical.length, legacy: legacy.length } };
  }

  @Post('feature-flags')
  @RequirePermissions(Permission.OPS_QUEUES_MANAGE)
  async saveFeatureFlag(@Body() body: SaveFeatureFlagDto, @CurrentUser() me: any) {
    let reason: string;
    try { reason = validateReason(body?.reason); } catch (error) {
      if (error instanceof ReasonError) throw new BadRequestException(error.code);
      throw error;
    }
    const key = String(body?.key || '').trim();
    const rollout = Number(body?.rollout_percentage);
    if (!/^[a-z0-9._-]{2,80}$/i.test(key)) throw new BadRequestException('feature_flag_key_invalid');
    if (typeof body?.enabled !== 'boolean') throw new BadRequestException('enabled_boolean_required');
    if (!Number.isFinite(rollout) || rollout < 0 || rollout > 100) throw new BadRequestException('rollout_percentage_must_be_0_to_100');
    const before: any = await this.conn.collection('feature_flags').findOne({ key });
    const doc = { key, enabled: body.enabled, rollout_percentage: Math.round(rollout), updated_by: me.id, updatedAt: new Date(), source: 'admin_governance_controls' };
    await Promise.all([
      this.conn.collection('feature_flags').updateOne({ key }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true }),
      this.conn.collection('featureflags').updateOne({ key }, { $set: doc, $setOnInsert: { createdAt: new Date() } }, { upsert: true }),
    ]);
    await this.audit.write({ action: 'feature_flag_update', actor: me, target_type: 'feature_flag', target_id: key, reason, before: before ? { enabled: before.enabled, rollout_percentage: before.rollout_percentage } : null, after: { enabled: doc.enabled, rollout_percentage: doc.rollout_percentage } });
    return doc;
  }

  /**
   * Batch 7: Medicine Price History & Verification Audit.
   */
  /** Search intelligence for the admin search-intelligence page: zero-result
   * queries, top queries, locales and locations from the query_analytics log. */
  @Get('search-intent-analytics')
  @RequirePermissions(Permission.ANALYTICS_READ)
  async searchIntentAnalytics(@Query('locale') locale?: string, @Query('days') days?: string) {
    const safeDays = Math.min(Math.max(Number(days) || 30, 1), 90);
    const since = new Date(Date.now() - safeDays * 86400000);
    const match: any = { created_at: { $gte: since } };
    if (locale && locale !== 'all') match.locale = locale;
    const col = this.conn.collection('query_analytics');
    const [totals, top, locations] = await Promise.all([
      col.aggregate([
        { $match: match },
        { $group: { _id: null, total: { $sum: 1 }, zero: { $sum: { $cond: [{ $eq: ['$results_count', 0] }, 1, 0] } } } },
      ]).toArray(),
      col.aggregate([
        { $match: match },
        { $sort: { created_at: -1 } },
        {
          $group: {
            _id: { q: '$normalized_query', locale: '$locale' },
            count: { $sum: 1 },
            zero: { $sum: { $cond: [{ $eq: ['$results_count', 0] }, 1, 0] } },
            raw_query: { $first: '$raw_query' },
            intent_type: { $first: '$detected_intent' },
            entity_type: { $first: '$detected_entity_type' },
            location_code: { $first: '$resolved_location_code' },
            last_searched: { $max: '$created_at' },
          },
        },
        { $sort: { zero: -1, count: -1 } },
        { $limit: 50 },
      ]).toArray(),
      col.aggregate([
        { $match: { ...match, resolved_location_code: { $ne: null } } },
        { $group: { _id: '$resolved_location_code', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 20 },
      ]).toArray(),
    ]);
    const total = Number(totals?.[0]?.total || 0);
    const zero = Number(totals?.[0]?.zero || 0);
    return {
      total_queries: total,
      no_results_queries: zero,
      zero_result_rate: total > 0 ? Math.round((zero / total) * 1000) / 10 : 0,
      top_queries: top.map((t: any) => ({
        raw_query: t.raw_query, normalized_query: t._id?.q, locale: t._id?.locale,
        intent_type: t.intent_type, entity_type: t.entity_type, location_code: t.location_code,
        count: t.count, last_searched: t.last_searched,
      })),
      zero_result_queries: top.filter((t: any) => t.zero > 0).map((t: any) => ({ raw_query: t.raw_query, locale: t._id?.locale, count: t.zero })),
      top_specialties: [],
      top_locations: locations.map((l: any) => ({ location: l._id, count: l.count })),
    };
  }

  @Get('medicine-price-history')
  @RequirePermissions(Permission.CATALOG_READ)
  async medicinePriceHistory(@Query('page') page?: string, @Query('limit') limit?: string, @Query('search') search?: string) {
    const col = this.conn.collection('medicine_price_history');
    const filter: any = {};
    if (search) {
      const safe = String(search).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [{ medicine_name: new RegExp(safe, 'i') }, { medicine_id: safe }];
    }
    const safeLimit = Math.min(Math.max(Number(limit) || 25, 1), 100);
    const safePage = Math.max(Number(page) || 1, 1);
    const [total, history, summary] = await Promise.all([
      col.countDocuments(filter),
      col.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).project({ _id: 0 }).toArray(),
      col.aggregate([
        { $match: filter },
        { $group: { _id: null, total_overrides: { $sum: 1 }, flagged_overpriced: { $sum: { $cond: [{ $eq: ['$flagged', true] }, 1, 0] } }, avg_variance_pct: { $avg: '$variance_pct' } } },
      ]).toArray(),
    ]);
    const s = summary[0] || { total_overrides: 0, flagged_overpriced: 0, avg_variance_pct: 0 };

    return {
      data: history,
      total,
      page: safePage,
      pages: Math.max(Math.ceil(total / safeLimit), 1),
      summary: { total_overrides: s.total_overrides, flagged_overpriced: s.flagged_overpriced, avg_variance_pct: Number(Number(s.avg_variance_pct || 0).toFixed(2)) },
    };
  }

  /**
   * Batch 7: MCP Tool & AI Commerce Safety Audit Logs.
   */
  @Get('mcp-audit-logs')
  @RequirePermissions(Permission.ANALYTICS_READ)
  async mcpAuditLogs() {
    const col = this.conn.collection('ai_checkout_sessions');
    const sessions = await col
      .find({})
      .sort({ createdAt: -1 })
      .limit(50)
      .project({ _id: 0 })
      .toArray();

    return {
      total_sessions: sessions.length,
      sessions,
    };
  }

  /**
   * Batch 7: Entity Graph Node & Edge Statistics.
   */
  @Get('entity-graph-stats')
  @RequirePermissions(Permission.ANALYTICS_READ)
  async entityGraphStats() {
    const [conditionsCount, medicinesCount, doctorsCount, facilitiesCount, locationsCount] =
      await Promise.all([
        this.conn.collection('conditions').countDocuments({ is_deleted: { $ne: true } }),
        this.conn.collection(CATALOG_COLLECTIONS.medicines).countDocuments({ is_deleted: { $ne: true } }),
        this.conn.collection('provider_profiles').countDocuments({ is_active: { $ne: false } }),
        this.conn.collection('facilities').countDocuments({ is_active: { $ne: false } }),
        this.conn.collection('locations').countDocuments({ is_active: { $ne: false } }),
      ]);

    return {
      nodes: {
        conditions: conditionsCount,
        medicines: medicinesCount,
        doctors: doctorsCount,
        facilities: facilitiesCount,
        locations: locationsCount,
        total_nodes:
          conditionsCount + medicinesCount + doctorsCount + facilitiesCount + locationsCount,
      },
      graph_status: 'healthy',
      updatedAt: new Date(),
    };
  }
}

/**
 * P6.x-13: public home content (banners/sections) managed on the
 * home-curation admin page. Enabled sections only, position-ordered.
 */
@Controller('content')
export class PublicContentController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get('home')
  async home(): Promise<any> {
    const doc: any = await this.conn.collection('home_curation').findOne({ key: 'primary' }, { projection: { _id: 0 } });
    const sections = Array.isArray(doc?.sections) ? doc.sections.filter((s: any) => s?.enabled !== false) : [];
    sections.sort((a: any, b: any) => (a?.position || 0) - (b?.position || 0));
    return { key: 'primary', version: doc?.version || 0, sections, updatedAt: doc?.updatedAt || null };
  }
}
