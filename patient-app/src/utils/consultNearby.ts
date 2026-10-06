/**
 * The consultations hub's two quick filters, "Nearest" and "Available now" (owner decision, Batch 2), as query params of
 * the hub's doctor call (GET /providers?type=doctor):
 *
 *   Nearest        -> sort=distance with the patient's lat/lng, or with the saved city when the location is not
 *                     available; for clinic and home-visit consultations only, never online/video.
 *   Available now  -> available_within=15 (minutes).
 *
 * Both controls are behind EXPO_PUBLIC_CONSULT_NEARBY_FILTERS=1 (default off) until the doctor search accepts these
 * params. With the flag off nothing here changes the call: the path is exactly `/providers?type=doctor`.
 */

export type NearbyMode = 'clinic' | 'home' | 'online';
export type NearbyPlace = { kind: 'coords'; lat: number; lng: number } | { kind: 'city'; city: string };

export const DOCTORS_PATH = '/providers?type=doctor';
/** "Available now" means a doctor with a free slot within this many minutes. */
export const AVAILABLE_WITHIN_MINUTES = 15;

/** Read at call time (not at import) so a test or a build can set it; only the exact value `1` turns the controls on. */
export const nearbyFiltersEnabled = (): boolean => process.env.EXPO_PUBLIC_CONSULT_NEARBY_FILTERS === '1';

/** "Nearest" is for a doctor the patient goes to, or who comes to the patient: never an online consultation. */
export const nearestApplies = (mode: NearbyMode): boolean => mode !== 'online';

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/**
 * The hub's doctor request. `place` is what "Nearest" needs (null: the patient's place is not known, so the sort is not
 * sent). With the flag off the path is the plain one, whatever the other arguments are.
 */
export function buildDoctorsPath(opts: { enabled?: boolean; mode: NearbyMode; nearest: boolean; availableNow: boolean; place: NearbyPlace | null }): string {
  const enabled = opts.enabled ?? nearbyFiltersEnabled();
  if (!enabled) return DOCTORS_PATH;
  const parts = [DOCTORS_PATH];
  if (opts.nearest && nearestApplies(opts.mode) && opts.place) {
    parts.push('sort=distance');
    if (opts.place.kind === 'coords') {
      if (finite(opts.place.lat) && finite(opts.place.lng)) parts.push(`lat=${opts.place.lat}`, `lng=${opts.place.lng}`);
    } else if (opts.place.city.trim()) {
      parts.push(`city=${encodeURIComponent(opts.place.city.trim())}`);
    }
  }
  if (opts.availableNow) parts.push(`available_within=${AVAILABLE_WITHIN_MINUTES}`);
  return parts.join('&');
}

/** True when the request asks the server for the distance order (the screen then keeps the server's order). */
export const sortsByDistance = (path: string): boolean => path.includes('&sort=distance');

export interface NearbyDeps {
  /** The device position, or null when the permission is denied or the position cannot be read. */
  deviceCoords: () => Promise<{ lat: number; lng: number } | null>;
  /** The city of the patient's saved address (the one the app already reads), if any. */
  savedCity: () => Promise<string | undefined>;
}

/**
 * Where "Nearest" measures from: the device position when the patient allows it, else the city of the saved
 * address/profile; null when there is neither (the control then stays off with a hint). Nothing is invented.
 */
export async function resolveNearbyPlace(deps: NearbyDeps): Promise<NearbyPlace | null> {
  try {
    const here = await deps.deviceCoords();
    if (here && finite(here.lat) && finite(here.lng)) return { kind: 'coords', lat: here.lat, lng: here.lng };
  } catch {
    // denied or unavailable: fall through to the city
  }
  try {
    const city = (await deps.savedCity())?.trim();
    if (city) return { kind: 'city', city };
  } catch {
    // no saved address readable: no place
  }
  return null;
}
