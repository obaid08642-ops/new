/**
 * The details a rejected (or "changes requested") applicant can correct before resubmitting. They go to the same
 * POST /provider-onboarding/step2 the registration wizard uses; only fields that changed are sent.
 */
export const DETAIL_FIELDS = ['name_ar', 'name_en', 'license_number', 'license_expiry_date', 'iban', 'bank_account_name', 'city'] as const;
export type DetailField = (typeof DETAIL_FIELDS)[number];
export type Details = Record<DetailField, string>;

const str = (v: unknown): string => (typeof v === 'string' ? v.trim() : '');

/** Starting values from GET /provider-onboarding/progress (the whole profile). The licence date is shown as YYYY-MM-DD. */
export function detailsFromProfile(profile: unknown): Details {
  const p = (profile && typeof profile === 'object' ? profile : {}) as Record<string, unknown>;
  const out = {} as Details;
  for (const f of DETAIL_FIELDS) out[f] = f === 'license_expiry_date' ? str(p[f]).slice(0, 10) : str(p[f]);
  return out;
}

/** The step2 body: fields that changed and are not empty. An empty box never erases a stored value. */
export function changedDetails(initial: Details, edited: Details): Partial<Details> {
  const out: Partial<Details> = {};
  for (const f of DETAIL_FIELDS) {
    const v = edited[f].trim();
    if (v && v !== initial[f]) out[f] = f === 'iban' ? v.replace(/\s+/g, '').toUpperCase() : v;
  }
  return out;
}

/** Client-side checks that match the server (the server stays the judge): a date must be YYYY-MM-DD, an IBAN SA + 22 digits. */
export function detailProblems(changed: Partial<Details>): DetailField[] {
  const bad: DetailField[] = [];
  if (changed.iban && !/^SA\d{22}$/.test(changed.iban)) bad.push('iban');
  if (changed.license_expiry_date && Number.isNaN(new Date(changed.license_expiry_date).getTime())) bad.push('license_expiry_date');
  if (changed.license_expiry_date && !/^\d{4}-\d{2}-\d{2}$/.test(changed.license_expiry_date)) { if (!bad.includes('license_expiry_date')) bad.push('license_expiry_date'); }
  return bad;
}
