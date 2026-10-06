/**
 * F2 (PRODUCT.md): Nabd+ does not approve claims. What Nabd+ can answer is
 * whether a provider accepts the patient's insurance company; the provider
 * then obtains the approval in its own system and records approved /
 * partial / rejected, and the patient pays any copay.
 *
 * The patient's saved policy (add-policy) stores the catalog company code in
 * `company_id` and the localized name in `provider`; a provider's
 * `accepted_insurance` lists catalog company codes (provider-app catalogs.ts).
 */
export interface PolicyCompany {
  id: string;
  code: string;
  name_ar: string;
  name_en: string;
}

interface CompanyLookup {
  findOne(filter: Record<string, unknown>): { lean(): PromiseLike<unknown> };
}

interface SavedPolicy {
  company_id?: unknown;
  company_code?: unknown;
  provider?: unknown;
}

/** The catalog company a saved policy names, by code, id or exact name. */
export async function resolvePolicyCompany(companies: CompanyLookup, policy: SavedPolicy | null | undefined): Promise<PolicyCompany | null> {
  const names = [policy?.company_id, policy?.company_code, policy?.provider]
    .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
    .map((v) => v.trim());
  if (!names.length) return null;
  const row = (await companies.findOne({
    $or: [{ code: { $in: names.map((n) => n.toLowerCase()) } }, { id: { $in: names } }, { name_ar: { $in: names } }, { name_en: { $in: names } }],
  }).lean()) as Partial<PolicyCompany> | null;
  if (!row?.code) return null;
  return { id: String(row.id ?? ''), code: String(row.code), name_ar: String(row.name_ar ?? ''), name_en: String(row.name_en ?? '') };
}

/** The values a provider's accepted_insurance may hold for this company. */
export function acceptedKeys(company: PolicyCompany): string[] {
  return [company.code, company.id].filter(Boolean);
}

/** True when a provider's accepted_insurance lists the company (code or id). */
export function acceptsCompany(accepted: unknown, company: PolicyCompany): boolean {
  if (!Array.isArray(accepted)) return false;
  const keys = new Set(acceptedKeys(company).map((k) => k.toLowerCase()));
  return accepted.some((a) => typeof a === 'string' && keys.has(a.trim().toLowerCase()));
}

/** Which public provider types serve each coverage-check service type. */
export const SERVICE_PROVIDER_TYPES: Record<string, string[]> = {
  consultation: ['doctor', 'clinic', 'hospital'],
  pharmacy: ['pharmacy'],
  lab: ['lab'],
  radiology: ['radiology'],
  nursing: ['nursing', 'home_care'],
  home_nursing: ['nursing', 'home_care'],
};
