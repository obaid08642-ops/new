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
      const count = await this.locationModel.countDocuments();
      if (count === 0) {
        this.logger.log(`Seeding initial ${SAUDI_LOCATIONS_SEED.length} verified Saudi locations...`);
        for (const loc of SAUDI_LOCATIONS_SEED) {
          await this.locationModel.updateOne(
            { code: loc.code },
            { $set: loc },
            { upsert: true },
          );
        }
        this.logger.log('Saudi locations seeded successfully.');
      }
    } catch (err: any) {
      this.logger.warn(`Failed to seed locations: ${err?.message}`);
    }
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

    // Check districts first (most specific)
    for (const loc of allLocations) {
      if (loc.type === 'district') {
        for (const alias of loc.aliases || []) {
          const normAlias = normalizeSearchText(alias);
          if (normalized.includes(normAlias)) {
            matchedDistrict = loc as Location;
            matchedAlias = alias;
            break;
          }
        }
        if (matchedDistrict) break;
      }
    }

    // Check cities
    for (const loc of allLocations) {
      if (loc.type === 'city') {
        for (const alias of loc.aliases || []) {
          const normAlias = normalizeSearchText(alias);
          if (normalized.includes(normAlias)) {
            matchedCity = loc as Location;
            if (!matchedAlias) matchedAlias = alias;
            break;
          }
        }
        if (matchedCity) break;
      }
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
