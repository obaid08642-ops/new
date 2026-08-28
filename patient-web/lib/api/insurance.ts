import { z } from "zod";
const schema = z.object({ has_policy: z.boolean(), policy: z.object({ company_name: z.string().max(160).optional(), plan_class: z.string().max(80).optional() }).nullable().optional() }).passthrough();
export type InsuranceSummary = { hasPolicy: boolean; companyName?: string; planClass?: string };
export function parseInsuranceSummary(payload: unknown): InsuranceSummary | null { const root = payload && typeof payload === "object" && !Array.isArray(payload) ? payload as Record<string, unknown> : null; const parsed = schema.safeParse(root?.data ?? root); if (!parsed.success) return null; return { hasPolicy: parsed.data.has_policy, companyName: parsed.data.policy?.company_name, planClass: parsed.data.policy?.plan_class }; }
