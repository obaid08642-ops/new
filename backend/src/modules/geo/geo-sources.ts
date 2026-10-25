import { Injectable, Logger } from '@nestjs/common';
import { externalFetch } from '../../common/external-call';
import { parseGeocodedAddress } from '../../common/national-address';
import { RedisService } from '../redis/redis.service';
import type { Point } from './geo-math';

/** What a source says about a point, before it is matched to OUR cities and districts. Every field is optional. */
export interface RawAddress {
  source: 'spl' | 'osm';
  city?: string;
  district?: string;
  street?: string;
  building_no?: string;
  postal_code?: string;
  short_address?: string;
}

export type SourceOutcome = { outcome: 'found'; address: RawAddress } | { outcome: 'none' } | { outcome: 'unavailable' };

const TIMEOUT_MS = 5000;

/**
 * Saudi National Address (Saudi Post / SPL) by coordinates: `GET .../NationalAddress/v3.1/address/address-geocode?lat=&long=&api_key=`
 * (checked on api.address.gov.sa/addressgeocode on 2026-10-25: lat and long in decimal degrees, `format=JSON`, `encode=utf8`, the key as
 * the `api_key` query parameter). The key is the owner's, set on the server (SPL_API_KEY), never in the repo.
 *   SPL_GEOCODE_URL  optional template with {lat} {lng} {key}; default is the documented address when SPL_API_KEY is set.
 * The Starter tier allows 5 calls/minute and 100/week, which is why every answer is cached for 30 days and OSM is the fallback.
 */
@Injectable()
export class SplGeocodeSource {
  private readonly logger = new Logger(SplGeocodeSource.name);

  configured(): boolean {
    return Boolean((process.env.SPL_GEOCODE_URL || '').trim() || (process.env.SPL_API_KEY || '').trim());
  }

  async reverse(p: Point): Promise<SourceOutcome> {
    if (!this.configured()) return { outcome: 'unavailable' };
    const template = (process.env.SPL_GEOCODE_URL || '').trim()
      || 'https://apina.address.gov.sa/NationalAddress/v3.1/address/address-geocode?format=JSON&encode=utf8&lat={lat}&long={lng}&api_key={key}';
    try {
      const url = template
        .replace('{lat}', encodeURIComponent(String(p.lat)))
        .replace('{lng}', encodeURIComponent(String(p.lng)))
        .replace('{key}', encodeURIComponent(process.env.SPL_API_KEY || ''));
      const res = await externalFetch(url, { headers: { Accept: 'application/json' } }, TIMEOUT_MS);
      if (res.status === 404) return { outcome: 'none' };
      if (!res.ok) return { outcome: 'unavailable' };
      const a = parseGeocodedAddress(await res.json());
      if (!a) return { outcome: 'none' };
      return {
        outcome: 'found',
        address: { source: 'spl', city: a.city, district: a.district, street: a.street, building_no: a.building_number, postal_code: a.post_code, short_address: a.short_address || undefined },
      };
    } catch (e: any) {
      this.logger.warn(`SPL reverse failed: ${e?.message || e}`);
      return { outcome: 'unavailable' };
    }
  }
}

/** The usage policy of nominatim.openstreetmap.org: one request per second at most, an identifying User-Agent, cached answers. */
export const NOMINATIM_MIN_GAP_MS = 1100;
const NOMINATIM_SLOT_KEY = 'geo:nominatim:slot';

/**
 * OpenStreetMap Nominatim, only through this backend, never from a client. A request waits for the one-second slot (shared by every
 * API node through Redis `SET NX PX`); when no slot frees up within the wait, the source is `unavailable` instead of queueing.
 *   GEO_USER_AGENT  identifying User-Agent (default names the service and its site)
 *   NOMINATIM_URL   base URL (default the public instance)
 */
@Injectable()
export class NominatimSource {
  private readonly logger = new Logger(NominatimSource.name);
  private lastLocal = 0;

  constructor(private readonly redis: RedisService) {}

  private async slot(maxWaitMs = 3000): Promise<boolean> {
    const until = Date.now() + maxWaitMs;
    for (;;) {
      const sinceLocal = Date.now() - this.lastLocal;
      if (sinceLocal >= NOMINATIM_MIN_GAP_MS) {
        const client = this.redis.getClient();
        const got = await client.set(NOMINATIM_SLOT_KEY, '1', 'PX', NOMINATIM_MIN_GAP_MS, 'NX').catch(() => 'OK');
        if (got === 'OK') { this.lastLocal = Date.now(); return true; }
      }
      if (Date.now() >= until) return false;
      await new Promise((r) => setTimeout(r, 120));
    }
  }

  async reverse(p: Point): Promise<SourceOutcome> {
    if (!(await this.slot())) return { outcome: 'unavailable' };
    const base = (process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org').replace(/\/+$/, '');
    const ua = (process.env.GEO_USER_AGENT || 'NabdPlus-backend/1.0 (+https://nabd.plus)').slice(0, 200);
    try {
      const url = `${base}/reverse?format=jsonv2&addressdetails=1&zoom=18&accept-language=ar&lat=${encodeURIComponent(String(p.lat))}&lon=${encodeURIComponent(String(p.lng))}`;
      const res = await externalFetch(url, { headers: { Accept: 'application/json', 'User-Agent': ua } }, TIMEOUT_MS);
      if (!res.ok) return { outcome: 'unavailable' };
      const body: any = await res.json();
      if (!body || body.error || typeof body.address !== 'object' || !body.address) return { outcome: 'none' };
      const a = body.address as Record<string, unknown>;
      const t = (v: unknown, max = 120) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : undefined);
      const address: RawAddress = {
        source: 'osm',
        city: t(a.city) ?? t(a.town) ?? t(a.village) ?? t(a.municipality) ?? t(a.county),
        district: t(a.suburb) ?? t(a.neighbourhood) ?? t(a.city_district) ?? t(a.quarter),
        street: t(a.road),
        building_no: t(a.house_number, 8),
        postal_code: t(a.postcode, 8),
      };
      const any = Object.values(address).some((v, i) => i > 0 && v !== undefined);
      return any ? { outcome: 'found', address } : { outcome: 'none' };
    } catch (e: any) {
      this.logger.warn(`Nominatim reverse failed: ${e?.message || e}`);
      return { outcome: 'unavailable' };
    }
  }
}
