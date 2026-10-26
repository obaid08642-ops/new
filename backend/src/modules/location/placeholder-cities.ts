/**
 * Placeholder and suspect city rows of the central seed (owner decision 2026-10-26): they must never show to users, and they are
 * never deleted. They are set inactive (`is_active=false`, with their districts), after a reference check; the plan prints the counts.
 *
 * Reference check: the clients store a city as TEXT (the Arabic or English name, sometimes the code), so a row is "referenced" when
 * an address, provider, facility, branch or order holds one of the row's three spellings. A placeholder that is referenced is NOT
 * deactivated by the plan (it is listed instead), so no one is left pointing at a hidden city.
 */

/** `sa-central-city-1..12` and the nine `*-new` rows: invented names, no real place behind them. */
export const PLACEHOLDER_CITY_CODES: readonly string[] = [
  ...Array.from({ length: 12 }, (_, i) => `sa-central-city-${i + 1}`),
  'sa-al-kharj-new', 'sa-jeddah-new', 'sa-makkah-new', 'sa-dammam-new', 'sa-khobar-new',
  'sa-abha-new', 'sa-jazan-new', 'sa-tabuk-new', 'sa-arar-new',
];

/** A suspect row and what happens to it. `into` is the city that now carries its references (the row itself goes inactive). */
export interface SuspectRule { code: string; action: 'merge' | 'inactive'; into?: string; reason: string }

export const SUSPECT_CITY_RULES: readonly SuspectRule[] = [
  { code: 'sa-duba3', action: 'merge', into: 'sa-duba', reason: 'duplicate of sa-duba' },
  { code: 'sa-al-many', action: 'inactive', reason: 'broken name ("ال many"); no matching place in OpenStreetMap' },
  { code: 'sa-al-umran', action: 'merge', into: 'sa-al-ahsa', reason: 'a district of Al-Ahsa (sa-al-ahsa-035 already exists)' },
  { code: 'sa-al-taraf', action: 'merge', into: 'sa-al-ahsa', reason: 'a district of Al-Ahsa (sa-al-ahsa-034 already exists)' },
];

/** Left as they are, listed in the plan: no governorate boundary centre is available to the apply. */
export const LISTED_ONLY_CITY_CODES: readonly string[] = ['sa-sudair', 'sa-yanbu-al-nakhal'];

/** Where a city name is stored as text: top-level fields, and fields inside an array of sub-documents. */
export const CITY_REFERENCE_FIELDS: ReadonlyArray<{ collection: string; path: string; array?: boolean }> = [
  { collection: 'patient_profiles', path: 'addresses', array: true },
  { collection: 'users', path: 'city' },
  { collection: 'provider_profiles', path: 'city' },
  { collection: 'facilities', path: 'city' },
  { collection: 'provider_branches', path: 'city' },
  { collection: 'hospital_branches', path: 'city' },
  { collection: 'orders', path: 'address.city' },
];

export interface LocationRow { code: string; name_ar?: string; name_en?: string; type?: string; parent_code?: string | null; is_active?: boolean }

/** The spellings a client may hold for a city row. */
export const spellingsOf = (row: LocationRow): string[] => [row.code, row.name_ar, row.name_en].filter((v): v is string => typeof v === 'string' && v.trim() !== '');

/** Every code to deactivate for a root city: the root and the districts hanging under it (one level, as the seed has). */
export function withDistricts(rootCodes: readonly string[], rows: LocationRow[]): string[] {
  const roots = new Set(rootCodes);
  return rows.filter((r) => roots.has(r.code) || (r.parent_code != null && roots.has(r.parent_code))).map((r) => r.code);
}
