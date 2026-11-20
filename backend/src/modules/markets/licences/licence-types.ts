/** Licences per jurisdiction (blueprint section 6): a typed list replaces the named columns scfhs_license_number / moh_license_number / cr_number. */
export interface LicenceType {
  id: string;
  /** Jurisdiction code: country (SA) or sub-national (AE-DU). */
  jurisdiction: string;
  /** Issuer name key (translated by the clients). */
  issuer: string;
  /** Provider types (`common/enums.ts` ProviderType values) that must hold it. */
  provider_types: readonly string[];
  /** Does it expire (a date is asked and watched)? */
  has_expiry: boolean;
  /** Verified by an admin reading the uploaded document (owner 2026-11-17: no registry API). */
  verification: 'admin_document_review';
}

export interface ProviderLicence {
  jurisdiction: string;
  type: string;
  number: string | null;
  /** Calendar date YYYY-MM-DD in the jurisdiction's own time zone. */
  expiry: string | null;
  document_ids: string[];
  verified: boolean;
}

const HEALTH_PRACTITIONERS = ['doctor', 'nursing', 'home_care', 'pharmacy'] as const;
const FACILITIES = ['pharmacy', 'hospital', 'clinic', 'lab', 'radiology', 'nursing', 'home_care'] as const;

/** Saudi Arabia, exactly the credentials the registration screens collect today. */
export const SA_LICENCE_TYPES: readonly LicenceType[] = [
  { id: 'sa-scfhs', jurisdiction: 'SA', issuer: 'scfhs', provider_types: HEALTH_PRACTITIONERS, has_expiry: true, verification: 'admin_document_review' },
  { id: 'sa-moh-facility', jurisdiction: 'SA', issuer: 'moh', provider_types: FACILITIES, has_expiry: true, verification: 'admin_document_review' },
  { id: 'sa-commercial-register', jurisdiction: 'SA', issuer: 'mc', provider_types: FACILITIES, has_expiry: false, verification: 'admin_document_review' },
  { id: 'sa-sfda-pharmacy', jurisdiction: 'SA', issuer: 'sfda', provider_types: ['pharmacy'], has_expiry: false, verification: 'admin_document_review' },
];

const TYPES_BY_MARKET = new Map<string, readonly LicenceType[]>([['SA', SA_LICENCE_TYPES]]);

/** Adding a market = registering its licence types (data). */
export function registerLicenceTypes(market: string, types: readonly LicenceType[]): void { TYPES_BY_MARKET.set(market, types); }

export function licenceTypesFor(market: string, providerType: string): LicenceType[] {
  const all = TYPES_BY_MARKET.get(market);
  if (!all) throw new Error(`licence_types_not_found:${market}`);
  return all.filter((t) => t.provider_types.includes(providerType));
}

export type ExpiryState = { state: 'valid' | 'expired'; days_left: number };

const ymdIn = (at: Date, tz: string): string => new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(at);
const dayNumber = (ymd: string): number => { const [y, m, d] = ymd.split('-').map(Number); return Math.round(Date.UTC(y, m - 1, d) / 86_400_000); };

/**
 * Decision A2 (lead 2026-11-17): a licence is valid THROUGH the end of its expiry day in the jurisdiction's own time zone, and expired from the next
 * calendar day. `days_left` is 0 on the expiry day itself. Pure; the zone comes from the market config, so a zone with daylight saving works.
 */
export function licenceExpiryState(expiry: string, now: Date, timezone: string): ExpiryState {
  const days = dayNumber(expiry) - dayNumber(ymdIn(now, timezone));
  return days >= 0 ? { state: 'valid', days_left: days } : { state: 'expired', days_left: days };
}

/** The legacy provider_profiles columns as a licence list (read-only view; nothing is migrated). */
export function licencesFromLegacyProfile(p: Record<string, unknown>, jurisdiction = 'SA'): ProviderLicence[] {
  const str = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : null);
  const ymd = (v: unknown) => (v ? new Date(v as string | number | Date).toISOString().slice(0, 10) : null);
  const out: ProviderLicence[] = [];
  const scfhs = str(p.scfhs_license_number);
  if (scfhs) out.push({ jurisdiction, type: 'sa-scfhs', number: scfhs, expiry: ymd(p.license_expiry_date), document_ids: [], verified: p.license_status === 'verified' });
  const moh = str(p.moh_license_number);
  if (moh) out.push({ jurisdiction, type: 'sa-moh-facility', number: moh, expiry: scfhs ? null : ymd(p.license_expiry_date), document_ids: [], verified: p.license_status === 'verified' });
  const cr = str(p.cr_number);
  if (cr) out.push({ jurisdiction, type: 'sa-commercial-register', number: cr, expiry: null, document_ids: [], verified: false });
  const sfda = str(p.sfda_license_number);
  if (sfda) out.push({ jurisdiction, type: 'sa-sfda-pharmacy', number: sfda, expiry: null, document_ids: [], verified: false });
  return out;
}
