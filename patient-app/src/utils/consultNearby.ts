/**
 * The consultations hub's two quick filters, "Nearest" and "Available now" (owner decision, Batch 2). They are answered
 * by the public doctor search `GET /care/doctors` (backend Q-12 / Q-13), not by the plain `GET /providers?type=doctor`
 * listing, which ignores them:
 *
 *   Nearest        -> sort=distance&lat=&lng= (device position); with no position the saved city is sent as the
 *                     city filter (the server's own city fallback needs a signed-in user with a city, so the client
 *                     sends the city itself). For clinic and home-visit only: the server rejects it for video.
 *   Available now  -> available_within=15 (whole minutes, > 0) with type=clinic|video|home_visit (required by the
 *                     server). The server orders by the earliest free slot; with "Nearest" too (clinic and home visit)
 *                     the position is sent and the free doctors come nearest first (2-app#10).
 *
 * "Available today" is a sort, not a filter (owner decision 2026-10-24): sort=available_today, today's free doctors first and
 * then the soonest next slot. It is the default when the patient arrives from a "book now" entry (BOOK_NOW_HREF). "Nearest"
 * wins when both are on, because a distance order cannot also be an availability order.
 *
 * Both controls are always on (decision 20, issue 339). With neither filter active the path is exactly
 * `/providers?type=doctor`.
 */

/** The academic grades GET /care/doctors?degree= knows (the same list as the web's filter). */
export const DOCTOR_DEGREES = ['professor', 'consultant', 'senior_specialist', 'specialist', 'resident', 'general_practitioner'] as const;
export type DoctorDegree = (typeof DOCTOR_DEGREES)[number];

export type NearbyMode = 'clinic' | 'home' | 'online';
export type NearbyPlace = { kind: 'coords'; lat: number; lng: number } | { kind: 'city'; city: string };

export const DOCTORS_PATH = '/providers?type=doctor';
export const CARE_DOCTORS_PATH = '/care/doctors';
/** The entry of every "book now" button: the doctors hub with the "available today" sort preselected. */
export const BOOK_NOW_HREF = '/(tabs)/consultations?sort=available_today';
/** "Available now" means a doctor with a free slot within this many minutes. */
export const AVAILABLE_WITHIN_MINUTES = 15;

/** "Nearest" is for a doctor the patient goes to, or who comes to the patient: never an online consultation. */
export const nearestApplies = (mode: NearbyMode): boolean => mode !== 'online';

const finite = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);

/** The `type` value the doctor search expects for each visit mode. */
export const careType = (mode: NearbyMode): 'clinic' | 'video' | 'home_visit' => (mode === 'online' ? 'video' : mode === 'home' ? 'home_visit' : 'clinic');

/**
 * The hub's doctor request. `place` is what "Nearest" needs (null: the patient's place is not known, so nothing is
 * sent for it). With neither filter active the path is the plain one.
 */
export function buildDoctorsPath(opts: { mode: NearbyMode; nearest: boolean; availableNow: boolean; place: NearbyPlace | null; availableToday?: boolean; degree?: DoctorDegree | null }): string {
  const nearest = opts.nearest && nearestApplies(opts.mode) && opts.place !== null;
  const today = opts.availableToday === true && !nearest;
  const degree = opts.degree && (DOCTOR_DEGREES as readonly string[]).includes(opts.degree) ? opts.degree : null;
  if (!nearest && !opts.availableNow && !today && !degree) return DOCTORS_PATH;
  const parts: string[] = [`type=${careType(opts.mode)}`];
  if (degree) parts.push(`degree=${degree}`);
  if (today) parts.push('sort=available_today');
  if (opts.availableNow) parts.push(`available_within=${AVAILABLE_WITHIN_MINUTES}`);
  if (nearest && opts.place) {
    if (opts.place.kind === 'coords') {
      if (finite(opts.place.lat) && finite(opts.place.lng)) parts.push('sort=distance', `lat=${opts.place.lat}`, `lng=${opts.place.lng}`);
    } else if (opts.place.city.trim()) {
      parts.push(`city=${encodeURIComponent(opts.place.city.trim())}`);
    }
  }
  return `${CARE_DOCTORS_PATH}?${parts.join('&')}`;
}

/** True when the server decides the order (distance, or earliest free slot): the screen then keeps it. */
export const keepsServerOrder = (path: string): boolean => path.startsWith(CARE_DOCTORS_PATH) && /[?&](sort=distance|sort=available_today|available_within=)/.test(path);

/** True when the request asks the server for the distance order. */
export const sortsByDistance = (path: string): boolean => path.includes('&sort=distance');

/** The doctor rows of either response: the plain array of /providers, or `{ items }` of /care/doctors. */
export function doctorRows<T>(data: unknown): T[] {
  if (Array.isArray(data)) return data as T[];
  const items = (data as { items?: unknown } | null)?.items;
  return Array.isArray(items) ? (items as T[]) : [];
}

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
