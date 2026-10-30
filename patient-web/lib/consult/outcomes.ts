/**
 * What a visit left the patient, read from GET /medical-reports/mine and nothing else (the same reading as the app,
 * patient-app/src/utils/appointmentOutcomes.ts): rows with `appointment_id`, `report_type`, `certificate_kind` ('sick_leave'),
 * `sick_leave` { start_date, end_date, duration_days } and `viewed_by_patient` (false until GET /medical-reports/:id opens it).
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === "object" && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

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

function rowsOf(response: unknown): Raw[] {
  const body = obj(response);
  const list = Array.isArray(response) ? response : Array.isArray(body?.data) ? body.data : Array.isArray(body?.items) ? body.items : [];
  return (list as unknown[]).map(obj).filter((r): r is Raw => r !== null);
}

/** Every report row that belongs to a visit. */
export function outcomeReports(response: unknown): OutcomeReport[] {
  return rowsOf(response).flatMap((r): OutcomeReport[] => {
    const id = str(r.id);
    const appointmentId = str(r.appointment_id);
    if (!id || !appointmentId) return [];
    const leave = obj(r.sick_leave);
    return [{
      id,
      appointmentId,
      titleAr: str(r.title_ar),
      titleEn: str(r.title_en),
      kind: r.certificate_kind === "sick_leave" ? "sick_leave" : r.report_type === "medical_certificate" ? "certificate" : "report",
      issuedAt: str(r.issued_at) ?? str(r.createdAt),
      // the server's flag only: absent means "not known", not "new"
      isNew: r.viewed_by_patient === false,
      sickLeave: leave ? { start: str(leave.start_date), end: str(leave.end_date), days: typeof leave.duration_days === "number" ? leave.duration_days : null } : null,
    }];
  });
}

/** The badge of the consultations header. */
export const newOutcomeCount = (response: unknown): number => outcomeReports(response).filter((r) => r.isNew).length;

/** The results of one visit, split by what they are. */
export function outcomesOf(response: unknown, appointmentId: string) {
  const mine = outcomeReports(response).filter((r) => r.appointmentId === appointmentId);
  return {
    sickLeaves: mine.filter((r) => r.kind === "sick_leave"),
    certificates: mine.filter((r) => r.kind === "certificate"),
    reports: mine.filter((r) => r.kind === "report"),
  };
}
