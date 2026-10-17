import { z } from "zod";

// GET /nursing/bookings/mine (the patient's own bookings) sends the booking model: `state`, `service_name_ar` /
// `service_name_en`; `status` / `service_name` are kept for any older payload. A field the server leaves null is just absent.
const text = (max: number) => z.string().trim().max(max).nullish().transform((value) => value || undefined);
const visitSchema = z.object({
  id: z.string().trim().min(1).max(200),
  status: text(80),
  state: text(80),
  scheduled_at: z.string().datetime({ offset: true }).nullish().transform((value) => value || undefined),
  provider_name: text(200),
  service_name: text(200),
  service_name_ar: text(200),
  service_name_en: text(200),
  address_label: text(300),
}).strip();
export type NursingVisit = { id: string; status?: string; scheduledAt?: string; providerName?: string; serviceName?: string; addressLabel?: string };
function rows(value: unknown): unknown[] { if (Array.isArray(value)) return value; if (!value || typeof value !== "object") return []; const root = value as Record<string, unknown>; for (const key of ["data", "items", "visits", "results"]) if (Array.isArray(root[key])) return root[key] as unknown[]; return []; }
/** `locale` picks the service name in the reader's language: Arabic for ar / ur, English (then Arabic) for the rest. */
export function extractNursingVisits(value: unknown, locale = "ar"): NursingVisit[] {
  const rtl = locale === "ar" || locale === "ur";
  return rows(value).flatMap((row) => {
    const parsed = visitSchema.safeParse(row);
    if (!parsed.success) return [];
    const v = parsed.data;
    const serviceName = v.service_name || (rtl ? v.service_name_ar || v.service_name_en : v.service_name_en || v.service_name_ar);
    return [{ id: v.id, status: v.status || v.state, scheduledAt: v.scheduled_at, providerName: v.provider_name, serviceName, addressLabel: v.address_label }];
  });
}
