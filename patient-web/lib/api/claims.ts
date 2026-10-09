import { z } from "zod";

const row = z.object({
  id: z.string().min(1).max(160),
  service: z.string().min(1).max(160).optional(),
  // Any status string is accepted; an unknown one is shown as "status unavailable", not dropped (needs-review issue 839).
  status: z.string().max(80).optional(),
  date: z.string().max(80).optional(),
  // GET /insurance/claims returns the stored claim: service_type and createdAt.
  service_type: z.string().min(1).max(160).optional(),
  createdAt: z.string().max(80).optional(),
}).passthrough();

const CLAIM_STATUSES = ["approved", "reimbursed", "pending", "rejected"] as const;

export type ClaimSummary = {
  id: string;
  service?: string;
  status?: "approved" | "reimbursed" | "pending" | "rejected";
  date?: string;
};

export function parseClaims(payload: unknown): ClaimSummary[] {
  const root = payload && typeof payload === "object" && !Array.isArray(payload)
    ? payload as Record<string, unknown>
    : null;
  const list = Array.isArray(payload)
    ? payload
    : Array.isArray(root?.data)
      ? root.data
      : Array.isArray(root?.claims)
        ? root.claims
        : [];
  return list.flatMap((item) => {
    const parsed = row.safeParse(item);
    if (!parsed.success) return [];
    return [{
      id: parsed.data.id,
      service: parsed.data.service ?? parsed.data.service_type,
      status: CLAIM_STATUSES.find((known) => known === parsed.data.status),
      date: parsed.data.date ?? parsed.data.createdAt,
    }];
  });
}
