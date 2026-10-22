/**
 * D-30: one reading of a patient's saved insurance policy and of a provider's contracts.
 *
 * The policy is written by two endpoints that do not agree on field names: `POST /users/me/insurance` keeps the
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
