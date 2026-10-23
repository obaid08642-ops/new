import { z } from "zod";

export const diagnosticDomains = ["labs", "radiology"] as const;
export type DiagnosticDomain = typeof diagnosticDomains[number];

const bookingIdSchema = z.string().uuid();

/** One state the booking went through (decision B8: the steps are the booking's real timeline, named by the page). */
export type DiagnosticTrackingStep = { state: string; at?: string };
export type DiagnosticTracking = { eta?: number; distance?: number; techName?: string; techPhone?: string; steps: DiagnosticTrackingStep[] };

/** One result row of a booking as the app draws it (`results[]`: name, result, reference, isAbnormal); none when the server sends none. */
export type DiagnosticResult = { id: string; name: string; result: string; reference?: string; abnormal: boolean };

export type DiagnosticBooking = {
  id: string;
  state?: string;
  scheduledAt?: string;
  locationType?: string;
  scanNameAr?: string;
  scanNameEn?: string;
  /** The first test of a lab booking (items[0].name_ar / name_en). */
  testNameAr?: string;
  testNameEn?: string;
  medicalReferralRequired?: boolean;
  hasReport?: boolean;
  /** Lab reports the booking holds a file for, opened through GET labs/bookings/:id/reports/:reportId (journeys#54). */
  reportIds?: string[];
  /** The result rows the booking carries, when it carries any. */
  results?: DiagnosticResult[];
  /** The booking total as the server stores it (`total` or `total_price`), when positive. */
  total?: number;
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

function resultsFrom(value: unknown): DiagnosticResult[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const rows = value.flatMap((item, i) => {
    const row = asRecord(item);
    if (!row) return [];
    const name = text(row, ["name", "name_en", "name_ar"]);
    const rawResult = row.result;
    const result = typeof rawResult === "string" && rawResult.trim() ? rawResult : typeof rawResult === "number" && Number.isFinite(rawResult) ? String(rawResult) : undefined;
    if (!name || !result) return [];
    return [{ id: text(row, ["id"]) ?? String(i), name, result, reference: text(row, ["reference"]), abnormal: row.isAbnormal === true }];
  });
  return rows.length ? rows : undefined;
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
    testNameAr: text(asRecord(Array.isArray(record.items) ? record.items[0] : null) ?? {}, ["name_ar"]),
    testNameEn: text(asRecord(Array.isArray(record.items) ? record.items[0] : null) ?? {}, ["name_en"]),
    results: resultsFrom(record.results),
    total: [record.total, record.total_price].map((v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN)).find((v) => Number.isFinite(v) && v > 0),
    medicalReferralRequired: typeof record.medical_referral_required === "boolean" ? record.medical_referral_required : undefined,
    hasReport: (Array.isArray(record.reports) && record.reports.length > 0) || (typeof record.signed_report_pdf_url === "string" && record.signed_report_pdf_url.trim().length > 0),
    reportIds: (Array.isArray(record.reports) ? record.reports : []).flatMap((r) => {
      const report = asRecord(r);
      const rid = bookingIdSchema.safeParse(report?.id);
      return rid.success && report?.has_file === true ? [rid.data] : [];
    }),
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

export function extractDiagnosticTracking(payload: unknown): DiagnosticTracking {
  const root = asRecord(payload);
  const source = asRecord(root?.data) ?? root;
  const rawSteps = Array.isArray(source?.timeline) ? source.timeline : [];
  return {
    eta: typeof source?.eta === "number" ? source.eta : undefined,
    distance: typeof source?.distance === "number" ? source.distance : undefined,
    techName: text(source ?? {}, ["techName"]),
    techPhone: text(source ?? {}, ["techPhone"]),
    steps: rawSteps.flatMap((step) => {
      const item = asRecord(step); const state = text(item ?? {}, ["state"]);
      return state ? [{ state, at: text(item ?? {}, ["at"]) }] : [];
    }),
  };
}
