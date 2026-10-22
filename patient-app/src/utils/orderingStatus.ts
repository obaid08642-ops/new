/**
 * M6 ordering, Ord08 (waiting states), Ord09 (partial approval) and Ord10 (tracking): the clients of GET /ordering/bookings/:id,
 * /approval, /visit, /reminders, /results, POST /partial-choice and /emergency, their parsers, the stage derivation and the error
 * mapping. Backend: ordering-lifecycle.service.ts view()/visit()/reminders()/results()/emergency(), ordering-approval.service.ts
 * view()/choose(). Every amount is the server's; this file never prices anything and never adds money up.
 */
import { apiFetch } from './api';

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const list = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);

// ---------- the booking ----------

export interface BookingItem { catalog_id: string; price: number }
export interface Alternative { provider_id: string; total: number; earliest_at: string }
export interface BookingView {
  id: string;
  status: string;
  state: string | null;
  mode: 'home' | 'facility' | null;
  total: number | null;
  items: BookingItem[];
  confirmDeadlineAt: string | null;
  payment: { amount: number | null; status: string | null; refundStatus: string | null };
  alternative: Alternative | null;
}

export function parseBooking(payload: unknown): BookingView | null {
  const r = obj(payload);
  if (!r || typeof r.id !== 'string') return null;
  const pay = obj(r.payment);
  const alt = obj(r.alternative);
  return {
    id: r.id,
    status: str(r.status) ?? 'pending',
    state: str(r.state),
    mode: r.mode === 'home' || r.mode === 'facility' ? r.mode : null,
    total: num(r.total),
    items: list(r.items).flatMap((i): BookingItem[] => {
      const x = obj(i);
      const price = x ? num(x.price) : null;
      return x && typeof x.catalog_id === 'string' && price !== null ? [{ catalog_id: x.catalog_id, price }] : [];
    }),
    confirmDeadlineAt: str(r.confirm_deadline_at),
    payment: { amount: pay ? num(pay.amount) : null, status: pay ? str(pay.status) : null, refundStatus: pay ? str(pay.refund_status) : null },
    alternative: alt && str(alt.provider_id) && num(alt.total) !== null && str(alt.earliest_at)
      ? { provider_id: alt.provider_id as string, total: alt.total as number, earliest_at: alt.earliest_at as string }
      : null,
  };
}

/** The screen a booking is in, from the server's own words (lab state + booking status). */
export type Stage = 'cancelled' | 'choice' | 'insurance' | 'confirm' | 'pay' | 'active' | 'results';

export function stageOf(b: BookingView, approval: Approval | null, now: number = Date.now()): Stage {
  const state = b.state ?? '';
  if (state === 'CANCELLED' || b.status.startsWith('cancelled')) return 'cancelled';
  if (approval && !approval.final && approval.choices.length > 0) return 'choice';
  if (state === 'PENDING_INSURANCE' || b.status === 'awaiting_approval') return 'insurance';
  if (state === 'WAITING_COPAY') return 'pay';
  if (['REPORTED', 'RESULT_UPLOADED'].includes(state)) return 'results';
  if (b.confirmDeadlineAt && Date.parse(b.confirmDeadlineAt) > now - 1000 && ['NEW_REQUEST', ''].includes(state)) return 'confirm';
  return 'active';
}

/** Whole seconds left until an instant (never negative). */
export const secondsUntil = (iso: string, now: number = Date.now()): number => Math.max(0, Math.ceil((Date.parse(iso) - now) / 1000));

