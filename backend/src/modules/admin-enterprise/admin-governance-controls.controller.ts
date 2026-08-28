import { BadRequestException, Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Roles } from '../../common/auth.guard';
import { Permission, RequirePermissions } from '../../common/permissions';
import { UserRole } from '../../common/enums';
import { validateReason, ReasonError } from '../../common/rbac';
import { AdminAuditService } from './audit.service';

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
  async saveHomeCuration(@Body() body: any, @CurrentUser() me: any) {
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
  async saveFeatureFlag(@Body() body: any, @CurrentUser() me: any) {
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
}
