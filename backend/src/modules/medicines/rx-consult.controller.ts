import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Put, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { IsObject, IsOptional, IsString } from 'class-validator';
import { Connection } from 'mongoose';
import { CurrentUser, JwtAuthGuard, Public, Roles } from '../../common/auth.guard';
import { SPECIALTY_MASTER, UserRole } from '../../common/enums';

/** system_configs key: which specialty the "استشر طبيب" button opens for an Rx item (owner decision 10). */
export const RX_CONSULT_KEY = 'rx_consult_specialties';

export class RxConsultSpecialtiesDto {
  /** category or sub_category of the medicine -> specialty slug (SPECIALTY_MASTER). */
  // free-form: keys are catalogue category names, chosen by the admin; every value is checked against SPECIALTY_MASTER.
  @IsObject()
  map: Record<string, string>;

  /** Specialty slug used when the category has no entry; null or absent means "no filter". */
  @IsOptional()
  @IsString()
  default?: string | null;
}

const bySlug = new Map(SPECIALTY_MASTER.map((s) => [s.slug, s]));

/**
 * D-10: an Rx item in the cart offers "استشر طبيب", which opens consultations filtered to a suitable
 * specialty. The mapping is admin config (category -> specialty), never hard-coded; without one the
 * answer is `specialty: null` and the app opens consultations unfiltered. The doctor decides; this
 * never "requests a prescription".
 */
@ApiTags('Medicines')
@Controller()
export class RxConsultController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  private async config(): Promise<{ map: Record<string, string>; default: string | null }> {
    const doc: any = await this.conn.collection('system_configs').findOne({ key: RX_CONSULT_KEY });
    const map = doc?.value?.map && typeof doc.value.map === 'object' ? doc.value.map : {};
    const def = typeof doc?.value?.default === 'string' && bySlug.has(doc.value.default) ? doc.value.default : null;
    return { map, default: def };
  }

  /** GET /api/v1/medicines/:id/consult-specialty — public. */
  @Public()
  @Get('medicines/:id/consult-specialty')
  @ApiOperation({ summary: 'Specialty to consult for a prescription-only item / التخصص المناسب لاستشارة طبيب' })
  async consultSpecialty(@Param('id') id: string) {
    const med: any = await this.conn.collection('medicines').findOne(
      { $or: [{ id }, { slug: id }] },
      { projection: { _id: 0, id: 1, category: 1, sub_category: 1, sub_sub_category: 1, requires_prescription: 1 } },
    );
    if (!med) throw new NotFoundException('medicine_not_found');
    const cfg = await this.config();
    let slug: string | null = null;
    let source: 'category' | 'default' | null = null;
    for (const key of [med.sub_sub_category, med.sub_category, med.category]) {
      const mapped = typeof key === 'string' ? cfg.map[key] : undefined;
      if (mapped && bySlug.has(mapped)) { slug = mapped; source = 'category'; break; }
    }
    if (!slug && cfg.default) { slug = cfg.default; source = 'default'; }
    const s = slug ? bySlug.get(slug)! : null;
    return {
      medicine_id: med.id,
      requires_prescription: med.requires_prescription === true,
      specialty: s ? { slug: s.slug, name_ar: s.name_ar, name_en: s.name_en } : null,
      source,
    };
  }

  /** GET /api/v1/admin/pharmacy/rx-consult-specialties — the mapping plus the Rx categories to map. */
  @Get('admin/pharmacy/rx-consult-specialties')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async getMapping() {
    const cfg = await this.config();
    const categories = await this.conn.collection('medicines').aggregate([
      { $match: { requires_prescription: true } },
      { $group: { _id: { $ifNull: ['$sub_category', '$category'] }, count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 300 },
    ]).toArray();
    return {
      ...cfg,
      categories: categories.filter((c: any) => typeof c._id === 'string' && c._id).map((c: any) => ({ key: c._id, count: c.count })),
      specialties: SPECIALTY_MASTER,
    };
  }

  /** PUT /api/v1/admin/pharmacy/rx-consult-specialties — admin, every slug checked, audit-logged. */
  @Put('admin/pharmacy/rx-consult-specialties')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.ADMIN)
  async setMapping(@Body() body: RxConsultSpecialtiesDto, @CurrentUser() admin: any) {
    const map: Record<string, string> = {};
    for (const [k, v] of Object.entries(body.map || {})) {
      const key = String(k).trim().slice(0, 200);
      if (!key || v === '' || v === null || v === undefined) continue;
      if (typeof v !== 'string' || !bySlug.has(v)) throw new BadRequestException({ code: 'unknown_specialty', message: `unknown_specialty:${String(v).slice(0, 60)}` });
      map[key] = v;
    }
    const def = body.default === undefined || body.default === null || body.default === '' ? null : body.default;
    if (def !== null && !bySlug.has(def)) throw new BadRequestException({ code: 'unknown_specialty', message: 'unknown_specialty:default' });
    const before = await this.config();
    const now = new Date();
    await this.conn.collection('system_configs').updateOne(
      { key: RX_CONSULT_KEY },
      { $set: { key: RX_CONSULT_KEY, value: { map, default: def }, updated_at: now, updated_by: admin?.id ?? null }, $setOnInsert: { created_at: now } },
      { upsert: true },
    );
    await this.conn.collection('audit_logs').insertOne({
      id: `rx_consult_${now.getTime()}`,
      action: 'rx_consult_specialties_update',
      resource_kind: 'system_config',
      resource_id: `system_config:${RX_CONSULT_KEY}`,
      actor_account_id: admin?.id,
      actor_role: admin?.role,
      metadata: { before, after: { map, default: def } },
      created_at: now,
    });
    return this.config();
  }
}
