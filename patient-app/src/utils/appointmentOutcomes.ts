/**
 * What a visit left the patient, read from the server and nothing else.
 *
 *   GET   /care/appointments/:id/outcomes        { appointment_id, prescriptions[], lab_tests[], radiology_scans[], referral, sick_leaves_and_certificates[],
 *                                                  reports[], instructions, seen_at, unseen_count } (backend appointment-outcomes.service.ts `outcomes`)
 *     lab_tests / radiology_scans   [{ code, resolved: true, id, short_code, name_ar, name_en } | { code, resolved: false }]
 *     reports rows                  id, report_type, certificate_kind ('sick_leave'), title_ar/en, sick_leave { start_date, end_date, duration_days }, issued_at, is_new
 *   PATCH /care/appointments/:id/outcomes/seen   { ok, appointment_id, seen_at }  (marks every outcome issued so far as seen)
 *   GET   /care/appointments/outcomes/badge      { unseen_total, appointments: [{ appointment_id, unseen }] }
 */
type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v.trim() ? v.trim() : null);
/** The body, whether the client hands it over bare or still inside `{ data }`. */
const bodyOf = (response: unknown): Raw | null => {
  const o = obj(response);
  return obj(o?.data) ?? o;
};

export interface OutcomeReport {
  id: string;
  appointmentId: string;
  title: { ar: string | null; en: string | null };
  kind: 'sick_leave' | 'certificate' | 'report';
  issuedAt: string | null;
  isNew: boolean;
  sickLeave: { start: string | null; end: string | null; days: number | null } | null;
}

function reportRows(list: unknown, certificates: boolean): OutcomeReport[] {
  return (Array.isArray(list) ? list : []).flatMap((item): OutcomeReport[] => {
    const r = obj(item);
    const id = r ? str(r.id) : null;
    if (!r || !id) return [];
    const leave = obj(r.sick_leave);
    const kind = r.certificate_kind === 'sick_leave' ? 'sick_leave' : certificates ? 'certificate' : 'report';
    const days = leave && typeof leave.duration_days === 'number' ? leave.duration_days : null;
    return [{ id, appointmentId: str(r.appointment_id) ?? '', title: { ar: str(r.title_ar), en: str(r.title_en) }, kind, issuedAt: str(r.issued_at) ?? str(r.createdAt), isNew: r.is_new === true, sickLeave: leave ? { start: str(leave.start_date), end: str(leave.end_date), days } : null }];
  });
}

/** A lab test or scan the doctor requested: resolved to a catalogue row by the server, or a code it could not match. */
export type ReferralItem = { code: string; resolved: true; id: string; name: { ar: string | null; en: string | null } } | { code: string; resolved: false };

function referralItems(list: unknown): ReferralItem[] {
  return (Array.isArray(list) ? list : []).flatMap((item): ReferralItem[] => {
    const r = obj(item);
    const code = r ? str(r.code) : null;
    if (!r || !code) return [];
    const id = str(r.id);
    return r.resolved === true && id ? [{ code, resolved: true, id, name: { ar: str(r.name_ar), en: str(r.name_en) } }] : [{ code, resolved: false }];
  });
}

export interface VisitOutcomes {
  sickLeaves: OutcomeReport[];
  certificates: OutcomeReport[];
  reports: OutcomeReport[];
  labs: ReferralItem[];
  scans: ReferralItem[];
  unseen: number;
}

/** The answer of GET /care/appointments/:id/outcomes; null when it is not an outcomes body. */
export function readOutcomes(response: unknown): VisitOutcomes | null {
  const b = bodyOf(response);
  if (!b || typeof b.appointment_id !== 'string') return null;
  const certificates = reportRows(b.sick_leaves_and_certificates, true);
  return {
    sickLeaves: certificates.filter((r) => r.kind === 'sick_leave'),
    certificates: certificates.filter((r) => r.kind !== 'sick_leave'),
    reports: reportRows(b.reports, false),
    labs: referralItems(b.lab_tests),
    scans: referralItems(b.radiology_scans),
    unseen: typeof b.unseen_count === 'number' ? b.unseen_count : 0,
  };
}

/** True when the visit has a report, a sick leave, a certificate or a referral to show. */
export const hasOutcomes = (o: VisitOutcomes | null): o is VisitOutcomes => !!o && o.sickLeaves.length + o.certificates.length + o.reports.length + o.labs.length + o.scans.length > 0;

/** The badge of the consultations header: `unseen_total` of GET /care/appointments/outcomes/badge (0 when the body is not one). */
export function readBadgeCount(response: unknown): number {
  const total = bodyOf(response)?.unseen_total;
  return typeof total === 'number' && total > 0 ? total : 0;
}
