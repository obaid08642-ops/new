// PT-08: the doctor's "Medical report" with a recommended rest period (never called "sick leave": official sick leave is issued only through Seha).
// Server: POST /provider/requests/:appointmentId/sick-leave (route name kept by the backend), PUT /provider/sick-leaves/:id/seha-number,
// POST /provider/sick-leaves/:id/revoke, GET /provider/sick-leaves.
export const MAX_REST_DAYS = 30;
export const MEDICAL_REPORTS_URL = '/provider/sick-leaves';
export const issueUrl = (appointmentId: string) => `/provider/requests/${encodeURIComponent(appointmentId)}/sick-leave`;
export const sehaUrl = (id: string) => `/provider/sick-leaves/${encodeURIComponent(id)}/seha-number`;
export const revokeUrl = (id: string) => `/provider/sick-leaves/${encodeURIComponent(id)}/revoke`;

const DAY_MS = 86_400_000;
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A real calendar day written YYYY-MM-DD, as UTC milliseconds, or null. */
export function parseDay(s: string): number | null {
  const v = (s ?? '').trim();
  if (!ISO_DAY.test(v)) return null;
  const ms = Date.parse(`${v}T00:00:00Z`);
  if (Number.isNaN(ms) || new Date(ms).toISOString().slice(0, 10) !== v) return null;
  return ms;
}

/** Days of rest from `from` to `to`, both included. */
export function restDays(from: string, to: string): number | null {
  const a = parseDay(from); const b = parseDay(to);
  if (a === null || b === null) return null;
  return Math.round((b - a) / DAY_MS) + 1;
}

/** `to` that gives `days` of rest starting `from`. */
export function endFor(from: string, days: number): string | null {
  const a = parseDay(from);
  if (a === null || !Number.isInteger(days) || days < 1) return null;
  return new Date(a + (days - 1) * DAY_MS).toISOString().slice(0, 10);
}

export type IssueProblem = 'appointment' | 'patient' | 'from' | 'to' | 'order' | 'long' | 'reason' | 'diagnosis';

export interface IssueInput {
  appointmentId?: string | null;
  patientId?: string | null;
  from: string;
  to: string;
  reason: string;
  diagnosis: string;
  showDiagnosis: boolean;
}

/** The request body, or the first problem to show. The server decides everything else (no back-dating, consultation in progress). */
export function buildIssueBody(i: IssueInput): { body: Record<string, unknown> } | { problem: IssueProblem } {
  if (!i.appointmentId) return { problem: 'appointment' };
  if (!i.patientId) return { problem: 'patient' };
  if (parseDay(i.from) === null) return { problem: 'from' };
  if (parseDay(i.to) === null) return { problem: 'to' };
  const days = restDays(i.from, i.to) as number;
  if (days < 1) return { problem: 'order' };
  if (days > MAX_REST_DAYS) return { problem: 'long' };
  const reason = i.reason.trim();
  const diagnosis = i.diagnosis.trim();
  if (!reason) return { problem: 'reason' };
  if (i.showDiagnosis && !diagnosis) return { problem: 'diagnosis' };
  return {
    body: {
      patient_id: i.patientId,
      appointment_id: i.appointmentId,
      start_date: i.from.trim(),
      duration_days: days,
      reason,
      // the server's DTO needs a diagnosis string; it is printed on the report only when show_diagnosis is true
      diagnosis: diagnosis || reason,
      show_diagnosis: i.showDiagnosis,
    },
  };
}

/** The Seha sick-leave number as the server checks it: 6-30 capital letters, digits or hyphens. Empty is allowed (the field is optional). */
export function normalizeSehaNumber(s: string): { value: string } | { invalid: true } {
  const v = (s ?? '').trim().toUpperCase();
  if (!/^[A-Z0-9-]{6,30}$/.test(v)) return { invalid: true };
  return { value: v };
}

export type SehaStatus = 'pending' | 'registered';
export const sehaStatusOf = (row: { seha_status?: string | null; seha_number?: string | null }): SehaStatus =>
  row.seha_status === 'registered' || row.seha_number ? 'registered' : 'pending';

/** Server problem codes (400 messages) that have their own wording. */
export const ISSUE_ERROR_KEYS: Record<string, string> = {
  sick_leave_before_consultation: 'medicalReport.err.beforeConsultation',
  sick_leave_start_too_late: 'medicalReport.err.startTooLate',
  sick_leave_duration_invalid: 'medicalReport.err.duration',
  sick_leave_needs_consultation: 'medicalReport.err.needsConsultation',
  sick_leave_consultation_not_started: 'medicalReport.err.notStarted',
};
export function issueErrorKey(message: unknown): string | null {
  const m = Array.isArray(message) ? String(message[0] ?? '') : String(message ?? '');
  return ISSUE_ERROR_KEYS[m] ?? null;
}
