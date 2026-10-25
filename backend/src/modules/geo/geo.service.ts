import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Location, LocationDocument } from '../location/schemas/location.schema';
import { LocationService } from '../location/location.service';
import { RedisService } from '../redis/redis.service';
import { cacheKey, inServiceArea, nearest, type Point } from './geo-math';
import { NominatimSource, SplGeocodeSource, type RawAddress, type SourceOutcome } from './geo-sources';

/** The answer of GET /geo/reverse. `city_id` and `district_id` are always codes of OUR `locations` rows, or null. */
export interface ReverseResult {
  city_id: string | null;
  city_name_ar: string | null;
  city_name_en: string | null;
  district_id: string | null;
  district_name_ar: string | null;
  district_name_en: string | null;
  street: string | null;
  building_no: string | null;
  postal_code: string | null;
  short_address: string | null;
  source: 'spl' | 'osm';
}

export const CACHE_TTL_SECONDS = 30 * 24 * 60 * 60;
/** A district centroid further than this from the point is not "the district of the point". */
export const MAX_DISTRICT_M = 6000;
const INDEX_TTL_MS = 10 * 60 * 1000;

type Row = { code: string; name_ar: string; name_en: string; type: string; parent_code?: string | null; coordinates?: { lat?: number; lng?: number } | null };

/**
 * Coordinates to an address: Saudi National Address first, then OpenStreetMap (Nominatim) through this backend, then the point is
 * matched to the nearest of OUR district centroids so `district_id` is one of ours. Answers are cached by the point rounded to
 * about 50 m for 30 days (the SPL Starter tier is 5 calls/minute and 100/week). A source that could not answer is never cached.
 */
@Injectable()
export class GeoService {
  private index: { at: number; districts: Row[]; byCode: Map<string, Row> } | null = null;

  constructor(
    private readonly redis: RedisService,
    private readonly spl: SplGeocodeSource,
    private readonly osm: NominatimSource,
    private readonly locations: LocationService,
    @InjectModel(Location.name) private readonly locationModel: Model<LocationDocument>,
  ) {}

  private async loadIndex() {
    if (this.index && Date.now() - this.index.at < INDEX_TTL_MS) return this.index;
    const rows = (await this.locationModel
      .find({ type: { $in: ['city', 'district'] }, is_active: true }, { _id: 0, code: 1, name_ar: 1, name_en: 1, type: 1, parent_code: 1, coordinates: 1 })
      .lean()) as unknown as Row[];
    const byCode = new Map(rows.map((r) => [r.code, r]));
    this.index = { at: Date.now(), districts: rows.filter((r) => r.type === 'district'), byCode };
    return this.index;
  }

  /** Test seam / admin import: forget the district index so the next call reloads it. */
  resetIndex() { this.index = null; }

  async reverse(point: Point): Promise<ReverseResult> {
    if (!inServiceArea(point)) throw new BadRequestException('outside_service_area');
    const key = cacheKey(point);
    const hit = await this.redis.getJson<ReverseResult>(key).catch(() => null);
    if (hit) return hit;

    let raw: RawAddress | null = null;
    let unavailable = 0;
    const sources: Array<() => Promise<SourceOutcome>> = [() => this.spl.reverse(point), () => this.osm.reverse(point)];
    for (const ask of sources) {
      const out = await ask();
      if (out.outcome === 'found') { raw = out.address; break; }
      if (out.outcome === 'unavailable') unavailable += 1;
    }

    const ours = await this.matchOurs(point, raw);
    if (!raw && !ours.district) {
      // nothing from any source and no district of ours near the point
      if (unavailable === sources.length) throw new ServiceUnavailableException('geo_unavailable');
      throw new NotFoundException('address_not_found');
    }
    const result: ReverseResult = {
      city_id: ours.city?.code ?? null,
      city_name_ar: ours.city?.name_ar ?? null,
      city_name_en: ours.city?.name_en ?? null,
      district_id: ours.district?.code ?? null,
      district_name_ar: ours.district?.name_ar ?? null,
      district_name_en: ours.district?.name_en ?? null,
      street: raw?.street ?? null,
      building_no: raw?.building_no ?? null,
      postal_code: raw?.postal_code ?? null,
      short_address: raw?.short_address ?? null,
      source: raw?.source ?? 'osm',
    };
    // a degraded answer (a source was down, so only our centroid matched) is not kept for 30 days
    if (raw || unavailable === 0) await this.redis.setJson(key, result, CACHE_TTL_SECONDS).catch(() => undefined);
    return result;
  }

  /** The point against OUR rows: the nearest district centroid (preferring the city the source named), else the named district / city. */
  private async matchOurs(point: Point, raw: RawAddress | null): Promise<{ city?: Row; district?: Row }> {
    const { districts, byCode } = await this.loadIndex();
    const named = raw && (raw.district || raw.city)
      ? await this.locations.resolveFromText([raw.district, raw.city].filter(Boolean).join(' ')).catch(() => null)
      : null;
    const namedCity = named?.city?.code ? byCode.get(named.city.code) : undefined;

    let district: Row | undefined;
    const inCity = namedCity ? districts.filter((d) => d.parent_code === namedCity.code) : [];
    district = (inCity.length ? nearest(point, inCity, MAX_DISTRICT_M)?.item : undefined) ?? nearest(point, districts, MAX_DISTRICT_M)?.item;
    // no centroid close enough: fall back to the district the source named, if it is one of ours
    if (!district && named?.district?.code) district = byCode.get(named.district.code);

    const city = district?.parent_code ? byCode.get(district.parent_code) : namedCity;
    return { city, district };
  }
}
