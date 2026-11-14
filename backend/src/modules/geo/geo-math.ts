/** Pure helpers for the reverse geocoder (distances, the cache grid, the service area). */
export type Point = { lat: number; lng: number };

const EARTH_M = 6_371_000;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in metres. */
export function haversineM(a: Point, b: Point): number {
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The kingdom's bounding box, generous at the edges: a point outside it is refused before any provider is asked. */
export const SAUDI_BOUNDS = { minLat: 16, maxLat: 32.5, minLng: 34, maxLng: 56 } as const;
export function inServiceArea(p: Point): boolean {
  return p.lat >= SAUDI_BOUNDS.minLat && p.lat <= SAUDI_BOUNDS.maxLat && p.lng >= SAUDI_BOUNDS.minLng && p.lng <= SAUDI_BOUNDS.maxLng;
}

/** 0.0005 degrees: about 55 m of latitude and about 50 m of longitude at 24 N. Nearby taps share one cache entry. */
export const CACHE_GRID_DEG = 0.0005;
export function cacheKey(p: Point): string {
  const q = (v: number) => Math.round(v / CACHE_GRID_DEG);
  return `geo:rev:v1:${q(p.lat)}:${q(p.lng)}`;
}

export type Located<T> = T & { coordinates?: Point | null };

/** The closest item that has coordinates and lies within `maxM`; ties keep the first. */
export function nearest<T extends { coordinates?: { lat?: number; lng?: number } | null }>(p: Point, items: T[], maxM: number): { item: T; distanceM: number } | null {
  let best: { item: T; distanceM: number } | null = null;
  for (const item of items) {
    const c = item.coordinates;
    if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') continue;
    const d = haversineM(p, { lat: c.lat, lng: c.lng });
    if (d <= maxM && (!best || d < best.distanceM)) best = { item, distanceM: d };
  }
  return best;
}
