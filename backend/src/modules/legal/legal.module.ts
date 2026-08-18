/**
 * Legal & Compliance Layer — versioned, admin-editable, multi-language policies.
 * legal_policies: version + effective_date + change_log + content_ar/en (EN fallback)
 * legal_acceptances: { user_id, policy_key, version, timestamp, device, ip, platform }
 * finance_config: commissions per service type + per provider + payout rules (DB-driven)
 */
import { Module, Injectable, Controller, Get, Post, Put, Body, Param, Query, Req, UseGuards, BadRequestException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Request } from 'express';
import { JwtAuthGuard, CurrentUser, Public, Roles } from '../../common/auth.guard';
import { LegalEnterpriseService } from './legal-enterprise.service';
import { LegalEnterpriseController } from './legal-enterprise.controller';
import { UserRole } from '../../common/enums';

const DEFAULT_COMMISSIONS = {
  service_types: {
    pharmacy: { percent: 10, note: 'medicine orders' },
    doctor: { percent: 15, note: 'consultations' },
    lab: { percent: 12, note: 'lab tests' },
    radiology: { percent: 12, note: 'imaging' },
    nursing: { percent: 15, note: 'home nursing' },
    ambulance: { percent: 10, note: 'emergency rides' },
  },
  provider_overrides: {} as Record<string, { percent: number; note?: string }>,
  payout_schedule: { frequency: 'weekly', day: 'sunday', minimum_payout_sar: 100, processing_days: 3 },
  tax: { vat_percent: 15, note: 'KSA VAT applied on commission only' },
};

@Injectable()
export class LegalService {
  constructor(
    @InjectConnection() private readonly conn: Connection,
    private readonly enterprise: LegalEnterpriseService,
  ) {}

  private get policies() { return this.conn.collection('legal_policies'); }
  private get acceptances() { return this.conn.collection('legal_acceptances'); }
  private get financeConfig() { return this.conn.collection('finance_config'); }

  private async ensureFinanceConfig() {
    const existing = await this.financeConfig.findOne({ key: 'commissions' });
    if (!existing) {
      await this.financeConfig.insertOne({ key: 'commissions', ...DEFAULT_COMMISSIONS, updatedAt: new Date() });
    }
  }

  async getPolicy(key: string, lang = 'ar') {
    const p: any = await this.policies.findOne({ key }, { projection: { _id: 0 } });
    if (!p) return null;
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

  async listPolicies(): Promise<any[]> {
    return this.policies.find({}, { projection: { _id: 0, key: 1, title_ar: 1, title_en: 1, version: 1, last_updated: 1, requires_acceptance: 1, applies_to: 1 } }).sort({ key: 1 }).toArray();
  }

  async upsertPolicy(adminId: string, key: string, patch: any) {
    const existing: any = await this.policies.findOne({ key });
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
      await this.policies.insertOne(doc as any);
      return { created: true, version: doc.version };
    }
    const [maj, min] = String(existing.version || '1.0').split('.').map(Number);
    const newVersion = `${maj}.${(min || 0) + 1}`;
    await this.policies.updateOne({ key }, {
      $set: { ...fields, version: newVersion, last_updated: new Date() },
      $push: { change_log: { version: newVersion, date: new Date(), note: change_note || 'update', by: adminId } } as any,
    });
    await this.enterprise.recordAudit(adminId, 'legal.policy.edit', `legal_policies:${key}`, { version: existing.version, content_len: (existing.content_ar || '').length }, { version: newVersion, patch: fields }, {});
    return { updated: true, version: newVersion };
  }

  async accept(user: any, key: string, req: Request) {
    const policy: any = await this.policies.findOne({ key });
    if (!policy) throw new BadRequestException('policy_not_found');
    const existing = await this.acceptances.findOne({ user_id: user.id, policy_key: key, version: policy.version });
    if (existing) return { ok: true, already_accepted: true, version: policy.version };
    await this.acceptances.insertOne({
      user_id: user.id,
      policy_key: key,
      version: policy.version,
      timestamp: new Date(),
      device: (req.headers['x-device-id'] as string) || null,
      ip: (req as any).ip || null,
      platform: (req.headers['x-app-platform'] as string) || (req.headers['user-agent']?.includes('okhttp') ? 'android' : req.headers['user-agent']?.includes('iPhone') ? 'ios' : 'web'),
      user_agent: req.headers['user-agent'] || null,
    });
    // Immutable PDF-ready archive with SHA256 (legally traceable)
    const archive = await this.enterprise.snapshotAcceptance(user, policy, {
      ip: (req as any).ip || null,
      device: (req.headers['x-device-id'] as string) || null,
      platform: (req.headers['x-app-platform'] as string) || 'web',
      user_agent: req.headers['user-agent'] || null,
    });
    return { ok: true, accepted: true, version: policy.version, archive_id: archive.archive_id, sha256: archive.sha256, pdf: `/legal/archive/${archive.archive_id}/pdf` };
  }

