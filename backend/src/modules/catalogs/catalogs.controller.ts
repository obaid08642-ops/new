import { Controller, Get, Param, NotFoundException, UseInterceptors } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';
import { RedisCacheInterceptor } from '../../common/redis-cache.interceptor';
import { CATALOG_COLLECTIONS } from './catalog-collections';

/**
 * Unified catalogs — SINGLE READ PATH for every app and every call site:
 * - insurance: live DB (insurancecompanies + insurance_networks with tiers),
 *   managed via admin insurance-companies page.
 * - labs: live DB (labservices), managed via admin catalog-manager.
 * - radiology: live DB (radiologyservices), managed via admin catalog-manager.
 * - nursing: live DB (nursing_catalog), managed via admin catalog-manager.
 * - specialties: live DB (specialties collection).
 * Static JSON files are fallback only (used when DB is empty, e.g. fresh dev).
 * Admin add/remove in the dashboard writes to DB → visible everywhere instantly.
 */
const DB_COLLECTIONS: Record<string, string> = {
  labs: CATALOG_COLLECTIONS.lab_services,
  radiology: CATALOG_COLLECTIONS.radiology_services,
  nursing: CATALOG_COLLECTIONS.nursing_services,
  specialties: 'specialties',
};

const CATALOGS = ['insurance', 'labs', 'radiology', 'nursing', 'specialties', 'medicines'] as const;

@Controller('catalogs')
@UseInterceptors(RedisCacheInterceptor)
export class CatalogsController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':type')
  async getCatalog(@Param('type') type: string) {
    if (!CATALOGS.includes(type as any)) throw new NotFoundException('catalog_not_found');
    if (type === 'insurance') return this.insuranceCatalog();
    if (type === 'medicines') return this.medicinesCatalog();
    return this.dbCatalog(type, DB_COLLECTIONS[type]);
  }

  private async medicinesCatalog() {
    // P5.1: medicines read ONLY the canonical medicines collection through the
    // same governance gate as the public catalog (no static fallback).
    const rows = await this.conn.collection(CATALOG_COLLECTIONS.medicines)
      .find({
        is_deleted: { $ne: true },
        public_eligibility: true,
        indexing_eligibility: true,
        medical_review_status: 'approved',
      } as any)
      .limit(2000).toArray().catch(() => []);
    if (!rows.length) throw new NotFoundException('catalog_unavailable');
    return (rows as any[]).map(({ _id, ...r }: any) => ({
      code: r.barcode || r.id,
      name_ar: r.name_ar,
      name_en: r.name_en,
      image_url: (Array.isArray(r.images) && r.images[0]) || r.image || null,
      is_active: true,
      ...r,
    }));
  }

  private async dbCatalog(type: string, collection: string) {
    // P5.1: DB is the single source of truth — no static fallback.
    // Boot seeds (CatalogsSeedService, insert-only) populate fresh envs.
    const rows = await this.conn.collection(collection)
      .find({ $or: [{ is_active: true }, { active: { $ne: false } }, { is_active: { $exists: false } }] } as any)
      .limit(500).toArray().catch(() => []);
    const live = (rows as any[]).filter((r: any) => r.is_active !== false && r.active !== false);
    if (!live.length) throw new NotFoundException('catalog_unavailable');
    return live.map(({ _id, ...r }: any) => ({
      code: r.short_code || r.code || r.id,
      // P5.1: canonical per-collection name fields first (labs use test_name_*).
      name_ar: r.test_name_ar || r.name_ar || r.name,
      name_en: r.test_name_en || r.name_en || r.name,
      image_url: r.image_url || `https://cdn.nabd.plus/${type}/${r.short_code || r.code || r.id}.png`,
      is_active: true,
      ...r,
    }));
  }

  private async insuranceCatalog() {
    // P5.1: DB-only (companies + networks); empty → 404, never static.
    const [companies, networks] = await Promise.all([
      this.conn.collection('insurancecompanies').find({ is_active: true }).sort({ name_en: 1 }).toArray().catch(() => []),
      this.conn.collection('insurance_networks').find({ catalog_status: { $ne: 'retired' } }).toArray().catch(() => []),
    ]);
    if (!companies.length) throw new NotFoundException('catalog_unavailable');
    const byCompany = new Map<string, any[]>();
    for (const n of networks as any[]) {
      const arr = byCompany.get(n.company_id) || [];
      arr.push(n);
      byCompany.set(n.company_id, arr);
    }
    return (companies as any[]).map((c: any) => ({
      code: c.code,
      name_ar: c.name_ar,
      name_en: c.name_en,
      image_url: c.logo_url || c.image_url || `https://cdn.nabd.plus/insurance/${c.code}.png`,
      is_active: c.is_active !== false,
      plans: (byCompany.get(c.id) || []).sort((a: any, b: any) => (a.tier_level || 0) - (b.tier_level || 0)),
    }));
  }
}
