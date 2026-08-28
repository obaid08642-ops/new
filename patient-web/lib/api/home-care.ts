import { z } from "zod";

const bookingIdSchema = z.string().uuid();

export type HomeCareBooking = {
  id: string;
  serviceNameAr?: string;
  serviceNameEn?: string;
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