/** mm:ss for under an hour, h:mm:ss beyond (digits are localised by the caller). */
export function clockParts(seconds: number): { h: number; m: number; s: number } {
  const s = Math.max(0, Math.floor(seconds));
  return { h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

export const getBooking = async (id: string): Promise<BookingView> => {
  const b = parseBooking(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}`));
  if (!b) throw new Error('invalid_booking');
  return b;
};

/** The timeline of a visit, from the server's state words: keys are translation suffixes, `home` steps only for a home visit. */
export type StepKey = 'confirmed' | 'insurance' | 'assigned' | 'arrived' | 'collected' | 'results';
export function stepsOf(b: BookingView, approval: Approval | null): Array<{ key: StepKey; done: boolean }> {
  const state = b.state ?? '';
  const status = b.status;
  const collected = ['SAMPLE_COLLECTED', 'PROCESSING', 'RESULT_UPLOADED', 'REPORTED'].includes(state);
  const results = ['RESULT_UPLOADED', 'REPORTED'].includes(state);
  const arrived = status === 'in_service' || collected;
  const assigned = status === 'assigned' || arrived;
  const confirmed = assigned || status === 'confirmed' || ['CONFIRMED', 'IN_TRANSIT', 'IN_LAB'].includes(state) || collected;
  const out: Array<{ key: StepKey; done: boolean }> = [{ key: 'confirmed', done: confirmed }];
  if (approval && approval.status !== 'pending') out.push({ key: 'insurance', done: approval.final });
  if (b.mode === 'home') out.push({ key: 'assigned', done: assigned }, { key: 'arrived', done: arrived });
  out.push({ key: 'collected', done: collected }, { key: 'results', done: results });
  return out;
}

// ---------- the approval (Ord09) ----------

export type Choice = 'pay_difference' | 'covered_only' | 'cancel_free';
const CHOICES: Choice[] = ['pay_difference', 'covered_only', 'cancel_free'];
export interface ApprovalItem {
  catalog_id: string;
  decision: 'pending' | 'approved' | 'rejected';
  price: number;
  insurerShare: number | null;
  patientShare: number | null;
}
export interface Approval {
  status: string;
  estimate: boolean;
  final: boolean;
  items: ApprovalItem[];
  patientShareTotal: number | null;
  /** Before the insurer decides: the server's estimate of the patient's share (never computed here). */
  estimatedShareTotal: number | null;
  homeFee: { amount: number; covered: boolean } | null;
  validUntil: string | null;
  expiresBeforeVisit: boolean;
  rebookEarlier: boolean;
  choices: Choice[];
}

export function parseApproval(payload: unknown): Approval | null {
  const r = obj(payload);
  if (!r || typeof r.status !== 'string') return null;
  const hf = obj(r.home_fee);
  const items = list(r.items).flatMap((i): ApprovalItem[] => {
    const x = obj(i);
    const price = x ? num(x.price) : null;
    if (!x || typeof x.catalog_id !== 'string' || price === null) return [];
    const decision = x.decision === 'approved' || x.decision === 'rejected' ? x.decision : 'pending';
    return [{ catalog_id: x.catalog_id, decision, price, insurerShare: num(x.insurer_share), patientShare: num(x.patient_share) }];
  });
  return {
    status: r.status,
    estimate: r.estimate === true,
    final: r.final === true,
    items,
    patientShareTotal: num(r.patient_share_total),
    estimatedShareTotal: num(r.estimated_patient_share_total),
    homeFee: hf && num(hf.amount) !== null ? { amount: hf.amount as number, covered: hf.covered === true } : null,
    validUntil: str(r.valid_until),
    expiresBeforeVisit: r.warning === 'approval_expires_before_visit',
    rebookEarlier: r.rebook_earlier === true,
    choices: list(r.choices).filter((c): c is Choice => CHOICES.includes(c as Choice)),
  };
}

export const getApproval = async (id: string): Promise<Approval> => {
  const a = parseApproval(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/approval`));
  if (!a) throw new Error('invalid_approval');
  return a;
};

