// LJ-04: CHI (Council of Health Insurance) lookup → save-policy contract.
// Pure helpers so the mapping rules are unit-tested without a WebView.

export type InsuranceCompany = { id?: string; code?: string; name_ar?: string; name_en?: string };

const norm = (value: unknown) => String(value ?? '').trim().toLowerCase();

/** Match a CHI-returned company name against the active insurer directory (code or name). */
export function matchInsuranceCompany(companies: InsuranceCompany[] | null | undefined, companyName: unknown): InsuranceCompany | null {
  const list = Array.isArray(companies) ? companies : [];
  const target = norm(companyName);
  if (!target) return null;
  return list.find((c) => [c?.name_ar, c?.name_en, c?.code].some((candidate) => candidate && norm(candidate) === target)) || null;
}

/**
 * Build the save-policy body from a CHI scraped row. Returns null when there is no
 * real policy number or no matched company — the caller must ask the patient to
 * add the policy manually instead of inventing data. `verified` is never sent.
 */
export function buildChiPolicyPayload(company: InsuranceCompany | null, item: any): Record<string, any> | null {
  const policyNumber = String(item?.policy_number ?? '').trim();
  if (!company || !policyNumber) return null;
  return {
    company_id: company.code || company.id,
    policy_number: policyNumber,
    network: item.network || item.class,
    class: item.class || 'A',
    expiry_date: item.expiry || '',
    member_name: item.member_name || '',
    national_id: item.national_id || '',
    ocr_extracted: true,
  };
}
