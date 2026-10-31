/**
 * M6 ordering, steps 5 and 6 (Ord06 time picker, Ord07 confirm and pay): the clients of GET /ordering/windows, POST/GET/cancel
 * /ordering/asap and POST /ordering/bookings, their parsers, the in-memory draft that carries the quote and the patient's picks from
 * the compare screen to the picker and the confirm screen, and the stable error-code mapping. Backend: ordering.service.ts windows()
 * and book(), ordering-broadcast.service.ts shape(). Nothing is invented: a field the server did not send is absent and shown as nothing.
 * Amounts are the server's; this file never prices anything.
 */
import { apiFetch } from './api';
import type { OrderingKind, OrderingMode, OrderingPayer, ProviderRow, Quote, QuoteGroup } from './ordering';
import type { MedicalOrder } from './medicalOrders';

type Raw = Record<string, unknown>;
const obj = (v: unknown): Raw | null => (v && typeof v === 'object' && !Array.isArray(v) ? (v as Raw) : null);
const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const str = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);

// ---------- the draft (memory only; the quote lives 30 minutes on the server) ----------

export interface ProviderPick { row: ProviderRow; best: boolean; items: Array<{ catalog_id: string; price: number; coverage: string | null }>; insuranceShare: number | null; patientShare: number | null; estimatedShare?: number | null }
export type TimePick =
  | { type: 'window'; start: string; end: string }
  | { type: 'slot'; id: string; start: string; end: string }
  | { type: 'walk_in' };
export interface OrderingDraft {
  kind: OrderingKind;
  payer: OrderingPayer;
  quote: Quote;
  lat: number;
  lng: number;
  /** The home place as the context bar prints it; null for a centre-only basket. */
  placeLine: string | null;
  picks: Partial<Record<OrderingMode, ProviderPick>>;
  times: Partial<Record<OrderingMode, TimePick>>;
  /** "Order now" on one test or scan: the draft was made from that one item, not from the cart, so booking it leaves the cart as it is. */
  single?: boolean;
  /** Catalogue id -> name of a one-item order (the cart does not hold it, so the pay screen cannot look it up there). */
  names?: Record<string, string>;
}

let draft: OrderingDraft | null = null;
export const getDraft = (): OrderingDraft | null => draft;
export const clearDraft = (): void => { draft = null; };

/** Starts (or, for the same quote, keeps) the draft; a new quote drops every pick and time. */
export function startDraft(init: Omit<OrderingDraft, 'picks' | 'times'>): OrderingDraft {
  if (draft && draft.quote.quote_id === init.quote.quote_id) {
    draft = { ...draft, placeLine: init.placeLine, payer: init.payer, single: init.single, names: init.names };
    return draft;
  }
  draft = { ...init, picks: {}, times: {} };
  return draft;
}

/** A group's pick: the chosen compare row, with the best match's lines and shares only when it is the best match itself. */
export function makePick(group: QuoteGroup, row: ProviderRow): ProviderPick {
  const best = group.best_match && group.best_match.provider_id === row.provider_id ? group.best_match : null;
  return {
    row,
    best: best !== null,
    items: best ? best.items : [],
    insuranceShare: best ? best.estimated_insurance_share : null,
    patientShare: best ? best.patient_share : null,
    estimatedShare: best ? best.estimated_patient_share ?? null : null,
  };
}

export function setPick(group: QuoteGroup, row: ProviderRow): OrderingDraft | null {
  if (!draft) return null;
  const same = draft.picks[group.mode]?.row.provider_id === row.provider_id;
  draft = { ...draft, picks: { ...draft.picks, [group.mode]: makePick(group, row) }, times: same ? draft.times : { ...draft.times, [group.mode]: undefined } };
  return draft;
}

export function setTime(mode: OrderingMode, time: TimePick | undefined): OrderingDraft | null {
  if (!draft) return null;
  draft = { ...draft, times: { ...draft.times, [mode]: time } };
  return draft;
}