export async function sendChoice(id: string, choice: Choice): Promise<{ choice: Choice; patientShareTotal: number | null }> {
  const r = obj(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/partial-choice`, { method: 'POST', body: JSON.stringify({ choice }) }));
  if (!r || !CHOICES.includes(r.choice as Choice)) throw new Error('invalid_choice');
  return { choice: r.choice as Choice, patientShareTotal: num(r.patient_share_total) };
}

/** Items the insurer rejected (they leave the booking on "covered only"). */
export const rejectedIds = (a: Approval): string[] => a.items.filter((i) => i.decision === 'rejected').map((i) => i.catalog_id);

// ---------- the visit, reminders, results, emergency (Ord10) ----------

export interface Visit {
  status: string;
  provider: { name_ar: string | null; name_en: string | null; license: string | null; photo_url: string | null };
  staff: { name: string; license: string | null; photo_url: string | null } | null;
  arrivalCode: string | null;
}

export function parseVisit(payload: unknown): Visit | null {
  const r = obj(payload);
  if (!r) return null;
  const p = obj(r.provider);
  const s = obj(r.staff);
  const code = str(r.arrival_code);
  return {
    status: str(r.status) ?? 'pending',
    provider: { name_ar: p ? str(p.name_ar) : null, name_en: p ? str(p.name_en) : null, license: p ? str(p.license) : null, photo_url: p ? str(p.photo_url) : null },
    staff: s && str(s.name) ? { name: s.name as string, license: str(s.license), photo_url: str(s.photo_url) } : null,
    arrivalCode: code && /^[0-9]{4}$/.test(code) ? code : null,
  };
}

export const getVisit = async (id: string): Promise<Visit> => {
  const v = parseVisit(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/visit`));
  if (!v) throw new Error('invalid_visit');
  return v;
};

export type ReminderKind = 'fasting_night' | 'fasting_morning' | 'preparation';
export interface Reminder { kind: ReminderKind; at: string }
const REMINDERS: ReminderKind[] = ['fasting_night', 'fasting_morning', 'preparation'];

export function parseReminders(payload: unknown): Reminder[] {
  return list(obj(payload)?.reminders).flatMap((x): Reminder[] => {
    const r = obj(x);
    return r && REMINDERS.includes(r.kind as ReminderKind) && str(r.at) ? [{ kind: r.kind as ReminderKind, at: r.at as string }] : [];
  });
}
export const getReminders = async (id: string): Promise<Reminder[]> => parseReminders(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/reminders`));

export interface ResultValue { catalog_id: string; name: string; value: number; unit: string; low: number | null; high: number | null; flag: 'low' | 'high' | 'normal' }
export function parseResults(payload: unknown): ResultValue[] {
  return list(obj(payload)?.values).flatMap((x): ResultValue[] => {
    const v = obj(x);
    const value = v ? num(v.value) : null;
    if (!v || typeof v.catalog_id !== 'string' || value === null) return [];
    const range = obj(v.range);
    const flag = v.flag === 'low' || v.flag === 'high' ? v.flag : 'normal';
    return [{ catalog_id: v.catalog_id, name: str(v.name) ?? v.catalog_id, value, unit: str(v.unit) ?? '', low: range ? num(range.low) : null, high: range ? num(range.high) : null, flag }];
  });
}
export const getResults = async (id: string): Promise<ResultValue[]> => parseResults(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/results`));

/** POST /emergency answers the number to call (the configured urgent-help line, else 997). Only digits and a leading + survive. */
export async function pressEmergency(id: string): Promise<string> {
  const r = obj(await apiFetch<unknown>(`/ordering/bookings/${encodeURIComponent(id)}/emergency`, { method: 'POST', body: JSON.stringify({}) }));
  const call = r ? str(r.call) : null;
  if (!call || !/^[0-9+]{2,15}$/.test(call)) throw new Error('invalid_emergency');
  return call;
}

/** The route of the status screen for a booking, with its siblings of the same split basket. */
export function statusHref(groupIds: string[], focus?: string): string {
  const first = focus ?? groupIds[0];
  const rest = groupIds.filter((i) => i !== first);
  return `/diagnostics/booking-status?id=${encodeURIComponent(first)}${rest.length ? `&group=${rest.map(encodeURIComponent).join(',')}` : ''}`;
}

// ---------- errors ----------

const CODES: Array<[string, string]> = [
  ['choice_not_pending', 'ordering.err.choiceDone'],
  ['nothing_covered', 'ordering.err.nothingCovered'],
  ['booking_closed', 'ordering.err.bookingClosed'],
  ['approval_not_found', 'ordering.err.bookingGone'],
  ['booking_not_found', 'ordering.err.bookingGone'],
];
export function statusErrorKey(error: unknown): string {
  const text = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  const hit = CODES.find(([code]) => text.includes(code));
  return hit ? hit[1] : 'ordering.err.generic';
}
export const isNotFound = (error: unknown): boolean => /404|not_found|results_not_ready/.test(String((error as { message?: unknown } | null)?.message ?? error ?? ''));
