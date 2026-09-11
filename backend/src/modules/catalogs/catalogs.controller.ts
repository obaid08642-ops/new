import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Unified catalogs — SINGLE READ PATH for every app and every call site:
 * - insurance: live DB (insurancecompanies + insurance_networks with tiers),
 *   managed via admin insurance-companies page.
 * - labs: live DB (labservices), managed via admin catalog-manager.
 * - radiology: live DB (radiologyservices), managed via admin catalog-manager.
 * - nursing: live DB (nursing_catalog), managed via admin catalog-manager.
 * Static JSON files are fallback only (used when DB is empty, e.g. fresh dev).
 * Admin add/remove in the dashboard writes to DB → visible everywhere instantly.
 */
const DB_COLLECTIONS: Record<string, string> = {
  labs: 'labservices',
  radiology: 'radiologyservices',
  nursing: 'nursing_catalog',
};

const CATALOGS = ['insurance', 'labs', 'radiology', 'nursing'] as const;

@Controller('catalogs')
export class CatalogsController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':type')
  async getCatalog(@Param('type') type: string) {
    if (!CATALOGS.includes(type as any)) throw new NotFoundException('catalog_not_found');
    if (type === 'insurance') return this.insuranceCatalog();
    return this.dbCatalog(type, DB_COLLECTIONS[type]);
  }

  private async dbCatalog(type: string, collection: string) {
    try {
      const rows = await this.conn.collection(collection)
        .find({ $or: [{ is_active: true }, { active: { $ne: false } }, { is_active: { $exists: false } }] } as any)
        .limit(500).toArray().catch(() => []);
      const live = (rows as any[]).filter((r: any) => r.is_active !== false && r.active !== false);
      if (live.length) {
        return live.map(({ _id, ...r }: any) => ({
          code: r.short_code || r.code || r.id,
          name_ar: r.name_ar || r.name,
          name_en: r.name_en || r.name,
          image_url: r.image_url || `https://cdn.nabd.plus/${type}/${r.short_code || r.code || r.id}.png`,
          is_active: true,
          ...r,
        }));
      }
    } catch { /* fallback to static */ }
    return this.staticFallback(type);
  }

  private async insuranceCatalog() {
    try {
      const [companies, networks] = await Promise.all([
        this.conn.collection('insurancecompanies').find({ is_active: true }).sort({ name_en: 1 }).toArray().catch(() => []),
        this.conn.collection('insurance_networks').find({ catalog_status: { $ne: 'retired' } }).toArray().catch(() => []),
      ]);
      if (companies.length) {
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
    } catch { /* fallback to static */ }
    return this.staticFallback('insurance');
  }

  private staticFallback(type: string) {
    const file = path.join(__dirname, '../../constants/catalogs', `${type}.json`);
    const alt = path.join(process.cwd(), 'src/constants/catalogs', `${type}.json`);
    const p = fs.existsSync(file) ? file : alt;
    if (!fs.existsSync(p)) throw new NotFoundException('catalog_unavailable');
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
}
