/**
 * The numbered placeholder districts of the central seed ("Al Khozama District" is real; "Central City 1 District 7" / «حي مدينة وسطى 1 7» is not).
 * Owner decision 2026-10-26: fake rows are deleted and what is missing is completed. Before one is deleted, every reference to it is
 * re-pointed to the nearest REAL district of the same city (by the reference's own point against the real districts' centroids), or cleared
 * when it has no point: a district is never guessed.
 */
export interface DistrictRow { code: string; name_ar?: string; name_en?: string; type?: string; parent_code?: string | null; is_active?: boolean; coordinates?: { lat?: number; lng?: number } | null }

/** "… District 7" and «… 7»: both names end in a number, the way the generator wrote them. */
export const isNumberedDistrict = (r: Pick<DistrictRow, 'name_ar' | 'name_en' | 'type'>): boolean =>
  r.type === 'district' && /\sDistrict \d+$/.test(String(r.name_en ?? '')) && /\s\d+$/.test(String(r.name_ar ?? ''));

/** Where a district is written as text, with where the same record keeps its point (first pair that holds two numbers wins). */
export interface DistrictReferenceField {
  collection: string;
  /** the array of sub-documents that holds the district (patient addresses), else absent */
  array?: string;
  /** path of the district text, inside the sub-document when `array` is set */
  district: string;
  /** candidate paths of the point, inside the sub-document when `array` is set */
  points: ReadonlyArray<{ lat: string; lng: string }>;
}

export const DISTRICT_REFERENCE_FIELDS: readonly DistrictReferenceField[] = [
  { collection: 'patient_profiles', array: 'addresses', district: 'district', points: [{ lat: 'lat', lng: 'lng' }] },
  { collection: 'orders', district: 'address.district', points: [{ lat: 'address.lat', lng: 'address.lng' }] },
  { collection: 'provider_profiles', district: 'district', points: [{ lat: 'location.lat', lng: 'location.lng' }, { lat: 'geo.lat', lng: 'geo.lng' }] },
  { collection: 'facilities', district: 'district', points: [{ lat: 'location.lat', lng: 'location.lng' }] },
  { collection: 'provider_branches', district: 'district', points: [{ lat: 'location.lat', lng: 'location.lng' }, { lat: 'lat', lng: 'lng' }] },
  { collection: 'hospital_branches', district: 'district', points: [{ lat: 'location.lat', lng: 'location.lng' }, { lat: 'lat', lng: 'lng' }] },
];

export const getPath = (obj: unknown, path: string): unknown => path.split('.').reduce<any>((v, k) => (v == null ? undefined : v[k]), obj);

/** The record's point, from the first candidate path pair that holds two finite numbers (inside the kingdom's box). */
export function pointOfRecord(rec: unknown, points: DistrictReferenceField['points']): { lat: number; lng: number } | null {
  for (const p of points) {
    const lat = getPath(rec, p.lat); const lng = getPath(rec, p.lng);
    if (typeof lat === 'number' && typeof lng === 'number' && Number.isFinite(lat) && Number.isFinite(lng) && lat >= 16 && lat <= 32.5 && lng >= 34 && lng <= 56) return { lat, lng };
  }
  return null;
}

const rad = (d: number) => (d * Math.PI) / 180;
export function distanceKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }): number {
  const h = Math.sin(rad(b.lat - a.lat) / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lng - a.lng) / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** The real district whose centroid is nearest to the point; ties go to the lower code, so a plan is the same every time. */
export function nearestDistrict<T extends DistrictRow>(point: { lat: number; lng: number }, candidates: readonly T[]): T | null {
  let best: { row: T; km: number } | null = null;
  for (const row of candidates) {
    const c = row.coordinates;
    if (!c || typeof c.lat !== 'number' || typeof c.lng !== 'number') continue;
    const km = distanceKm(point, { lat: c.lat, lng: c.lng });
    if (!best || km < best.km || (km === best.km && row.code < best.row.code)) best = { row, km };
  }
  return best ? best.row : null;
}
