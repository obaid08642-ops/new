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

@Injectable()
export class LocationService implements OnModuleInit {
  private readonly logger = new Logger(LocationService.name);

  constructor(
    @InjectModel(Location.name) private readonly locationModel: Model<LocationDocument>,
  ) {}

  async onModuleInit() {
    await this.seedInitialLocations();
  }

  async seedInitialLocations(): Promise<void> {
    try {
      // Always upsert — ensures new cities/districts (150/2000) are added on every deploy
      this.logger.log(`Upserting ${SAUDI_LOCATIONS_SEED.length} Saudi locations (central geo)...`);
      for (const loc of SAUDI_LOCATIONS_SEED) {
        await this.locationModel.updateOne(
          { code: loc.code },
          { $set: loc },
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
   * Bulk ingest or update location records (pipeline ready for external full datasets).
   */
  async importLocations(locations: SeedLocation[]): Promise<{ imported: number }> {
    let count = 0;
    for (const loc of locations) {
      await this.locationModel.updateOne(
        { code: loc.code },
        { $set: loc },
        { upsert: true },
      );
      count++;
    }
    return { imported: count };
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
