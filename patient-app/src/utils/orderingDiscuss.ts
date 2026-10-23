/**
 * Ord11 (app): "Discuss with a doctor" on a result = the M8 instant consultation. Backend:
 * POST /ordering/bookings/:id/results/discuss (a draft with the result attached), then POST /consultations/instant,
 * GET /consultations/instant/:id (poll), POST /consultations/instant/:id/cancel
 * (backend/src/modules/instant-consultation/instant-consultation.controller.ts, service.ts). Nothing is invented: a field
 * the server did not send is null and the screen shows nothing for it.
 */
import { apiFetch } from './api';

export type InstantMode = 'video' | 'audio';
export type InstantStatus = 'broadcasting' | 'accepted' | 'expired' | 'cancelled';
export type FallbackOption = 'earliest_slot' | 'refund';

export interface Draft { draftId: string; attachedResultId: string }
export interface InstantRequest {
  id: string;
  status: InstantStatus;
  expiresAt: string | null;
  secondsLeft: number | null;
  acceptedBy: string | null;
  appointmentId: string | null;
  paymentStatus: string | null;
  doctorsNotified: number | null;
  fallback: { options: FallbackOption[]; earliestSlot: unknown } | null;
}

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const STATUSES: InstantStatus[] = ['broadcasting', 'accepted', 'expired', 'cancelled'];

export function parseDraft(payload: unknown): Draft | null {
  const r = obj(payload);
  const draftId = r ? str(r.draft_id) : null;
  const attached = r ? str(r.attached_result_id) : null;
  return r && r.consultation_draft === true && draftId && attached ? { draftId, attachedResultId: attached } : null;
}

export function parseInstant(payload: unknown): InstantRequest | null {
  const r = obj(payload);
  const id = r ? str(r.id) : null;
  const status = r ? STATUSES.find((s) => s === r.status) : undefined;
  if (!r || !id || !status) return null;
  const fb = obj(r.fallback);
  const options = fb && Array.isArray(fb.options) ? fb.options.filter((o): o is FallbackOption => o === 'earliest_slot' || o === 'refund') : [];
  return {
    id, status, expiresAt: str(r.expires_at), secondsLeft: num(r.seconds_left), acceptedBy: str(r.accepted_by), appointmentId: str(r.appointment_id),
    paymentStatus: str(r.payment_status), doctorsNotified: num(r.doctors_notified), fallback: fb ? { options, earliestSlot: fb.earliest_slot ?? null } : null,
  };
}

/** Seconds left from the server's `expires_at` at `now` (never negative); falls back to the server's `seconds_left`. */
export function secondsLeft(req: Pick<InstantRequest, 'expiresAt' | 'secondsLeft'>, now: number = Date.now()): number {
  if (req.expiresAt) {
    const t = Date.parse(req.expiresAt);
    if (Number.isFinite(t)) return Math.max(0, Math.ceil((t - now) / 1000));
  }
  return req.secondsLeft ?? 0;
}

/** m:ss of a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export const openDraft = async (bookingId: string): Promise<Draft> => {
  const d = parseDraft(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(bookingId)}/results/discuss`, { method: 'POST', body: JSON.stringify({}) }));
  if (!d) throw new Error('invalid_draft');
  return d;
};

export async function startInstant(body: { specialty: string; mode: InstantMode; family_member_id?: string }): Promise<InstantRequest> {
  const r = parseInstant(await apiFetch<unknown>('/consultations/instant', { method: 'POST', body: JSON.stringify(body) }));
  if (!r) throw new Error('invalid_instant');
  return r;
}

export async function getInstant(id: string): Promise<InstantRequest> {
  const r = parseInstant(await apiFetch<unknown>(`/consultations/instant/${encodeURIComponent(id)}`));
  if (!r) throw new Error('invalid_instant');
  return r;
}

export async function cancelInstant(id: string): Promise<InstantRequest> {
  const r = parseInstant(await apiFetch<unknown>(`/consultations/instant/${encodeURIComponent(id)}/cancel`, { method: 'POST', body: JSON.stringify({}) }));
  if (!r) throw new Error('invalid_instant');
  return r;
}

const CODES: Array<[string, string]> = [
  ['instant_no_online_doctors', 'ordering.res.errNoDoctors'],
  ['instant_request_open', 'ordering.res.errOpen'],
  ['instant_specialty_required', 'ordering.res.errSpecialty'],
  ['instant_mode_invalid', 'ordering.res.errMode'],
  ['instant_already_accepted', 'ordering.res.errAccepted'],
  ['instant_request_not_found', 'ordering.res.errGone'],
  ['family_member_not_found', 'ordering.err.memberNotFound'],
  ['results_not_ready', 'ordering.res.errNotReady'],
  ['booking_not_found', 'ordering.err.bookingGone'],
];
export function discussErrorKey(error: unknown): string {
  const text = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  const hit = CODES.find(([code]) => text.includes(code));
  return hit ? hit[1] : 'ordering.res.errGeneric';
}
