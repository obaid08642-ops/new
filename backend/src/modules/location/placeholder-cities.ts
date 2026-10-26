/**
 * Placeholder and duplicate city rows of the central seed. Owner decision 2026-10-26 (replaces "inactive"): there are no real users
 * yet, so they are DELETED with their synthetic districts, after every reference is re-pointed to the right real city. The plan
 * prints the reference counts.
 *
 * Reference check: the clients store a city as TEXT (the Arabic or English name, sometimes the code), so a row is "referenced" when
 * an address, provider, facility, branch or order holds one of the row's three spellings.
 */

/**
 * What happens to a row before it is deleted. `into` is the real city that takes over its references (a city written as text in an
 * address, provider, facility, branch or order); a row with no real counterpart has its references re-pointed to the main city of its region (REGION_DEFAULT_CITY).
 */
export interface DeleteRule { code: string; into?: string; reason: string }

const NEW_ROWS: ReadonlyArray<[string, string]> = [
  ['sa-al-kharj-new', 'sa-al-kharj'], ['sa-jeddah-new', 'sa-jeddah'], ['sa-makkah-new', 'sa-makkah'], ['sa-dammam-new', 'sa-dammam'],
  ['sa-khobar-new', 'sa-al-khobar'], ['sa-abha-new', 'sa-abha'], ['sa-jazan-new', 'sa-jazan'], ['sa-tabuk-new', 'sa-tabuk'], ['sa-arar-new', 'sa-arar'],
];

export const DELETE_CITY_RULES: readonly DeleteRule[] = [
  ...Array.from({ length: 12 }, (_, i): DeleteRule => ({ code: `sa-central-city-${i + 1}`, reason: 'invented placeholder, no real place' })),
  ...NEW_ROWS.map(([code, into]): DeleteRule => ({ code, into, reason: 'placeholder copy of a real city' })),
  { code: 'sa-duba3', into: 'sa-duba', reason: 'duplicate of sa-duba' },
  { code: 'sa-al-many', reason: 'broken name ("ال many"); no matching place found' },
  { code: 'sa-al-umran', into: 'sa-al-ahsa', reason: 'a district of Al-Ahsa (sa-al-ahsa-035 exists)' },
  { code: 'sa-al-taraf', into: 'sa-al-ahsa', reason: 'a district of Al-Ahsa (sa-al-ahsa-034 exists)' },
];

/**
 * A placeholder with no real counterpart that something still references is re-pointed to the main city of its own macro region (the
 * references carry no coordinates the plan could use), and the plan lists it as `region_default`.
 */
export const REGION_DEFAULT_CITY: Readonly<Record<string, string>> = {
  'sa-central-region': 'sa-riyadh', 'sa-western-region': 'sa-jeddah', 'sa-eastern-region': 'sa-dammam',
  'sa-northern-region': 'sa-tabuk', 'sa-southern-region': 'sa-abha',
};

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
