/**
 * D-30: one reading of a patient's saved insurance policy and of a provider's contracts.
 *
 * (Before the single writer below, the policy was written by endpoints that did not agree on field names: `POST /users/me/insurance` keeps the
 * company in `provider` and the class in `class`; `POST /insurance/save-policy` keeps the company id in `company_id`
 * (plus `company_code`) and the class in `plan_class`. A provider contract is `{ company_id, classes, active }`.
 */
export type InsuranceContract = { company_id?: unknown; classes?: unknown; active?: unknown };

/** Every identifier the policy uses for its company (id, code, or the `provider` value the app sent). */
export function policyCompanyKeys(policy: any): string[] {
  return [...new Set([policy?.company_id, policy?.company_code, policy?.provider]
    .map((v) => (typeof v === 'string' ? v.trim() : ''))
    .filter(Boolean))];
}

export function policyClass(policy: any): string {
  const v = policy?.class ?? policy?.plan_class;
  return typeof v === 'string' ? v.trim() : '';
}

/** True when an active contract names one of the company keys AND the class. Plain-string contracts never match. */
export function hasInsuranceContract(contracts: unknown, companyKeys: string[], cls: string): boolean {
  if (!cls || !companyKeys.length || !Array.isArray(contracts)) return false;
  return contracts.some((c: InsuranceContract) => c && typeof c === 'object'
    && typeof c.company_id === 'string' && companyKeys.includes(c.company_id)
    && Array.isArray(c.classes) && c.classes.includes(cls) && c.active !== false);
}

// ── One writer, one shape (QA P1, web-patient findings) ──────────────────────────────────────────────────────────────
//
// Four code paths wrote `patient_profiles.insurance` with different objects: save-policy (company_id, plan_class, replaced the object),
// POST /users/me/insurance (provider, class, merged), POST /insurance/upload-policy (provider, class, replaced the object and so lost the
// card figures) and a family member's policy. A policy saved by one and read as another had no `class` or no `company_id`, and a later
// save dropped the copay. They all build the object here, so there is one shape:
//   company: company_id, company_code, company_name (when the insurer is in the catalogue); `provider` is always the insurer's display name
//   class:   `class` AND `plan_class`, always the same value (readers use either)
//   copay:   copay_percent, copay_cap_sar (as printed on the card; cleared when the company or class changes and the new save has none)
//   always:  verified = false (only an administrative step verifies), saved_at
import { BadRequestException } from '@nestjs/common';

/** The Mongo filter that finds an active catalogue insurer from an id, a code or a name (what the clients send as `company_id` / `provider`). */
export function insuranceCompanyFilter(key: string): Record<string, unknown> {
  const k = String(key || '').trim();
  return { is_active: true, $or: [{ id: { $eq: k } }, { code: { $eq: k.toLowerCase() } }, { name_ar: { $eq: k } }, { name_en: { $eq: k } }] };
}

export interface PolicyInput {
  company_id?: unknown; provider?: unknown; provider_name?: unknown; class?: unknown; plan_class?: unknown; network?: unknown;
  member_id?: unknown; member_name?: unknown; national_id?: unknown; policy_number?: unknown; expiry_date?: unknown;
  copay_percent?: unknown; copay_cap_sar?: unknown; card_image_url?: unknown; pdf_url?: unknown; ocr_extracted?: unknown;
}

const str = (v: unknown): string | undefined => (typeof v === 'string' && v.trim() ? v.trim() : undefined);

/** The card figures, validated: a percent 0–100 and a cap 0–1 000 000 SAR, or nothing. */
export function validateCopayFigures(percent: unknown, cap: unknown): { copay_percent?: number; copay_cap_sar?: number } {
  const out: { copay_percent?: number; copay_cap_sar?: number } = {};
  if (percent !== undefined && percent !== null) {
    if (!(typeof percent === 'number' && percent >= 0 && percent <= 100)) throw new BadRequestException('invalid_copay_percent');
    out.copay_percent = percent;
  }
  if (cap !== undefined && cap !== null) {
    if (!(typeof cap === 'number' && cap >= 0 && cap <= 1_000_000)) throw new BadRequestException('invalid_copay_cap');
    out.copay_cap_sar = cap;
  }
  return out;
}

/**
 * The canonical policy: what is already saved, overridden field by field by what the caller sent (an absent field changes nothing),
 * normalised as described above. `company` is the catalogue row when the insurer was found.
 */
export function buildPatientPolicy(existing: any, input: PolicyInput, company: any | null, now: Date = new Date()): Record<string, unknown> {
  const prev = existing && typeof existing === 'object' ? existing : {};
  const sent: Record<string, unknown> = {};
  for (const k of ['network', 'member_id', 'member_name', 'national_id', 'policy_number', 'expiry_date', 'card_image_url', 'pdf_url'] as const) {
    const v = str(input[k]);
    if (v !== undefined) sent[k] = v;
  }
  if (input.ocr_extracted !== undefined) sent.ocr_extracted = !!input.ocr_extracted;

  const cls = str(input.class) ?? str(input.plan_class) ?? (policyClass(prev) || undefined);
  const companyFields = company
    ? { company_id: company.id, company_code: company.code, company_name: company.name_ar || company.name || company.name_en }
    : {};
  const provider = company
    ? (company.name_ar || company.name_en || company.code)
    : (str(input.provider) ?? str(input.provider_name) ?? str(prev.provider));
  const merged: Record<string, unknown> = { ...prev, ...sent, ...companyFields };
  if (provider) merged.provider = provider;
  if (cls) { merged.class = cls; merged.plan_class = cls; }

  // the card figures belong to one company and one class: a save that changes either and sends none starts without them
  const figures = validateCopayFigures(input.copay_percent, input.copay_cap_sar);
  const changed = (company && prev.company_id && String(prev.company_id) !== String(company.id)) || (cls && policyClass(prev) && policyClass(prev) !== cls);
  if (changed) { delete merged.copay_percent; delete merged.copay_cap_sar; }
  Object.assign(merged, figures);

  merged.verified = false;
  merged.saved_at = now;
  return merged;
}
