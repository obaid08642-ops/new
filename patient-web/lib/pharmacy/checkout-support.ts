// no zod here: the checkout screen is a client component and a schema library would put its whole runtime in the browser bundle

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/** What the checkout shows of the patient's saved insurance (`GET /insurance/my-policy`): who insures them and the class, never a number. */
export type InsurancePolicyView = { company?: string; planClass?: string };

export function parseInsurancePolicy(payload: unknown): InsurancePolicyView | null {
  const root = record(payload);
  const source = record(root?.data) ?? root;
  if (!source || source.has_policy !== true) return null;
  const policy = record(source.policy);
  const text = (value: unknown) => (typeof value === "string" && value.trim() ? value.trim().slice(0, 120) : undefined);
  return {
    company: text(policy?.company_name) ?? text(policy?.provider),
    planClass: text(policy?.plan_class),
  };
}
