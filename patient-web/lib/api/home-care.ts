import { z } from "zod";
import { type Texts } from "@/lib/i18n/localized";

const bookingIdSchema = z.string().uuid();

export type HomeCareBooking = {
  id: string;
  serviceNameAr?: string;
  serviceNameEn?: string;
  /** The service name in every language (issue 1832): `service_names` over the stored Arabic/English. Read it with `pickTexts`. */
  serviceNames?: Texts;
  state?: string;
  scheduledAt?: string;
  sessionsCount?: number;
  duration?: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : null;
}

function listFrom(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  const root = asRecord(payload);
  for (const candidate of [root?.data, root?.items, root?.results]) if (Array.isArray(candidate)) return candidate;
  return [];
}

function namesFrom(map: unknown, ar?: string, en?: string): Texts | undefined {
  const out: Texts = { ...(ar ? { ar } : {}), ...(en ? { en } : {}) };
  const record = asRecord(map);
  if (record) for (const lang of ["ar", "en", "ur", "hi", "bn", "tl"] as const) {
    const value = record[lang];
    if (typeof value === "string" && value.trim()) out[lang] = value.trim();
  }
  return Object.keys(out).length ? out : undefined;
}

function text(record: Record<string, unknown>, key: string) {
  const value = record[key];
  return typeof value === "string" && value.trim() ? value : undefined;
}

function bookingFrom(value: unknown): HomeCareBooking | null {
  const record = asRecord(value);
  const id = bookingIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  return {
    id: id.data,
    serviceNameAr: text(record, "service_name_ar"),
    serviceNameEn: text(record, "service_name_en"),
    serviceNames: namesFrom(record.service_names, text(record, "service_name_ar"), text(record, "service_name_en")),
    state: text(record, "state"),
    scheduledAt: text(record, "scheduled_at"),
    sessionsCount: typeof record.sessions_count === "number" && Number.isInteger(record.sessions_count) && record.sessions_count > 0 ? record.sessions_count : undefined,
    duration: text(record, "duration"),
  };
}

export function extractHomeCareBookings(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const booking = bookingFrom(item);
    return booking ? [booking] : [];
  });
}