/** The groups still without a provider (compare screen) or without a time (picker). */
export const groupsMissingPick = (d: OrderingDraft): OrderingMode[] => d.quote.groups.filter((g) => !d.picks[g.mode]).map((g) => g.mode);
export const groupsMissingTime = (d: OrderingDraft): OrderingMode[] => d.quote.groups.filter((g) => !d.times[g.mode]).map((g) => g.mode);

// ---------- windows ----------

export interface TimeWindow { start: string; end: string }
export interface Slot { id: string; start: string; end: string }
export type WindowsAnswer =
  | { kind: 'home'; asapOffered: boolean; windows: TimeWindow[] }
  | { kind: 'walk_in'; qr: boolean }
  | { kind: 'slots'; date: string | null; slots: Slot[] };

/** GET /ordering/windows answer: home -> windows (+ the ASAP entry), centre -> walk-in or the day's slots. Null when it has none of these. */
export function parseWindows(payload: unknown): WindowsAnswer | null {
  const r = obj(payload);
  if (!r) return null;
  if (Array.isArray(r.windows)) {
    const list = r.windows.map(obj).filter((w): w is Raw => w !== null);
    const windows = list.flatMap((w): TimeWindow[] => (str(w.start) && str(w.end) ? [{ start: w.start as string, end: w.end as string }] : []));
    return { kind: 'home', asapOffered: list.some((w) => w.asap === true), windows };
  }
  if (r.walk_in === true) return { kind: 'walk_in', qr: r.qr === true };
  if (Array.isArray(r.slots)) {
    const slots = r.slots.flatMap((s): Slot[] => {
      const x = obj(s);
      return x && str(x.id) && str(x.start) && str(x.end) ? [{ id: x.id as string, start: x.start as string, end: x.end as string }] : [];
    });
    return { kind: 'slots', date: str(r.date), slots };
  }
  return null;
}

export async function requestWindows(providerId: string, mode: OrderingMode, date?: string): Promise<WindowsAnswer> {
  const q = new URLSearchParams({ provider_id: providerId, mode });
  if (date) q.set('date', date);
  const answer = parseWindows(await apiFetch<unknown>(`/ordering/windows?${q.toString()}`));
  if (!answer) throw new Error('invalid_windows');
  return answer;
}

