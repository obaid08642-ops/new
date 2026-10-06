// no zod here: the checkout screen is a client component and a schema library would put its whole runtime in the browser bundle
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

/**
 * The saved prescription a cart with prescription medicines is ordered with: the first of the patient's active ones
 * (`GET /prescriptions/active`, an array or `{ data: [...] }`). Only a real UUID counts; nothing is invented.
 */
export function activePrescriptionId(payload: unknown): string | null {
  const root = record(payload);
  const list = Array.isArray(payload) ? payload : [root?.data, root?.items, root?.prescriptions].find(Array.isArray);
  if (!Array.isArray(list)) return null;
  for (const entry of list) {
    const id = record(entry)?.id;
    if (typeof id === "string" && UUID.test(id)) return id;
  }
  return null;
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
