/**
 * Licence expiry, rule D2 (owner decision 2026-11-17, lead): when a provider's licence has lapsed (account restricted, B2), the visits and orders already confirmed for the future are cancelled
 * with a 100% refund (the existing "provider cancels" refund path of every service; no money logic here), the patient is told and can rebook. A visit that starts inside the next 24 hours is kept
 * only while the licence lapsed less than 24 hours ago (a short, bounded grace for the patient already on the way); after that it is cancelled too.
 */
import { Types } from 'mongoose';

export const LICENCE_LAPSE_CANCEL_EVENT = 'provider.licence_lapse_cancel';
export const LICENCE_LAPSE_CANCEL_REASON = 'provider_license_expired';
export const LICENCE_LAPSE_KEEP_MS = 24 * 3600_000;

/** What the sweep emits for ONE booking; the module that owns the booking handles it with its own cancel (and so its own refund). */
export interface LicenceLapseCancelEvent {
  kind: 'appointment' | 'lab' | 'radiology' | 'radiology_center' | 'home_care' | 'pharmacy_allocation';
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
 * bookings carry the provider's ACCOUNT id; a consultation carries the doctor's PROFILE id. Reviewed for health-fields (common/health-fields-raw-access.spec.ts): the sweep reads these collections through
 * a variable name, with a projection of id / patient_id / start only, so it touches no encrypted health field; the cancel itself runs through each service.
 */
export interface LapseKind {
  kind: LicenceLapseCancelEvent['kind']; types: string[]; collection: string; start: string | null;
  owner: (p: { id?: string; account_id?: string; user_id?: string }) => Record<string, unknown>;
  confirmed: Record<string, unknown>;
}
const accountIds = (p: { account_id?: string; user_id?: string }) => [p.account_id, p.user_id].filter((v): v is string => typeof v === 'string' && !!v);
export const LAPSE_KINDS: Record<'appointment' | 'lab' | 'radiology' | 'radiology_center' | 'home_care' | 'pharmacy_allocation', LapseKind> = {
  appointment: { kind: 'appointment', types: ['doctor'], collection: 'appointments', start: 'slot_start', owner: (p) => ({ doctor_id: p.id }), confirmed: { status: 'CONFIRMED' } },
  lab: { kind: 'lab', types: ['lab'], collection: 'labbookings', start: 'scheduled_at', owner: (p) => ({ provider_account_id: { $in: accountIds(p) } }), confirmed: { state: 'CONFIRMED' } },
  radiology: { kind: 'radiology', types: ['radiology'], collection: 'radiologybookings', start: 'scheduled_at', owner: (p) => ({ provider_account_id: { $in: accountIds(p) } }), confirmed: { state: 'CONFIRMED' } },
  // Home care: the booking's `provider_id` is the provider ACCOUNT id; "confirmed" before the nurse is on the way (the nursing refund listener refunds a non-patient cancel in full, and keeps the trip fee only after IN_TRANSIT).
  home_care: { kind: 'home_care', types: ['home_care', 'nursing', 'nurse'], collection: 'homecarebookings', start: 'scheduled_at', owner: (p) => ({ provider_id: { $in: accountIds(p) } }), confirmed: { state: { $in: ['CONFIRMED', 'PROVIDER_ASSIGNED'] } } },
  // Pharmacy: an order has no scheduled time, so what the pharmacy has not started (its allocation is awaiting review, partially confirmed or confirmed; not preparing, ready or out for delivery) counts as
  // starting NOW: kept for the first 24 h after the lapse (the same grace as a visit inside the next 24 h), cancelled after that. The unit is the pharmacy's ALLOCATION of the order (`booking_id` is the
  // allocation id); the allocation's own cancel cancels the order when it was the only live one.
  pharmacy_allocation: { kind: 'pharmacy_allocation', types: ['pharmacy'], collection: 'pharmacy_allocations', start: null, owner: (p) => ({ pharmacy_account_id: { $in: accountIds(p) } }), confirmed: { status: { $in: ['pending_review', 'partially_confirmed', 'confirmed'] } } },
  // Radiology CENTRE bookings (the older system, `radiologycenterbookings`): no scheduled time (so, as for a pharmacy allocation, what the centre has not started counts as starting now: kept for the first 24 h
  // after the lapse, cancelled after), the centre is an ObjectId in `radiology_center_id` (the provider's user/account id), accepted bookings are ACCEPTED (or CONFIRMED in the ops vocabulary the schema also allows).
  radiology_center: { kind: 'radiology_center', types: ['radiology'], collection: 'radiologycenterbookings', start: null, owner: (p) => ({ radiology_center_id: { $in: accountIds(p).filter((v) => Types.ObjectId.isValid(v) && String(new Types.ObjectId(v)) === v).map((v) => new Types.ObjectId(v)) } }), confirmed: { status: { $in: ['ACCEPTED', 'CONFIRMED'] } } },
};
