import { z } from "zod";

const visitSchema = z.object({
  id: z.string().trim().min(1).max(200),
  status: z.string().trim().min(1).max(80).optional(),
  scheduled_at: z.string().datetime({ offset: true }).optional(),
  provider_name: z.string().trim().max(200).optional(),
  service_name: z.string().trim().max(200).optional(),
  address_label: z.string().trim().max(300).optional(),
}).strip();
export type NursingVisit = { id: string; status?: string; scheduledAt?: string; providerName?: string; serviceName?: string; addressLabel?: string };
function rows(value: unknown): unknown[] { if (Array.isArray(value)) return value; if (!value || typeof value !== "object") return []; const root = value as Record<string, unknown>; for (const key of ["data", "items", "visits", "results"]) if (Array.isArray(root[key])) return root[key] as unknown[]; return []; }
export function extractNursingVisits(value: unknown): NursingVisit[] { return rows(value).flatMap((row) => { const parsed = visitSchema.safeParse(row); if (!parsed.success) return []; const v = parsed.data; return [{ id: v.id, status: v.status, scheduledAt: v.scheduled_at, providerName: v.provider_name, serviceName: v.service_name, addressLabel: v.address_label }]; }); }
