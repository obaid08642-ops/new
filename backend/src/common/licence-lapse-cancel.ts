/**
 * Licence expiry, rule D2 (owner decision 2026-11-17, lead): when a provider's licence has lapsed (account restricted, B2), the visits and orders already confirmed for the future are cancelled
 * with a 100% refund (the existing "provider cancels" refund path of every service; no money logic here), the patient is told and can rebook. A visit that starts inside the next 24 hours is kept
 * only while the licence lapsed less than 24 hours ago (a short, bounded grace for the patient already on the way); after that it is cancelled too.
 */
export const LICENCE_LAPSE_CANCEL_EVENT = 'provider.licence_lapse_cancel';
export const LICENCE_LAPSE_CANCEL_REASON = 'provider_license_expired';
export const LICENCE_LAPSE_KEEP_MS = 24 * 3600_000;

/** What the sweep emits for ONE booking; the module that owns the booking handles it with its own cancel (and so its own refund). */
export interface LicenceLapseCancelEvent {
  kind: 'appointment' | 'lab' | 'radiology' | 'home_care' | 'pharmacy_order';
  booking_id: string;
  patient_id?: string;
  provider_profile_id: string;
  lapse_at: string;
}

/**
 * Whether a booking that starts at `startMs` is cancelled now, given the instant the licence lapsed. Past or running visits are never touched (not "future"). A visit more than 24 hours away is
 * always cancelled. A visit inside the next 24 hours is kept only if the lapse is less than 24 hours old.
 */
export function shouldCancelForLapse(startMs: number, nowMs: number, lapseMs: number): boolean {
  if (![startMs, nowMs, lapseMs].every(Number.isFinite)) return false;
  if (startMs <= nowMs) return false;
  const startsWithin24h = startMs - nowMs < LICENCE_LAPSE_KEEP_MS;
  if (!startsWithin24h) return true;
  const lapsedLessThan24hAgo = nowMs - lapseMs < LICENCE_LAPSE_KEEP_MS;
  return !lapsedLessThan24hAgo;
}

/**
 * Where each provider type's confirmed future bookings live: the collection, how a booking points at its provider, the field with its start, and what "confirmed" is there. Lab and radiology
 * bookings carry the provider's ACCOUNT id; a consultation carries the doctor's PROFILE id.
 */
export interface LapseKind {
  kind: LicenceLapseCancelEvent['kind']; type: string; collection: string; start: string;
  owner: (p: { id?: string; account_id?: string; user_id?: string }) => Record<string, unknown>;
  confirmed: Record<string, unknown>;
}
const accountIds = (p: { account_id?: string; user_id?: string }) => [p.account_id, p.user_id].filter((v): v is string => typeof v === 'string' && !!v);
export const LAPSE_KINDS: Record<'appointment' | 'lab' | 'radiology', LapseKind> = {
  appointment: { kind: 'appointment', type: 'doctor', collection: 'appointments', start: 'slot_start', owner: (p) => ({ doctor_id: p.id }), confirmed: { status: 'CONFIRMED' } },
  lab: { kind: 'lab', type: 'lab', collection: 'labbookings', start: 'scheduled_at', owner: (p) => ({ provider_account_id: { $in: accountIds(p) } }), confirmed: { state: 'CONFIRMED' } },
  radiology: { kind: 'radiology', type: 'radiology', collection: 'radiologybookings', start: 'scheduled_at', owner: (p) => ({ provider_account_id: { $in: accountIds(p) } }), confirmed: { state: 'CONFIRMED' } },
};
