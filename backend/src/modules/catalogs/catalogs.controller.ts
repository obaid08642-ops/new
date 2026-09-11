import { Controller, Get, Param, NotFoundException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { Public } from '../../common/auth.guard';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Unified catalogs — SINGLE SOURCE OF TRUTH:
 * - insurance: live DB (insurancecompanies + insurance_networks with tiers),
 *   managed via admin insurance-companies page. Static JSON is fallback only.
 * - labs/radiology/nursing: dynamic DB via their service endpoints
 *   (/labs/services, /radiology/services, /nursing/catalog) + admin
 *   catalog-manager — no static snapshot here to avoid fragmentation.
 */
const CATALOGS = ['insurance'] as const;

@Controller('catalogs')
export class CatalogsController {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  @Public()
  @Get(':type')
  async getCatalog(@Param('type') type: string) {
    if (!CATALOGS.includes(type as any)) throw new NotFoundException('catalog_not_found');
    if (type === 'insurance') return this.insuranceCatalog();
    throw new NotFoundException('catalog_not_found');
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
    const file = path.join(__dirname, '../../constants/catalogs', 'insurance.json');
    const alt = path.join(process.cwd(), 'src/constants/catalogs', 'insurance.json');
    const p = fs.existsSync(file) ? file : alt;
    if (!fs.existsSync(p)) throw new NotFoundException('catalog_unavailable');
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  }
}