/** Local calendar day of an instant, "YYYY-MM-DD" (the picker's day chips). */
export function dayKey(iso: string): string {
  const d = new Date(iso);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** The windows grouped by day, in the order the server sent them. */
export function windowsByDay(windows: TimeWindow[]): Array<{ day: string; start: string; windows: TimeWindow[] }> {
  const out: Array<{ day: string; start: string; windows: TimeWindow[] }> = [];
  for (const w of windows) {
    const day = dayKey(w.start);
    const last = out[out.length - 1];
    if (last && last.day === day) last.windows.push(w);
    else out.push({ day, start: w.start, windows: [w] });
  }
  return out;
}

/** The next `n` local days from `from` as "YYYY-MM-DD" (the date parameter of the centre slots). */
export function nextDays(from: Date, n: number): Array<{ iso: string; at: Date }> {
  return Array.from({ length: n }, (_, i) => {
    const at = new Date(from.getFullYear(), from.getMonth(), from.getDate() + i, 12);
    return { iso: dayKey(at.toISOString()), at };
  });
}

// ---------- ASAP ----------

export type AsapStatus = 'broadcasting' | 'accepted' | 'expired' | 'cancelled';
export interface Asap {
  id: string;
  status: AsapStatus;
  stage: number;
  radius_km: number | null;
  seconds_left: number;
  booking_id: string | null;
  fallback: { provider_id: string; start: string; end: string } | null;
}
const ASAP_STATUS: AsapStatus[] = ['broadcasting', 'accepted', 'expired', 'cancelled'];

export function parseAsap(payload: unknown): Asap | null {
  const r = obj(payload);
  if (!r || typeof r.id !== 'string' || !ASAP_STATUS.includes(r.status as AsapStatus)) return null;
  const fb = obj(obj(r.fallback)?.earliest_window);
  return {
    id: r.id,
    status: r.status as AsapStatus,
    stage: num(r.stage) ?? 1,
    radius_km: num(r.radius_km),
    seconds_left: Math.max(0, num(r.seconds_left) ?? 0),
    booking_id: str(r.booking_id),
    fallback: fb && str(fb.provider_id) && str(fb.start) && str(fb.end) ? { provider_id: fb.provider_id as string, start: fb.start as string, end: fb.end as string } : null,
  };
}

/** Polling is bounded: every 3 s, at most 240 times (12 minutes, above the three stages' own end). */
export const ASAP_POLL_MS = 3000;
export const ASAP_MAX_POLLS = 240;

async function asapCall(path: string, init?: RequestInit): Promise<Asap> {
  const a = parseAsap(await apiFetch<unknown>(path, init));
  if (!a) throw new Error('invalid_asap');
  return a;
}
export const startAsap = (body: { service_kind: OrderingKind; items: string[]; lat: number; lng: number; payer: OrderingPayer }) =>
  asapCall('/ordering/asap', { method: 'POST', body: JSON.stringify(body) });
export const getAsap = (id: string) => asapCall(`/ordering/asap/${encodeURIComponent(id)}`);
export const cancelAsap = (id: string) => asapCall(`/ordering/asap/${encodeURIComponent(id)}/cancel`, { method: 'POST' });

/** Whether the basket can be sent as an ASAP broadcast: the broadcast makes its own booking for the home items, so the quote must be home only. */
export const asapAllowed = (d: OrderingDraft): boolean => d.quote.groups.length === 1 && d.quote.groups[0].mode === 'home';

// ---------- booking ----------

export type PaymentMethod = 'cash' | 'card' | 'insurance';
export interface BookingDocument { kind: 'doctor_request'; url_or_b64: string; filename?: string }
export interface ConfirmChoices {
  paymentMethod: PaymentMethod;
  genderPreference: 'female' | 'male' | null;
  medicalOrderId: string | null;
  documents: BookingDocument[];
}

/** The body of POST /ordering/bookings (ordering.dto.ts CreateOrderingBookingDto): ids and the patient's picks only, no price. */
export function buildBookingBody(d: OrderingDraft, c: ConfirmChoices): Record<string, unknown> {
  const selections: Record<string, unknown> = {};
  for (const g of d.quote.groups) {
    const pick = d.picks[g.mode];
    const time = d.times[g.mode];
    if (!pick || !time) throw new Error('selection_required');
    selections[g.mode] = {
      provider_id: pick.row.provider_id,
      ...(time.type === 'window' ? { window: { start: time.start, end: time.end } } : {}),
      ...(time.type === 'slot' ? { slot_id: time.id } : {}),
      ...(time.type === 'walk_in' ? { walk_in: true } : {}),
    };
  }
  const hasHome = d.quote.groups.some((g) => g.mode === 'home');
  return {
    quote_id: d.quote.quote_id,
    selections,
    payment_method: c.paymentMethod,
    ...(c.genderPreference && hasHome ? { gender_preference: c.genderPreference } : {}),
    ...(c.medicalOrderId ? { medical_order_id: c.medicalOrderId } : {}),
    ...(!c.medicalOrderId && c.documents.length ? { documents: c.documents } : {}),
  };
}

/** Payment methods the server accepts for this basket: insured -> insurance; cash payer -> card, plus cash when nothing is at home. */
export function paymentMethodsFor(payer: OrderingPayer, groups: QuoteGroup[]): PaymentMethod[] {
  if (payer === 'insurance') return ['insurance'];
  return groups.some((g) => g.mode === 'home') ? ['card'] : ['card', 'cash'];
}

/** Open items of the patient's valid doctor's orders that cover every catalogue id of the basket (the server checks the same). */
export function eligibleOrders(orders: MedicalOrder[], catalogIds: string[], now: number = Date.now()): MedicalOrder[] {
  return orders.filter((o) => {
    if (o.expired || Date.parse(o.valid_until) <= now) return false;
    const open = o.items.filter((i) => i.group === 'labs' && (i.status === 'open' || i.status === 'later'));
    return catalogIds.every((id) => open.some((i) => i.catalog_id === id));
  });
}

export interface CreatedBooking {
  id: string;
  /** Which booking service made it: a lab booking (/ordering) or a radiology one (/radiology/bookings). Decides the payment and the tracking route. */
  kind: 'lab' | 'radiology';
  mode: OrderingMode;
  status: string;
  total: number;
  items: Array<{ catalog_id: string; price: number; coverage: string | null }>;
}
export interface CreatedGroup { order_group_id: string; bookings: CreatedBooking[]; amount: number | null; paymentStatus: string | null }

/** POST /ordering/bookings answer; null when it has no group id or no booking. */
export function parseCreated(payload: unknown): CreatedGroup | null {
  const r = obj(payload);
  if (!r || typeof r.order_group_id !== 'string') return null;
  const bookings = (Array.isArray(r.bookings) ? r.bookings : []).flatMap((b): CreatedBooking[] => {
    const x = obj(b);
    const total = x ? num(x.total) : null;
    if (!x || typeof x.id !== 'string' || (x.mode !== 'home' && x.mode !== 'facility') || total === null) return [];
    const items = (Array.isArray(x.items) ? x.items : []).flatMap((i): CreatedBooking['items'] => {
      const l = obj(i);
      const price = l ? num(l.price) : null;
      return l && typeof l.catalog_id === 'string' && price !== null ? [{ catalog_id: l.catalog_id, price, coverage: str(l.coverage) }] : [];
    });
    return [{ id: x.id, kind: 'lab', mode: x.mode, status: str(x.status) ?? 'pending', total, items }];
  });
  if (bookings.length === 0) return null;
  const pay = obj(r.payment);
  return { order_group_id: r.order_group_id, bookings, amount: pay ? num(pay.amount) : null, paymentStatus: pay ? str(pay.status) : null };
}

export async function createBookings(d: OrderingDraft, c: ConfirmChoices): Promise<CreatedGroup> {
  const created = parseCreated(await apiFetch<unknown>('/ordering/bookings', { method: 'POST', body: JSON.stringify(buildBookingBody(d, c)) }));
  if (!created) throw new Error('invalid_booking');
  return created;
}

/**
 * A radiology basket is booked on the radiology booking route (POST /radiology/bookings: one booking per scan, the provider named as the
 * quote showed it), not on /ordering/bookings, which books labs only. Same draft, same sheet, same result shape; the card or insurance
 * payment of each booking then goes through the radiology payment kind. A retry within a few minutes returns the bookings already made
 * (the server's duplicate guard), so a failure part-way never doubles them.
 */
export async function createRadiologyBookings(d: OrderingDraft, c: ConfirmChoices): Promise<CreatedGroup> {
  const bookings: CreatedBooking[] = [];
  for (const g of d.quote.groups) {
    const pick = d.picks[g.mode];
    const time = d.times[g.mode];
    if (!pick || !time) throw new Error('selection_required');
    const scheduledAt = time.type === 'walk_in' ? new Date().toISOString() : time.start;
    for (const it of g.items) {
      const made = obj(await apiFetch<unknown>('/radiology/bookings', {
        method: 'POST',
        body: JSON.stringify({
          service_id: it.catalog_id,
          provider_id: pick.row.provider_id,
          scheduled_at: scheduledAt,
          location_type: g.mode === 'home' ? 'home' : 'facility',
          payment_method: c.paymentMethod,
          ...(c.documents.length ? { documents: c.documents } : {}),
        }),
      }));
      const id = made && typeof made.id === 'string' ? made.id : null;
      const total = made ? (num(made.total_price) ?? num(made.total)) : null;
      if (!id || total === null) throw new Error('invalid_booking');
      bookings.push({ id, kind: 'radiology', mode: g.mode, status: c.paymentMethod === 'insurance' ? 'awaiting_approval' : 'pending', total, items: [{ catalog_id: it.catalog_id, price: total, coverage: null }] });
    }
  }
  if (bookings.length === 0) throw new Error('invalid_booking');
  return { order_group_id: `radiology-${bookings[0].id}`, bookings, amount: Math.round(bookings.reduce((s, b) => s + b.total, 0) * 100) / 100, paymentStatus: 'pending' };
}

/** The booking of a basket: labs on the ordering route, radiology on the radiology booking route. */
export const submitBookings = (d: OrderingDraft, c: ConfirmChoices): Promise<CreatedGroup> => (d.kind === 'radiology' ? createRadiologyBookings(d, c) : createBookings(d, c));

/** Stable backend error codes (ordering.service.ts, ordering-broadcast.service.ts) -> the translation key of the message. */
const CODES: Array<[string, string]> = [
  ['quote_expired', 'ordering.err.quoteExpired'],
  ['quote_already_booked', 'ordering.err.quoteBooked'],
  ['quote_not_found', 'ordering.err.quoteExpired'],
  ['window_not_offered', 'ordering.err.windowGone'],
  ['slot_not_available', 'ordering.err.windowGone'],
  ['slot_required', 'ordering.err.timeRequired'],
  ['selection_required', 'ordering.err.timeRequired'],
  ['provider_not_candidate', 'ordering.err.providerGone'],
  ['mode_not_in_quote', 'ordering.err.providerGone'],
  ['mode_not_offered', 'ordering.err.providerGone'],
  ['provider_not_found', 'ordering.err.providerGone'],
  ['medical_order_required', 'ordering.err.orderRequired'],
  ['medical_order_expired', 'ordering.err.orderExpired'],
  ['medical_order_items_mismatch', 'ordering.err.orderMismatch'],
  ['medical_order_not_found', 'ordering.err.orderMismatch'],
  ['cash_not_allowed_for_home', 'ordering.err.cashHome'],
  ['payment_method_mismatch', 'ordering.err.methodMismatch'],
  ['gender_not_available', 'ordering.err.genderGone'],
  ['service_kind_not_bookable_yet', 'ordering.err.kindNotBookable'],
  ['asap_open', 'ordering.err.asapOpen'],
  ['asap_not_open', 'ordering.err.asapClosed'],
  ['asap_not_found', 'ordering.err.asapClosed'],
  ['asap_items_required', 'ordering.err.generic'],
  ['insurance_not_saved', 'ordering.err.insuranceNotSaved'],
  // the radiology booking route's own codes (radiology.service.ts book()), in the same localized words
  ['provider_cannot_perform_scan', 'ordering.err.providerGone'],
  ['scan_not_home_eligible', 'ordering.err.providerGone'],
  ['service_not_available', 'ordering.err.providerGone'],
  ['service_price_not_set', 'ordering.err.providerGone'],
  ['slot_expired', 'ordering.err.windowGone'],
  ['scheduled_at_required', 'ordering.err.timeRequired'],
  ['payment_method_cash_not_allowed_for_home_visit', 'ordering.err.cashHome'],
  ['insurance_home_requires_doctor_request_or_preauth', 'ordering.err.orderRequired'],
];
export function bookingErrorKey(error: unknown): string {
  const text = String((error as { message?: unknown } | null)?.message ?? error ?? '');
  const hit = CODES.find(([code]) => text.includes(code));
  return hit ? hit[1] : 'ordering.err.generic';
}

/** Payment error: a payment that did not start says so in the payment words, never a booking one. */
export const paymentErrorKey = (): string => 'ordering.pay.failTitle';
