/**
 * Design parity (#1819): the nurse list's extra filters (nationality, available now) and the nearest-first order with
 * distance_km. Values are coerced to plain strings/numbers here; nothing else of the query reaches Mongo.
 */
export interface NurseListQuery {
  nationality?: unknown;
  available?: unknown;
  sort?: unknown;
  lat?: unknown;
  lng?: unknown;
}

const str = (v: unknown, max: number): string => (typeof v === 'string' ? v.replace(/[\u0000-\u001F\u007F-\u009F]/g, '').trim().slice(0, max) : '');
const coord = (v: unknown, lim: number): number | null => {
  const n = typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
  return Number.isFinite(n) && Math.abs(n) <= lim ? n : null;
};

/**
 * Whole-value match that ignores case. The stored nationality and gender are free text ("Saudi", "saudi", "SAUDI"), and the
 * clients spell them differently, so an exact $eq missed profiles. The text is escaped: nothing the caller sends is a pattern.
 */
export const caseInsensitiveEq = (value: string): { $regex: RegExp } => ({ $regex: new RegExp(`^${value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i') });

/** Clauses to merge into the profile filter. */
export function nurseFilterClauses(q: NurseListQuery): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  const nationality = str(q?.nationality, 60);
  // the clients send `nationality=any` (and `availability=any`) for "no filter": that is not a nationality to match
  if (nationality && !/^(any|all)$/i.test(nationality)) out.nationality = caseInsensitiveEq(nationality);
  if (q?.available === 'true') out['availability.accepting'] = { $ne: false };
  return out;
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = (d: number) => (d * Math.PI) / 180;
  const a = Math.sin(rad(lat2 - lat1) / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(rad(lng2 - lng1) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(a));
}

/** The patient's point when sort=nearest and a valid lat/lng were sent, else null (nearest is then not applied). */
export function nearestOrigin(q: NurseListQuery): { lat: number; lng: number } | null {
  if (q?.sort !== 'nearest') return null;
  const lat = coord(q.lat, 90);
  const lng = coord(q.lng, 180);
  return lat === null || lng === null ? null : { lat, lng };
}

/** Distance in km (one decimal) from the origin to the profile's stored point, null when the profile has none. */
export function distanceKmTo(profile: any, origin: { lat: number; lng: number }): number | null {
  const loc = profile?.location;
  if (!loc || typeof loc.lat !== 'number' || typeof loc.lng !== 'number' || !Number.isFinite(loc.lat) || !Number.isFinite(loc.lng)) return null;
  return Math.round(haversineKm(origin.lat, origin.lng, loc.lat, loc.lng) * 10) / 10;
}
