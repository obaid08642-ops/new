/**
 * Q79: admin approval needs one typed KYC document per required type
 * (backend REQUIRED_DOCS_BY_PROVIDER_TYPE, provider.enums.ts). Registration
 * used to send only license_documents URL strings, so no provider registered
 * from the app could be approved. Screens now send `documents` with step2.
 */
export type KycDocType =
  | 'national_id' | 'commercial_registration' | 'medical_license' | 'vat_certificate'
  | 'iban_letter' | 'facility_license' | 'professional_cv' | 'other';

// Mirrors backend REQUIRED_DOCS_BY_PROVIDER_TYPE for the types the app registers.
export const REQUIRED_DOCUMENTS: Record<string, KycDocType[]> = {
  pharmacy: ['commercial_registration', 'facility_license', 'iban_letter'],
  hospital: ['commercial_registration', 'facility_license', 'vat_certificate', 'iban_letter'],
  clinic: ['commercial_registration', 'facility_license', 'iban_letter'],
  doctor: ['national_id', 'medical_license', 'professional_cv', 'iban_letter'],
  lab: ['commercial_registration', 'facility_license', 'iban_letter'],
  laboratory: ['commercial_registration', 'facility_license', 'iban_letter'],
  radiology: ['commercial_registration', 'facility_license', 'iban_letter'],
  home_care: ['commercial_registration', 'facility_license', 'iban_letter'],
  nursing: ['national_id', 'medical_license', 'iban_letter'],
  ambulance: ['commercial_registration', 'facility_license', 'iban_letter'],
};

/** The storage object id from POST /storage/upload's id, or its /api/v1/storage/<id> url. */
export function fileIdOf(ref: unknown): string | null {
  if (typeof ref !== 'string' || !ref.trim()) return null;
  const m = ref.match(/\/storage\/([A-Za-z0-9_-]+)\/?$/);
  if (m) return m[1];
  return /^[A-Za-z0-9_-]{6,128}$/.test(ref) ? ref : null;
}

/** [{doc_type, file_id}] for every uploaded file; entries without a file are left out. */
export function typedDocuments(entries: Array<[KycDocType, unknown]>): Array<{ doc_type: KycDocType; file_id: string }> {
  const out: Array<{ doc_type: KycDocType; file_id: string }> = [];
  for (const [doc_type, ref] of entries) {
    const file_id = fileIdOf(ref);
    if (file_id) out.push({ doc_type, file_id });
  }
  return out;
}

/** Required types this list does not cover. */
export function missingDocuments(providerType: string, docs: Array<{ doc_type: string }>): KycDocType[] {
  const have = new Set(docs.map((d) => d.doc_type));
  return (REQUIRED_DOCUMENTS[providerType] || []).filter((t) => !have.has(t));
}
