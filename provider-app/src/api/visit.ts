import client from './client';

/**
 * P22.6 — provider-side visit-quality API (doctor-triggered).
 *
 * Backend (sibling branch p22-b, read-only here):
 * - POST  /care/appointments/:id/report-late  { delay_minutes: 5..180 }  (DOCTOR, ADMIN)
 * - PATCH /care/appointments/:id/no-show      {}                         (DOCTOR, ADMIN)
 * - POST  /care/appointments/:id/finish       FinishAppointmentDto        (DOCTOR, HOME_CARE)
 * - GET   /care/appointments/:id/summary                                 (owner/doctor/facility/admin)
 * - GET   /care/appointments/:id/report.pdf   (visit report PDF download)
 */

export interface ReportLateResult {
  id: string;
  delay_minutes: number;
  auto: boolean;
}

export interface NoShowResult {
  id?: string;
  status?: string;
  noshow_fee?: number;
  [k: string]: unknown;
}

export interface VisitSummaryInput {
  diagnosis?: string;
  notes?: string;
  recommendations?: string;
  prescription?: Array<{ name?: string; dose?: string; duration?: string }>;
  follow_up_recommended?: boolean;
  follow_up_window_days?: number;
}

function requireId(id: string): string {
  const v = String(id || '').trim();
  if (!v) throw new Error('appointment_id_required');
  return v;
}

/** Provider declares running late. Server clamps to 5..180; validate early for honest UI errors. */
export async function reportRunningLate(appointmentId: string, delayMinutes: number): Promise<ReportLateResult> {
  const id = requireId(appointmentId);
  const delay = Math.floor(Number(delayMinutes));
  if (!Number.isFinite(delay) || delay < 5 || delay > 180) throw new Error('delay_minutes_out_of_range');
  const res = await client.post(`/care/appointments/${encodeURIComponent(id)}/report-late`, {
    delay_minutes: delay,
  });
  return (res.data?.data || res.data) as ReportLateResult;
}

/** Provider marks a past confirmed visit as patient no-show. Server applies the admin-set fee policy. */
export async function markAppointmentNoShow(appointmentId: string): Promise<NoShowResult> {
  const id = requireId(appointmentId);
  const res = await client.patch(`/care/appointments/${encodeURIComponent(id)}/no-show`, {});
  return (res.data?.data || res.data) as NoShowResult;
}

/**
 * Visit-summary creation (the same SOAP summary the patient later reads via
 * GET summary / report.pdf). Requires at least one content field — the server
 * only persists (and the UI only enables) when content exists.
 */
export async function finishVisitSummary(appointmentId: string, input: VisitSummaryInput): Promise<unknown> {
  const id = requireId(appointmentId);
  const body: VisitSummaryInput = {};
  if (input.diagnosis?.trim()) body.diagnosis = input.diagnosis.trim();
  if (input.notes?.trim()) body.notes = input.notes.trim();
  if (input.recommendations?.trim()) body.recommendations = input.recommendations.trim();
  if (Array.isArray(input.prescription) && input.prescription.length) body.prescription = input.prescription;
  if (input.follow_up_recommended !== undefined) body.follow_up_recommended = !!input.follow_up_recommended;
  if (input.follow_up_window_days !== undefined) body.follow_up_window_days = Number(input.follow_up_window_days);
  if (!body.diagnosis && !body.notes && !body.recommendations && !body.prescription) {
    throw new Error('summary_content_required');
  }
  const res = await client.post(`/care/appointments/${encodeURIComponent(id)}/finish`, body);
  return res.data?.data || res.data;
}

/** Read back the persisted visit summary (404 → not published yet). */
export async function getVisitSummary(appointmentId: string): Promise<unknown> {
  const id = requireId(appointmentId);
  const res = await client.get(`/care/appointments/${encodeURIComponent(id)}/summary`);
  return res.data?.data || res.data;
}

/** Relative path of the downloadable visit-report PDF (P22.9 backend). */
export function visitReportPdfPath(appointmentId: string): string {
  const id = requireId(appointmentId);
  return `/care/appointments/${encodeURIComponent(id)}/report.pdf`;
}
