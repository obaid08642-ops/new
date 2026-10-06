/**
 * N7 (owner decision 2026-10-05, REVIEW_REAUDIT Round 12 Phase A #10):
 * "Individual providers' public views show only name, specialty, clinic/district
 * and ratings. No phone, address or internal IDs; contact happens in-app."
 *
 * An INDIVIDUAL provider is a person a patient picks — doctor, nurse, home-care
 * nurse. A BUSINESS (pharmacy, lab, radiology, hospital) is a company: its public
 * contact phone and address are business contact data and stay.
 *
 * Two rules are enforced here for an individual provider:
 *  1. never publish contact/identity internals: the account id (user_id/account_id),
 *     any phone, email, a street or home address, the national id or an IBAN;
 *  2. never publish the exact point of a home-based provider (nurse / home_care):
 *     their stored coordinates ARE their home. Publish at most a point rounded to
 *     2 decimals (~1 km) or the district. A doctor's point is the clinic's, so it
 *     is published exactly.
 *
 * The public identifier is the profile `id` (or slug); a booking resolves the
 * provider's account server-side, so no public read needs to hand out an account id.
 */
export const INDIVIDUAL_PROVIDER_TYPES = ['doctor', 'nursing', 'nurse', 'home_care'];

/** Types whose stored coordinates are their home address, not a clinic. */
const HOME_BASED_PROVIDER_TYPES = ['nursing', 'nurse', 'home_care'];

const typeOf = (row: unknown): string =>
  String((row as Record<string, unknown>)?.type ?? (row as Record<string, unknown>)?.provider_type ?? '')
    .trim()
    .toLowerCase();

export function isIndividualProviderType(type: unknown): boolean {
  return INDIVIDUAL_PROVIDER_TYPES.includes(String(type ?? '').trim().toLowerCase());
}

export function isHomeBasedProviderType(type: unknown): boolean {
  return HOME_BASED_PROVIDER_TYPES.includes(String(type ?? '').trim().toLowerCase());
}

/** Never published for an individual provider (matched case-insensitively). */
const PRIVATE_PROVIDER_KEYS = [
  '_id', '__v',
  'user_id', 'account_id', 'provider_account_id',
  'phone', 'phone_e164', 'mobile', 'mobile_number', 'telephone', 'whatsapp', 'contact_number',
  'email', 'email_address',
  'address', 'clinic_address', 'home_address', 'street_address', 'building_address', 'delivery_address',
  'national_id', 'national_number', 'id_number', 'iqama_number', 'iban', 'bank_iban',
  'password_hash', 'password',
];

/** Coordinate carriers that must be coarsened for a home-based provider. */
const COORDINATE_KEYS = ['location', 'geo', 'base_location', 'coordinates'];

const round2 = (n: unknown): number => Math.round(Number(n) * 100) / 100;

/**
 * Coarsen a coordinate pair to ~1 km. Anything that is not a finite number is
 * dropped rather than published.
 */
function coarsenPoint(point: unknown): unknown {
  if (!point || typeof point !== 'object' || Array.isArray(point)) return point;
  const src = point as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(src)) {
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = round2(v);
    else out[k] = v;
  }
  return out;
}

/** A home-based provider's point, rounded to ~1 km (N7). */
export function coarsenHomePoint(point: unknown): Record<string, unknown> {
  return (coarsenPoint(point) ?? {}) as Record<string, unknown>;
}

/**
 * A provider row/response as a public read may return it: for an individual
 * provider the private keys are removed and a home-based point is coarsened;
 * a business (or any non-provider row) is returned unchanged.
 */
export function toPublicProvider<T>(row: T, options: { coarsenHomeLocation?: boolean } = {}): T {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return row;
  const source = (row as Record<string, unknown>);
  if (!isIndividualProviderType(typeOf(source))) return row;

  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(source)) {
    if (PRIVATE_PROVIDER_KEYS.includes(key.toLowerCase())) continue;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      // A nested provider document (e.g. a doctor embedded in a facility) is
      // sanitized too. Type is the only reliable signal: a nested object without
      // one is left exactly as it is, so no unrelated data is ever stripped.
      if (isIndividualProviderType(typeOf(value))) {
        out[key] = toPublicProvider(value as T, options);
        continue;
      }
      if (COORDINATE_KEYS.includes(key)) {
        const coarsen = options.coarsenHomeLocation ?? isHomeBasedProviderType(typeOf(source));
        out[key] = coarsen ? coarsenPoint(value) : value;
        continue;
      }
    }
    out[key] = value;
  }
  return out as T;
}

/** Same, for a list of rows; non-provider rows pass through untouched. */
export function toPublicProviderList<T>(rows: T[], options?: { coarsenHomeLocation?: boolean }): T[] {
  if (!Array.isArray(rows)) return rows;
  return rows.map((row) => toPublicProvider(row, options));
}

/**
 * A public read that embeds providers inside a wrapper (`{ data: [...] }`,
 * `{ items: [...], ... }`) is sanitized key by key.
 */
export function toPublicProviderResponse<T>(body: T, options?: { coarsenHomeLocation?: boolean }): T {
  if (Array.isArray(body)) return toPublicProviderList(body, options) as unknown as T;
  if (!body || typeof body !== 'object') return body;
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(body as Record<string, unknown>)) {
    if (Array.isArray(value)) out[key] = toPublicProviderList(value, options);
    else if (value && typeof value === 'object') out[key] = toPublicProviderResponse(value, options);
    else out[key] = value;
  }
  return out as T;
}