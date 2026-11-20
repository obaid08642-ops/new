/** Provider onboarding fields per (market, provider type), as data (blueprint sections 4 and 6). The client draws the form from this. */
export interface OnboardingField {
  key: string;
  kind: 'text' | 'date' | 'iban' | 'document' | 'list';
  /** Enforced by the server at submit today. false = collected, not enforced. */
  required: boolean;
  /** Links the field to a licence type id when it carries a licence number or date. */
  licence_type?: string;
}
export interface OnboardingFieldSet { market: string; provider_type: string; fields: OnboardingField[] }

const f = (key: string, kind: OnboardingField['kind'], required: boolean, licence_type?: string): OnboardingField => ({ key, kind, required, ...(licence_type ? { licence_type } : {}) });

/**
 * SA. `required` mirrors what the server enforces at submit today: doctors (`doctorSubmitProblems`: academic degree, a sub-specialty, a valid licence expiry date, a valid IBAN)
 * and facility types (`facilityLicenseProblems`: a licence expiry date when PROVIDER_LICENSE_EXPIRY_REQUIRED=yes, so `required: false` here until that switch is on).
 */
export const SA_ONBOARDING: readonly OnboardingFieldSet[] = [
  { market: 'SA', provider_type: 'doctor', fields: [
    f('scfhs_license_number', 'text', false, 'sa-scfhs'), f('license_expiry_date', 'date', true, 'sa-scfhs'), f('national_id', 'text', false),
    f('academic_degree', 'text', true), f('sub_specialties', 'list', true), f('iban', 'iban', true), f('license_documents', 'document', false) ] },
  { market: 'SA', provider_type: 'nursing', fields: [
    f('scfhs_license_number', 'text', false, 'sa-scfhs'), f('cr_number', 'text', false, 'sa-commercial-register'), f('license_expiry_date', 'date', false, 'sa-scfhs'), f('iban', 'iban', false), f('license_documents', 'document', false) ] },
  { market: 'SA', provider_type: 'home_care', fields: [
    f('scfhs_license_number', 'text', false, 'sa-scfhs'), f('cr_number', 'text', false, 'sa-commercial-register'), f('license_expiry_date', 'date', false, 'sa-scfhs'), f('iban', 'iban', false), f('license_documents', 'document', false) ] },
  { market: 'SA', provider_type: 'pharmacy', fields: [
    f('cr_number', 'text', false, 'sa-commercial-register'), f('moh_license_number', 'text', false, 'sa-moh-facility'), f('sfda_license_number', 'text', false, 'sa-sfda-pharmacy'),
    f('tax_number', 'text', false), f('license_expiry_date', 'date', false, 'sa-moh-facility'), f('iban', 'iban', false), f('license_documents', 'document', false) ] },
  ...(['lab', 'radiology', 'hospital', 'clinic'] as const).map((t): OnboardingFieldSet => ({ market: 'SA', provider_type: t, fields: [
    f('cr_number', 'text', false, 'sa-commercial-register'), f('moh_license_number', 'text', false, 'sa-moh-facility'), f('license_expiry_date', 'date', false, 'sa-moh-facility'), f('iban', 'iban', false), f('license_documents', 'document', false) ] })),
];

const SETS = new Map<string, readonly OnboardingFieldSet[]>([['SA', SA_ONBOARDING]]);
export function registerOnboardingFieldSets(market: string, sets: readonly OnboardingFieldSet[]): void { SETS.set(market, sets); }

export function onboardingFieldSet(market: string, providerType: string): OnboardingFieldSet | null {
  const all = SETS.get(market);
  if (!all) throw new Error(`onboarding_field_sets_not_found:${market}`);
  return all.find((s) => s.provider_type === providerType) ?? null;
}
