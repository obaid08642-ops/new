/**
 * What a visit left the patient, read from the server and nothing else (the same reading as the app,
 * patient-app/src/utils/appointmentOutcomes.ts):
 *   GET   /care/appointments/:id/outcomes        { appointment_id, sick_leaves_and_certificates[], reports[], lab_tests[], radiology_scans[], unseen_count, ... }
 *     report rows: id, report_type, certificate_kind ('sick_leave'), title_ar/en, sick_leave { start_date, end_date, duration_days }, issued_at, is_new
 *   PATCH /care/appointments/:id/outcomes/seen   marks the visit's outcomes seen
 *   GET   /care/appointments/outcomes/badge      { unseen_total, appointments[] }
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
const bodyOf = (response: unknown): Raw | null => {
  const o = obj(response);
  return obj(o?.data) ?? o;
};

export type OutcomeKind = "sick_leave" | "certificate" | "report";
export type OutcomeReport = {
  id: string;
  appointmentId: string;
  titleAr: string | null;
  titleEn: string | null;
  kind: OutcomeKind;
  issuedAt: string | null;
  isNew: boolean;
  sickLeave: { start: string | null; end: string | null; days: number | null } | null;
};


function reportRows(list: unknown, certificates: boolean): OutcomeReport[] {
  return (Array.isArray(list) ? list : []).flatMap((item): OutcomeReport[] => {
    const r = obj(item);
    const id = r ? str(r.id) : null;
    if (!r || !id) return [];
    const leave = obj(r.sick_leave);
    return [{
      id,
      appointmentId: str(r.appointment_id) ?? "",
      titleAr: str(r.title_ar),
      titleEn: str(r.title_en),
      kind: r.certificate_kind === "sick_leave" ? "sick_leave" : certificates ? "certificate" : "report",
      issuedAt: str(r.issued_at) ?? str(r.createdAt),
      isNew: r.is_new === true,
      sickLeave: leave ? { start: str(leave.start_date), end: str(leave.end_date), days: typeof leave.duration_days === "number" ? leave.duration_days : null } : null,
    }];
  });
}

export type VisitOutcomes = { sickLeaves: OutcomeReport[]; certificates: OutcomeReport[]; reports: OutcomeReport[]; unseen: number };
export const NO_OUTCOMES: VisitOutcomes = { sickLeaves: [], certificates: [], reports: [], unseen: 0 };

/** The answer of GET /care/appointments/:id/outcomes, split by what the results are; nothing when it is not an outcomes body. */
export function readOutcomes(response: unknown): VisitOutcomes {
  const b = bodyOf(response);
  if (!b || typeof b.appointment_id !== "string") return NO_OUTCOMES;
  const certificates = reportRows(b.sick_leaves_and_certificates, true);
  return {
    sickLeaves: certificates.filter((r) => r.kind === "sick_leave"),
    certificates: certificates.filter((r) => r.kind !== "sick_leave"),
    reports: reportRows(b.reports, false),
    unseen: typeof b.unseen_count === "number" ? b.unseen_count : 0,
  };
}

/** The badge of the consultations header: `unseen_total` of GET /care/appointments/outcomes/badge. */
export function readBadgeCount(response: unknown): number {
  const total = bodyOf(response)?.unseen_total;
  return typeof total === "number" && total > 0 ? total : 0;
}
