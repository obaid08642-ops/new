/**
 * What a visit left the patient, read from the server and nothing else.
 *
 *   GET /medical-reports/mine   rows with `appointment_id` (the visit), `report_type` ('medical_certificate' | 'consultation_note' | ...),
 *                               `certificate_kind` ('sick_leave'), `sick_leave` { start_date, end_date, duration_days },
 *                               `viewed_by_patient` (false until GET /medical-reports/:id opens it)
 *   GET /care/appointments/:id/summary   `referrals` { lab_tests[], radiology_scans[] } (catalogue codes the doctor requested)
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);

export interface OutcomeReport {
  id: string;
  appointmentId: string;
  title: { ar: string | null; en: string | null };
  kind: 'sick_leave' | 'certificate' | 'report';
  issuedAt: string | null;
  isNew: boolean;
  sickLeave: { start: string | null; end: string | null; days: number | null } | null;
}

function rowsOf(response: unknown): Raw[] {
  const body = obj(response);
  const list = Array.isArray(response) ? response : Array.isArray(body?.data) ? body?.data : Array.isArray(body?.items) ? body?.items : [];
  return (list as unknown[]).map(obj).filter((r): r is Raw => r !== null);
}

/** Every report row of GET /medical-reports/mine that belongs to a visit. */
export function outcomeReports(response: unknown): OutcomeReport[] {
  return rowsOf(response).flatMap((r): OutcomeReport[] => {
    const id = str(r.id);
    const appointmentId = str(r.appointment_id);
    if (!id || !appointmentId) return [];
    const leave = obj(r.sick_leave);
    const kind = r.certificate_kind === 'sick_leave' ? 'sick_leave' : r.report_type === 'medical_certificate' ? 'certificate' : 'report';
    const days = leave && typeof leave.duration_days === 'number' ? leave.duration_days : null;
    return [
      {
        id,
        appointmentId,
        title: { ar: str(r.title_ar), en: str(r.title_en) },
        kind,
        issuedAt: str(r.issued_at) ?? str(r.createdAt),
        // the server's flag only: absent means "not known", not "new"
        isNew: r.viewed_by_patient === false,
        sickLeave: leave ? { start: str(leave.start_date), end: str(leave.end_date), days } : null,
      },
    ];
  });
}

/** The badge of the consultations header: visit results the patient has not opened yet. */
export function newOutcomeCount(response: unknown): number {
  return outcomeReports(response).filter((r) => r.isNew).length;
}

/** The results of one visit, split by what they are. */
export function outcomesOf(response: unknown, appointmentId: string): { sickLeaves: OutcomeReport[]; certificates: OutcomeReport[]; reports: OutcomeReport[] } {
  const mine = outcomeReports(response).filter((r) => r.appointmentId === appointmentId);
  return {
    sickLeaves: mine.filter((r) => r.kind === 'sick_leave'),
    certificates: mine.filter((r) => r.kind === 'certificate'),
    reports: mine.filter((r) => r.kind === 'report'),
  };
}

export interface Referrals {
  labs: string[];
  scans: string[];
}

/** `referrals` of the visit summary: the codes the doctor requested; an empty or malformed field gives null. */
export function readReferrals(summary: unknown): Referrals | null {
  const r = obj(obj(summary)?.referrals);
  if (!r) return null;
  const list = (v: unknown) => (Array.isArray(v) ? v.map(str).filter((x): x is string => x !== null) : []);
  const labs = list(r.lab_tests);
  const scans = list(r.radiology_scans);
  return labs.length + scans.length > 0 ? { labs, scans } : null;
}
