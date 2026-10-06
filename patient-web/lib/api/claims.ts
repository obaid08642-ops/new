import { z } from "zod";

const row = z.object({
  id: z.string().min(1).max(160),
  service: z.string().min(1).max(160).optional(),
  status: z.enum(["approved", "reimbursed", "pending", "rejected"]).optional(),
  date: z.string().max(80).optional(),
}).passthrough();

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
      service: parsed.data.service,
      status: parsed.data.status,
      date: parsed.data.date,
    }];
  });
}
