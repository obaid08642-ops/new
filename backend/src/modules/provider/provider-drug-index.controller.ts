import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { JwtAuthGuard } from '../../common/auth.guard';
import { CATALOG_COLLECTIONS } from '../catalogs/catalog-collections';

@Controller('drugs')
export class ProviderDrugIndexController {
  constructor(@InjectConnection() private readonly conn: Connection) {}
  private get col() { return this.conn.collection(CATALOG_COLLECTIONS.medicines); }

  private card(m: any) {
    return {
      id: m.id,
      name_ar: m.name_ar || m.name_en,
      name_en: m.name_en || m.name_ar,
      active_ar: m.active_ingredient || null,
      active_en: m.active_ingredient || null,
      cat: m.category || 'other',
      category_ar: m.category,
      sub_category: m.sub_category || null,
      manufacturer: m.manufacturer || null,
      brand: m.brand || m.manufacturer || null,
      form: m.form || null,
      strength: m.strength || null,
      package_size: m.package_size || null,
      price: m.price || 0,
      old_price: m.old_price || null,
      discount_percent: m.old_price > m.price && m.price > 0 ? Math.round((1 - m.price / m.old_price) * 100) : 0,
      image: m.image || m.images?.[0] || m.image_1 || null,
      images: (Array.isArray(m.images) && m.images.length ? m.images : [m.image_1, m.image_2, m.image_3, m.image_4, m.image_5].filter(Boolean)) || [],
      requires_prescription: !!m.requires_prescription,
      online_exclusive: !!m.online_exclusive,
      available_online: !!m.available_online,
      potentially_unavailable: m.availability_status === 'availability_may_be_limited' || m.availability_status === 'admin_flagged_shortage',
      discontinued: m.availability_status === 'discontinued',
      available: !m.availability_status || m.availability_status === 'none',
    };
  }

  @Get()
  async list(@Query('search') search?: string, @Query('category') category?: string, @Query('limit') limit = '50') {
    const q: any = { is_deleted: { $ne: true } };
    if (search) q.$or = [
      { name_ar: { $regex: search, $options: 'i' } },
      { name_en: { $regex: search, $options: 'i' } },
      { active_ingredient: { $regex: search, $options: 'i' } },
      { manufacturer: { $regex: search, $options: 'i' } },
    ];
    if (category && category !== 'all') {
      // Match the catalog's real Arabic category names directly (no collapsing).
      q.category = category;
    }
    const rows = await this.col.find(q, { projection: { _id: 0, translations: 0, more_info_ar: 0, more_info_en: 0 } })
      .sort({ usage_count: -1, name_ar: 1 }).limit(Math.min(parseInt(limit, 10) || 50, 100)).toArray();
    return { data: rows.map((m: any) => this.card(m)), total: rows.length };
  }

  @Get('categories')
  async categories() {
    const rows = await this.col.aggregate([
      { $match: { is_deleted: { $ne: true }, category: { $nin: [null, ''] } } },
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 30 },
    ]).toArray();
    return { data: rows.map((r: any) => ({ key: r._id, count: r.count })) };
  }

  @Get(':id')
  async one(@Param('id') id: string): Promise<any> {
    const m: any = await this.col.findOne({ id, is_deleted: { $ne: true } }, { projection: { _id: 0 } });
    if (!m) return { error: 'not_found' };
    const alternatives = m.active_ingredient
      ? await this.col.find(
          { active_ingredient: m.active_ingredient, id: { $ne: id }, is_deleted: { $ne: true } },
          { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, image: 1 } } as any,
        ).limit(8).toArray()
      : [];
    const similar = m.category
      ? await this.col.find(
          { category: m.category, id: { $ne: id }, is_deleted: { $ne: true } },
          { projection: { _id: 0, id: 1, name_ar: 1, name_en: 1, price: 1, manufacturer: 1, image: 1 } } as any,
        ).limit(8).toArray()
      : [];
    return {
      ...this.card(m),
      generic_name: m.generic_name || null,
      barcode: m.barcode || null,
      dosage_ar: m.dosage_ar || null,
      dosage_en: m.dosage_en || null,
      usage_instructions_ar: m.usage_instructions_ar || null,
      warnings_ar: m.warnings_ar || [],
      warnings_en: m.warnings_en || [],
      precautions_ar: m.precautions_ar || [],
      side_effects_ar: m.side_effects_ar || [],
      interactions: m.interactions || [],
      contraindications_ar: m.contraindications_ar || [],
      storage_conditions_ar: m.storage_conditions_ar || null,
      indications_ar: m.indications_ar || [],
      description_ar: m.description_ar || null,
      shortage_notes: m.shortage_notes || null,
      pregnancy_info_ar: m.pregnancy_info_ar || null,
      pregnancy_info_en: m.pregnancy_info_en || null,
      breastfeeding_info_ar: m.breastfeeding_info_ar || null,
      breastfeeding_info_en: m.breastfeeding_info_en || null,
      more_info_ar: m.more_info_ar || null,
      more_info_en: m.more_info_en || null,
      alternatives,
      similar,
    };
  }
}
