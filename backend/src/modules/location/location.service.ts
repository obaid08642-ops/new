import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument, LocationType } from './schemas/location.schema';
import { SAUDI_LOCATIONS_SEED, SeedLocation } from './seeds/saudi-locations.data';
import { normalizeSearchText } from '../seo-search/seo-search.module';

export interface ResolvedLocation {
  city?: Location;
  district?: Location;
  region?: Location;
  matched_alias?: string;
}

/** P13-R11: one row of a verified official extract (superset-compatible with SeedLocation). */
export interface ImportLocationRow {
  code: string;
  name_ar: string;
  name_en: string;
  type: string;
  parent_code?: string | null;
  aliases?: string[];
  coordinates?: { lat: number; lng: number };
  coverage?: { pharmacy_delivery: boolean; home_healthcare: boolean; lab_collection: boolean };
  is_active?: boolean;
}

@Injectable()
export class LocationService implements OnModuleInit {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectModel(Location.name) private readonly locationModel: Model<LocationDocument>,
  ) {}

  async onModuleInit() {
    setImmediate(() =>
      this.seedInitialLocations().catch((e: any) =>
        this.logger.warn(`Background location seed failed: ${e?.message}`),
      ),
    );
  }

  async seedInitialLocations(): Promise<void> {
    try {
      // Insert-only: never overwrite admin edits
      this.logger.log(`Upserting ${SAUDI_LOCATIONS_SEED.length} Saudi locations (central geo)...`);
      for (const loc of SAUDI_LOCATIONS_SEED) {
        await this.locationModel.updateOne(
          { code: loc.code },
          // names are Arabic and English only (owner, 2026-10-25); a row already in the database is never touched
          { $setOnInsert: { ...loc } },
          { upsert: true },
        );
      }
      // Deactivate anything Saudi not in the central seed (old duplicate IDs with
      // spaces/-x/-new suffixes + 3 legacy admin regions) so the API exposes
      // exactly the 5 macro regions / 150 cities / 2000 districts.
      const seedCodes = new Set(SAUDI_LOCATIONS_SEED.map((l) => l.code));
      const seedCityCodes = new Set(
        SAUDI_LOCATIONS_SEED.filter((l) => l.type === 'city').map((l) => l.code),
      );
      await this.locationModel.updateMany(
        { code: { $regex: '^sa-', $nin: Array.from(seedCodes) } },
        { $set: { is_active: false } },
      ).catch(() => null);
      await this.locationModel.updateMany(
        { type: 'district', parent_code: { $nin: Array.from(seedCityCodes) } },
        { $set: { is_active: false } },
      ).catch(() => null);
      this.logger.log('Saudi locations upserted successfully.');
    } catch (err: any) {
      this.logger.warn(`Failed to seed locations: ${err?.message}`);
    }
  }

  async getRegions(): Promise<Location[]> {
    return this.locationModel.find({ type: 'region', is_active: true }).sort({ name_ar: 1 }).lean();
  }

  /**
   * P13-R11: validated import pipeline for verified official extracts.
   * Every row is checked before anything is written: code shape, known type
   * (the fixed country root is never importable), non-empty names, sane
   * aliases, coordinates for city/district/sub_area, and a parent that exists
   * (in the DB or earlier in the same batch) with the matching parent type.
   * Accepted rows upsert without overwriting admin edits ($setOnInsert) and
   * are stamped with the extract source; rejected rows are reported, never
   * partially written. Re-importing the same extract is idempotent.
   */
  /** Row of a verified official extract (DTO-validated at the controller). */
  async importLocations(
    locations: ImportLocationRow[],
    source = 'admin',
  ): Promise<{ imported: number; rejected: Array<{ code: string; reason: string }>; source: string }> {
    const TYPE_RANK: Record<string, number> = { region: 0, city: 1, district: 2, sub_area: 3 };
    const EXPECTED_PARENT: Record<string, string> = { city: 'region', district: 'city', sub_area: 'district' };
    const now = new Date();
    const rejected: Array<{ code: string; reason: string }> = [];
    let imported = 0;
    const known = new Map<string, string>();
    const rows = Array.isArray(locations) ? [...locations] : [];
    rows.sort((a, b) => (TYPE_RANK[String(a?.type)] ?? 99) - (TYPE_RANK[String(b?.type)] ?? 99));

    const fail = (loc: any, reason: string) => {
      rejected.push({ code: String(loc?.code ?? ''), reason });
    };

    for (const loc of rows) {
      const code = String((loc as any)?.code ?? '');
      const type = String((loc as any)?.type ?? '');
      if (!/^[a-z0-9-]{1,80}$/.test(code)) { fail(loc, 'invalid_code'); continue; }
      if (type === 'country') { fail(loc, 'country_not_importable'); continue; }
      if (!(type in TYPE_RANK)) { fail(loc, 'invalid_type'); continue; }
      const nameAr = String((loc as any)?.name_ar ?? '').trim();
      const nameEn = String((loc as any)?.name_en ?? '').trim();
      if (!nameAr || !nameEn || nameAr.length > 200 || nameEn.length > 200) { fail(loc, 'name_required'); continue; }
      const aliases = (loc as any)?.aliases;
      if (aliases !== undefined && (!Array.isArray(aliases) || aliases.length > 20 ||
          aliases.some((a: any) => typeof a !== 'string' || !a.trim() || a.length > 80))) {
        fail(loc, 'invalid_aliases'); continue;
      }
      const coords = (loc as any)?.coordinates;
      const validCoords = coords !== undefined && coords !== null &&
        Number.isFinite(Number(coords.lat)) && Number(coords.lat) >= -90 && Number(coords.lat) <= 90 &&
        Number.isFinite(Number(coords.lng)) && Number(coords.lng) >= -180 && Number(coords.lng) <= 180;
      if (type !== 'region' && !validCoords) { fail(loc, 'coordinates_required'); continue; }
      if (coords !== undefined && coords !== null && !validCoords) { fail(loc, 'invalid_coordinates'); continue; }

      // Parent linkage: region hangs under the fixed country root; every
      // other row needs a parent of the matching type, from the DB or from
      // rows already accepted in this same batch.
      let parentCode: string | null = null;
      if (type === 'region') {
        const given = (loc as any)?.parent_code;
        if (given !== undefined && given !== null && String(given) !== 'sa') { fail(loc, 'region_parent_must_be_country'); continue; }
        parentCode = 'sa';
      } else {
        parentCode = String((loc as any)?.parent_code ?? '');
        if (!parentCode) { fail(loc, 'parent_required'); continue; }
        const expected = EXPECTED_PARENT[type];
        const batchParent = known.get(parentCode);
        if (batchParent === expected) {
          // accepted earlier in this batch — linkage holds.
        } else if (batchParent !== undefined) {
          fail(loc, 'parent_wrong_type'); continue;
        } else {
          const parent = await this.locationModel.findOne({ code: parentCode }).lean();
          if (!parent) { fail(loc, 'parent_not_found'); continue; }
          if (String((parent as any).type) !== expected) { fail(loc, 'parent_wrong_type'); continue; }
        }
      }

      await this.locationModel.updateOne(
        { code },
        {
          $setOnInsert: {
            code, name_ar: nameAr, name_en: nameEn, type,
            parent_code: parentCode,
            aliases: Array.isArray(aliases) ? aliases : [],
            ...(validCoords ? { coordinates: { lat: Number(coords.lat), lng: Number(coords.lng) } } : {}),
            is_active: true,
          },
          $set: { source, source_verified_at: now },
        },
        { upsert: true },
      );
      known.set(code, type);
      imported++;
    }
    return { imported, rejected, source };
  }

  /**
   * Resolve location entities from natural text (Arabic or English).
   */
  async resolveFromText(text: string): Promise<ResolvedLocation | null> {
    if (!text || text.trim().length < 2) return null;
    const normalized = normalizeSearchText(text);

    // Fetch active locations
    const allLocations = await this.locationModel.find({ is_active: true }).lean();

    let matchedDistrict: Location | undefined;
    let matchedCity: Location | undefined;
    let matchedRegion: Location | undefined;
    let matchedAlias: string | undefined;

    // Check districts first (most specific). Collect ALL district matches,
    // then prefer the one under an explicitly named city (e.g. 'الزهراء'
    // exists in Riyadh and Jeddah — 'بجدة' disambiguates). First in seed
    // order wins only when no city context exists.
    const candidatesOf = (loc: any): string[] => {
      const out = new Set<string>();
      const raws: string[] = [loc.name_ar, loc.name_en, ...(loc.aliases || [])];
      if (loc.type === 'district') {
        for (const r of [loc.name_ar, loc.name_en]) {
          const s = String(r || '').trim();
          const m = s.match(/^(حي|حارة|district)\s+(.*)$/i);
          if (m && m[2]) raws.push(m[2]);
        }
      }
      for (const raw of raws) {
        const n = normalizeSearchText(String(raw || ''));
        if (n && n.length >= 2) out.add(n);
      }
      return [...out];
    };
    const districtMatches: Array<{ loc: any; alias: string }> = [];
    for (const loc of allLocations) {
      if (loc.type === 'district') {
        for (const normAlias of candidatesOf(loc)) {
          if (normalized.includes(normAlias)) {
            districtMatches.push({ loc, alias: normAlias });
            break;
          }
        }
      }
    }

    // Check cities (names + aliases, same rule).
    for (const loc of allLocations) {
      if (loc.type === 'city') {
        for (const normAlias of candidatesOf(loc)) {
          if (normalized.includes(normAlias)) {
            matchedCity = loc as Location;
            if (!matchedAlias) matchedAlias = normAlias;
            break;
          }
        }
        if (matchedCity) break;
      }
    }

    // Prefer a district under the explicitly named city; otherwise first match.
    if (districtMatches.length) {
      const underCity = matchedCity
        ? districtMatches.find((m) => m.loc.parent_code === (matchedCity as Location).code)
        : undefined;
      const pick = underCity || districtMatches[0];
      matchedDistrict = pick.loc as Location;
      matchedAlias = pick.alias;
    }

    // If district matched, deduce parent city if city not explicitly named
    if (matchedDistrict && !matchedCity && matchedDistrict.parent_code) {
      const parentCity = allLocations.find(l => l.code === matchedDistrict!.parent_code);
      if (parentCity) matchedCity = parentCity as Location;
    }

    // Deduce parent region
    if (matchedCity && matchedCity.parent_code) {
      const parentRegion = allLocations.find(l => l.code === matchedCity!.parent_code);
      if (parentRegion) matchedRegion = parentRegion as Location;
    }

    if (!matchedDistrict && !matchedCity && !matchedRegion) {
      return null;
    }

    return {
      district: matchedDistrict,
      city: matchedCity,
      region: matchedRegion,
      matched_alias: matchedAlias,
    };
  }

  async getCities(): Promise<Location[]> {
    return this.locationModel.find({ type: 'city', is_active: true }).sort({ name_ar: 1 }).lean();
  }

  async getDistricts(cityCode?: string): Promise<Location[]> {
    const filter: any = { type: 'district', is_active: true };
    if (cityCode) filter.parent_code = cityCode;
    return this.locationModel.find(filter).sort({ name_ar: 1 }).lean();
  }

  async findByCode(code: string): Promise<Location | null> {
    return this.locationModel.findOne({ code, is_active: true }).lean();
  }
}
