import { z } from "zod";

export const diagnosticDomains = ["labs", "radiology"] as const;
export type DiagnosticDomain = typeof diagnosticDomains[number];

const bookingIdSchema = z.string().uuid();

export type DiagnosticBooking = {
  id: string;
  state?: string;
  scheduledAt?: string;
  locationType?: string;
  scanNameAr?: string;
  scanNameEn?: string;
  medicalReferralRequired?: boolean;
  hasReport?: boolean;
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

function text(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function bookingFrom(value: unknown): DiagnosticBooking | null {
  const record = asRecord(value);
  const id = bookingIdSchema.safeParse(record?.id);
  if (!id.success || !record) return null;
  return {
    id: id.data,
    state: text(record, ["state", "status"]),
    scheduledAt: text(record, ["scheduled_at", "scheduledAt"]),
    locationType: text(record, ["location_type", "delivery_mode"]),
    scanNameAr: text(record, ["scan_name_ar"]),
    scanNameEn: text(record, ["scan_name_en"]),
    medicalReferralRequired: typeof record.medical_referral_required === "boolean" ? record.medical_referral_required : undefined,
    hasReport: (Array.isArray(record.reports) && record.reports.length > 0) || (typeof record.signed_report_pdf_url === "string" && record.signed_report_pdf_url.trim().length > 0),
  };
}

export function parseDiagnosticDomain(value: string): DiagnosticDomain | null {
  return diagnosticDomains.includes(value as DiagnosticDomain) ? value as DiagnosticDomain : null;
}

export function parseDiagnosticBookingId(value: string) {
  return bookingIdSchema.safeParse(value);
}

export function extractDiagnosticBookings(payload: unknown) {
  return listFrom(payload).flatMap((item) => {
    const booking = bookingFrom(item);
    return booking ? [booking] : [];
  });
}

export function extractDiagnosticBooking(payload: unknown) {
  const root = asRecord(payload);
  return bookingFrom(asRecord(root?.data) ?? root);
}
