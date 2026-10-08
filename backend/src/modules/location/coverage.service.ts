import { Injectable } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';
import { pointInPolygon, GeoPoint } from './service-area.service';

export interface AreaCoverage {
  areaCode: string;
  areaNameEn: string;
  cityCode: string;
  providers: number;
  byType: Record<string, number>;
  covered: boolean;
}

/**
 * P22.16 — provider coverage for the admin map, from real data.
 * A provider covers an area when: its service_area_cities includes the
 * area's city, OR its city/address.city matches, OR its geo point falls
 * inside the area polygon. Duck-types both profile shapes (module-local
 * geo/address and legacy service_area_cities/city).
 */
@Injectable()
export class CoverageService {
  constructor(@InjectConnection() private readonly conn: Connection) {}

  async byCity(cityCode: string): Promise<AreaCoverage[]> {
    const city = String(cityCode);
    const [areas, profiles] = await Promise.all([
      this.conn.collection('service_areas').find({ city_code: { $eq: city }, active: { $eq: true } }).limit(500).toArray(),
      this.conn.collection('provider_profiles').find({}).limit(20000).toArray(),
    ]);
    const profs = profiles as unknown as Array<Record<string, unknown>>;
    const matchesCity = (p: Record<string, unknown>): boolean => {
      const cities = p['service_area_cities'];
      if (Array.isArray(cities) && (cities as unknown[]).map(String).includes(city)) return true;
      if (String(p['city'] || '') === city) return true;
      const addr = p['address'] as Record<string, unknown> | undefined;
      if (addr && String(addr['city'] || '') === city) return true;
      return false;
    };
    const inArea = (p: Record<string, unknown>, polygon: GeoPoint[]): boolean => {
      const geo = p['geo'] as Record<string, unknown> | undefined;
      const lat = Number(geo?.['lat']);
      const lng = Number(geo?.['lng']);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
      return pointInPolygon({ lat, lng }, polygon);
    };
    return (areas as unknown as Array<Record<string, unknown>>).map((a) => {
      const polygon = ((a['polygon'] as unknown[]) || []).map((pt) => {
        const o = pt as Record<string, unknown>;
        return { lat: Number(o['lat']), lng: Number(o['lng']) };
      });
      const matched = profs.filter((p) => matchesCity(p) || inArea(p, polygon));
      const byType: Record<string, number> = {};
      for (const m of matched) {
        const t = String(m['provider_type'] || 'unknown');
        byType[t] = (byType[t] || 0) + 1;
      }
      return {
        areaCode: String(a['code']),
        areaNameEn: String(a['name_en']),
        cityCode: city,
        providers: matched.length,
        byType,
        covered: matched.length > 0,
      };
    });
  }

  async citySummary(cityCode: string): Promise<{ cityCode: string; areas: number; providers: number; byType: Record<string, number>; uncoveredAreas: string[] }> {
    const rows = await this.byCity(cityCode);
    const byType: Record<string, number> = {};
    for (const r of rows) {
      for (const [t, n] of Object.entries(r.byType)) byType[t] = (byType[t] || 0) + n;
    }
    // distinct providers across areas need profile ids — recompute cheaply:
    const profiles = (await this.conn.collection('provider_profiles').find({}).limit(20000).toArray()) as unknown as Array<
      Record<string, unknown>
    >;
    const city = String(cityCode);
    const matchedIds = new Set(
      profiles
        .filter((p) => {
          const cities = p['service_area_cities'];
          if (Array.isArray(cities) && (cities as unknown[]).map(String).includes(city)) return true;
          if (String(p['city'] || '') === city) return true;
          const addr = p['address'] as Record<string, unknown> | undefined;
          return !!addr && String(addr['city'] || '') === city;
        })
        .map((p) => String(p['account_id'] || p['id'])),
    );
    return {
      cityCode: city,
      areas: rows.length,
      providers: matchedIds.size,
      byType,
      uncoveredAreas: rows.filter((r) => !r.covered).map((r) => r.areaCode),
    };
  }
}
