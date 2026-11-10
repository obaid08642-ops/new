/**
 * The provider no-show report (owner decision 2026-11-09: the patient reports it, the money goes back at once) needs a provider side. These are its
 * rules, pure functions so the tests pin them without a database.
 */
export const DISPUTE_WINDOW_HOURS = 24;
/** A patient with this many reports in this many days is flagged for the admin (a second report within a month already is). */
export const FLAG_REPORT_COUNT = 2;
export const FLAG_WINDOW_DAYS = 30;
export const DISPUTE_REASON_MIN = 10;
/** Owner decision 2026-11-10: a patient gets at most this many automatic refunds for a reported video no-show in this many days; the next one is reviewed by an admin first. */
export const MAX_AUTO_REFUNDS = 2;
export const AUTO_REFUND_WINDOW_DAYS = 30;
/** What happens to the money of a report: video visits are refunded at once (within the cap), clinic and home visits are HELD until the provider's dispute window has closed. */
export type ReportOutcome = 'refunded' | 'held' | 'pending_review';
export function outcomeFor(serviceType: unknown, autoRefundsInWindow: number): ReportOutcome {
  if (String(serviceType) !== 'video') return 'held';
  return autoRefundsInWindow >= MAX_AUTO_REFUNDS ? 'pending_review' : 'refunded';
}
export const DISPUTE_REASON_MAX = 500;

/** States a provider-side move puts the visit in: a provider who checked in, set off or started the consultation was there. */
const ATTENDING_STATES = ['CHECKED_IN', 'EN_ROUTE', 'ARRIVED', 'IN_PROGRESS'];
const PROVIDER_ROLES = ['doctor', 'hospital', 'provider', 'admin', 'super_admin'];

export interface ActivityInput {
  doctorUserId?: string | null;
  stateHistory?: Array<{ state?: string; by_user_id?: string; by_role?: string }>;
  /** call sessions of this appointment (caller / provider ids) */
  calls?: Array<{ caller_id?: string; provider_id?: string; status?: string }>;
  /** chat messages of the visit's booking thread */
  messages?: Array<{ sender_id?: string; sender_role?: string; type?: string; is_deleted?: boolean }>;
}

/** What proves the provider was there: null when nothing does. The first kind found is returned (the order is the order of the proof's weight). */
export function providerActivity(a: ActivityInput): 'consultation_started' | 'checked_in' | 'doctor_message' | 'call_started' | null {
  const doc = a.doctorUserId ? String(a.doctorUserId) : '';
  const hist = a.stateHistory || [];
  if (hist.some((h) => String(h?.state).toUpperCase() === 'IN_PROGRESS')) return 'consultation_started';
  if (hist.some((h) => ATTENDING_STATES.includes(String(h?.state).toUpperCase()) && (String(h?.by_user_id || '') === doc || PROVIDER_ROLES.includes(String(h?.by_role || '').toLowerCase())))) return 'checked_in';
  if ((a.calls || []).some((c) => doc && String(c?.caller_id || '') === doc)) return 'call_started';
  if ((a.messages || []).some((m) => !m?.is_deleted && m?.type !== 'system' && (String(m?.sender_id || '') === doc || String(m?.sender_role || '').toLowerCase() === 'doctor'))) return 'doctor_message';
  return null;
}

export interface ReportLike { reported_at: Date | string; status: string; dispute?: { reason?: string; opened_at?: Date | string } | null }

/** The provider may dispute once, with a reason, within 24 hours of the report; a decided or already disputed report is closed to it. */
export function disputeState(r: ReportLike, now: Date): 'open' | 'already_disputed' | 'decided' | 'expired' {
  if (r.status === 'upheld' || r.status === 'dismissed') return 'decided';
  if (r.status === 'disputed' || r.dispute) return 'already_disputed';
  const deadline = new Date(r.reported_at).getTime() + DISPUTE_WINDOW_HOURS * 3600_000;
  return now.getTime() <= deadline ? 'open' : 'expired';
}

/**
 * What the platform takes back from the provider when the admin upholds the patient's report: the provider's own earning on the visit if one was credited,
 * never more than the available balance (it never takes a balance below 0) and never a negative number.
 */
export function clawbackAmount(earning: number, availableBalance: number): number {
  const e = Number(earning), a = Number(availableBalance);
  if (!Number.isFinite(e) || e <= 0 || !Number.isFinite(a) || a <= 0) return 0;
  return Math.round(Math.min(e, a) * 100) / 100;
}
