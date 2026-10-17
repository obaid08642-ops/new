/**
 * Product page insurance row (SPEC_PRODUCT_DOCTOR_DETAIL §A, needs-review batch-1a-app 8, issue 456): the row shows only
 * when the signed-in patient's insurer is in the product's `covered_by_insurance[]` (insurance company ids).
 *
 * The patient's insurer comes from the saved policy (GET /users/me/insurance): the add-policy screen's save
 * (POST /insurance/save-policy) stores `company_id` (the company id) and `company_code`; the insurance hub's save stores
 * `provider` (the company's code or id). Its name comes from the active companies list (GET /insurance/companies: id,
 * code, name_ar, name_en). Nothing is guessed: no policy, no match or no name means no row.
 */

export type InsurerCompany = { id?: string | null; code?: string | null; name_ar?: string | null; name_en?: string | null };
export type SavedPolicy = { provider?: string | null; provider_name?: string | null; company_id?: string | null; company_code?: string | null; company_name?: string | null };

const clean = (v: unknown): string => (typeof v === 'string' ? v.trim() : typeof v === 'number' ? String(v) : '');

/** The name of the patient's insurer when it covers the product, else null. */
export function coveringInsurerName(covered: unknown, policy: SavedPolicy | null, companies: InsurerCompany[], lang: string): string | null {
  const ids = new Set((Array.isArray(covered) ? covered : []).map(clean).filter(Boolean));
  const own = [policy?.company_id, policy?.company_code, policy?.provider].map(clean).filter(Boolean);
  if (!ids.size || !own.length) return null;
  const company = companies.find((c) => own.includes(clean(c.id)) || own.includes(clean(c.code))) ?? null;
  const keys = [...own, clean(company?.id), clean(company?.code)].filter(Boolean);
  if (!keys.some((key) => ids.has(key))) return null;
  const arabic = clean(company?.name_ar);
  const english = clean(company?.name_en);
  const name = (lang === 'ar' ? arabic || english : english || arabic) || clean(policy?.company_name) || clean(policy?.provider_name);
  return name || null;
}