  async pendingAcceptances(user: any): Promise<any[]> {
    const applicable = await this.policies.find({ requires_acceptance: true }, { projection: { key: 1, version: 1, title_ar: 1, title_en: 1, applies_to: 1 } }).toArray();
    const accepted = await this.acceptances.find({ user_id: user.id }, { projection: { policy_key: 1, version: 1 } }).toArray();
    const accMap = new Map(accepted.map((a: any) => [`${a.policy_key}:${a.version}`, true]));
    return applicable.filter((p: any) => !accMap.has(`${p.key}:${p.version}`) && ((p.applies_to || ['all']).includes('all') || (p.applies_to || []).includes(user.role) || (p.applies_to || []).includes('provider') || (p.applies_to || []).includes('patient')));
  }

  async getCommissions() {
    await this.ensureFinanceConfig();
    const doc: any = await this.financeConfig.findOne({ key: 'commissions' });
    const { _id, key, ...rest } = doc;
    return rest;
  }

  async updateCommissions(adminId: string, patch: any) {
    await this.ensureFinanceConfig();
    const before = await this.getCommissions();
    await this.financeConfig.updateOne({ key: 'commissions' }, { $set: { ...patch, updatedAt: new Date(), updated_by: adminId } });
    const after = await this.getCommissions();
    // Full history — old values never overwritten, effective-dated
    await this.enterprise.recordCommissionChange(adminId, before, after, {});
    return { ok: true, config: after };
  }

  async commissionFor(providerId: string, serviceType: string) {
    const cfg = await this.getCommissions();
    const override = (cfg.provider_overrides as any)?.[providerId];
    if (override) return { percent: override.percent, source: 'provider_override' };
    const t = (cfg.service_types as any)?.[serviceType];
    return { percent: t?.percent ?? 10, source: `service_type:${serviceType}` };
  }
}

@Controller()
export class LegalController {
  constructor(private readonly svc: LegalService) {}

  @Public()
  @Get('legal/policies')
  list(): Promise<any[]> { return this.svc.listPolicies(); }

  @Public()
  @Get('legal/policy/:key')
  policy(@Param('key') key: string, @Query('lang') lang?: string) {
    return this.svc.getPolicy(key, lang || 'ar');
  }

  @Get('legal/pending')
  @UseGuards(JwtAuthGuard)
  pending(@CurrentUser() user: any): Promise<any[]> { return this.svc.pendingAcceptances(user); }

  @Post('legal/accept/:key')
  @UseGuards(JwtAuthGuard)
  accept(@CurrentUser() user: any, @Param('key') key: string, @Req() req: Request) {
    return this.svc.accept(user, key, req);
  }

  @Put('admin/legal/policy/:key')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  upsert(@CurrentUser('id') adminId: string, @Param('key') key: string, @Body() body: any) {
    return this.svc.upsertPolicy(adminId, key, body);
  }

  @Get('admin/finance/commissions')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  commissions() { return this.svc.getCommissions(); }

  @Put('admin/finance/commissions')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  updateCommissions(@CurrentUser('id') adminId: string, @Body() body: any) {
    return this.svc.updateCommissions(adminId, body);
  }

  @Get('finance/commission-for')
  @UseGuards(JwtAuthGuard)
  commissionFor(@Query('provider_id') pid: string, @Query('service_type') st: string) {
    return this.svc.commissionFor(pid || '', st || 'pharmacy');
  }
}

@Module({
  controllers: [LegalController, LegalEnterpriseController],
  providers: [LegalService, LegalEnterpriseService],
  exports: [LegalService, LegalEnterpriseService],
})
export class LegalModule {}
