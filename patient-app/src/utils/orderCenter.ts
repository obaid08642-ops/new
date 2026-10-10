/**
 * "My orders" (Batch 1e): the one list of everything the patient asked for, built from what each service's own endpoint
 * returns. Pure reading; a field the server did not send stays out of the row and the screen does not draw it.
 *
 *   GET /care/appointments          appointments (`status`, `slot_start`, `doctor_name`, `total_price` / `price`)
 *   GET /orders/mine                the legacy pharmacy orders (`state`, `items`)
 *   GET /patient/pharmacy/orders    governed pharmacy orders (`status`, `items`, `pricing_snapshot.totals`)
 *   GET /labs/bookings/mine         lab bookings (`state`, `total`, `scheduled_at`)
 *   GET /radiology/bookings/mine    radiology bookings (`state`, `total`)
 *   GET /home-care/bookings/my      nursing visits (`state`, `total_price`, `address`)
 *   GET /insurance/claims           claims (`service`, `amount`, `status`)
 *   GET /pharmacy/returns           returns (`reason`, `amount`, `status`)
 *
 * A status the table below does not know is shown as "status not available", never as the server's raw code.
 */
import { SERVICE_ICONS, type FillIconName, type ServiceTone } from '../../../packages/ui/icons/fill';
import { orderNumber, orderRoute } from './pharmacyCheckout';
import { governedStep } from './pharmacyOffers';
import { num } from './pharmacyOffers';

export type OrderKind = 'doctors' | 'pharmacy' | 'labs' | 'radiology' | 'nursing' | 'insurance' | 'returns';
export type Bucket = 'current' | 'previous';
export type PillTone = ServiceTone | 'danger' | 'neutral';

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
/** The list of a response that may be a bare array or wrapped as `{ data }` / `{ items }`. */
export function listOf(response: unknown): Record<string, unknown>[] {
  const root = record(response);
  const raw = Array.isArray(response) ? response : Array.isArray(root?.data) ? root?.data : Array.isArray(root?.items) ? root?.items : [];
  return (raw as unknown[]).filter((x): x is Record<string, unknown> => record(x) !== null);
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Status                                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface StatusLook {
  /** The suffix of the translation key `orders.status.<label>`. */
  label: string;
  tone: PillTone;
  bucket: Bucket;
}

const s = (label: string, tone: PillTone, bucket: Bucket): StatusLook => ({ label, tone, bucket });

/** An order number as the reader sees it ("#A1B2C3"), kept as one left-to-right run inside Arabic and Urdu text. */
export const hashRef = (number: string): string => `\u200E#${number}\u200E`;

/** The tone of the Orders board's cards, rows and "moving" chips: the pharmacy's own tone of the service map. */
export const ORDERS_TONE: ServiceTone = SERVICE_ICONS.pharmacy.tone;

/**
 * The states of the services' own state machines (backend PharmacyOrderState, ApptState, LabBookingState,
 * RadiologyBookingState, NursingBookingState and the legacy OrderState), upper-cased. The tone is the board's chip:
 * amber while the patient or a provider has to act, coral while it is moving, mint when it is done, blue while it
 * is being looked at.
 */
const STATUS: Record<string, StatusLook> = {
  // waiting
  PENDING: s('awaitingConfirmation', 'amber', 'current'),
  NEW_REQUEST: s('awaitingConfirmation', 'amber', 'current'),
  NEW: s('awaitingConfirmation', 'amber', 'current'),
  CREATED: s('awaitingConfirmation', 'amber', 'current'),
  VALIDATED: s('awaitingConfirmation', 'amber', 'current'),
  PHARMACY_RECEIVED: s('awaitingConfirmation', 'amber', 'current'),
  DRAFT: s('draft', 'neutral', 'current'),
  OFFER_SELECTION_PENDING: s('chooseOffer', 'amber', 'current'),
  CASH_CARD_PAYMENT_PENDING: s('awaitingPayment', 'amber', 'current'),
  COD_DUE_ON_DELIVERY: s('payOnDelivery', 'blue', 'current'),
  WAITING_COPAY: s('awaitingCopay', 'amber', 'current'),
  WAITING_PATIENT_APPROVAL: s('awaitingApproval', 'amber', 'current'),
  // looked at
  INTAKE_PROCESSING: s('findingOffers', 'blue', 'current'),
  READY_FOR_SPLIT: s('findingOffers', 'blue', 'current'),
  BROADCASTING: s('findingOffers', 'blue', 'current'),
  BROADCAST: s('findingOffers', 'blue', 'current'),
  AWAITING_FULL_ACCEPTANCE: s('findingOffers', 'blue', 'current'),
  NEGOTIATING_SUBSTITUTES: s('findingOffers', 'blue', 'current'),
  ALLOCATING: s('findingOffers', 'blue', 'current'),
  PARTIALLY_ALLOCATED: s('findingOffers', 'blue', 'current'),
  FULLY_ALLOCATED: s('findingOffers', 'blue', 'current'),
  INSURANCE_DECISION_PENDING: s('insuranceReview', 'blue', 'current'),
  PENDING_INSURANCE: s('insuranceReview', 'blue', 'current'),
  MANUAL_REVIEW: s('underReview', 'blue', 'current'),
  UNDER_REVIEW: s('underReview', 'blue', 'current'),
  ESCALATED_TO_ADMIN: s('underReview', 'blue', 'current'),
  BASKET_REVIEW: s('underReview', 'blue', 'current'),
  // accepted and moving
  CONFIRMED: s('confirmed', 'mint', 'current'),
  ACCEPTED: s('confirmed', 'mint', 'current'),
  PAYMENT_COMPLETED: s('confirmed', 'mint', 'current'),
  RESCHEDULED: s('rescheduled', 'amber', 'current'),
  PROVIDER_ASSIGNED: s('providerAssigned', ORDERS_TONE, 'current'),
  IN_FULFILLMENT: s('preparing', ORDERS_TONE, 'current'),
  PREPARING: s('preparing', ORDERS_TONE, 'current'),
  READY: s('ready', ORDERS_TONE, 'current'),
  READY_FOR_DISPATCH: s('ready', ORDERS_TONE, 'current'),
  OUT_FOR_DELIVERY: s('onTheWay', ORDERS_TONE, 'current'),
  ASSIGNED_TO_DELIVERY: s('onTheWay', ORDERS_TONE, 'current'),
  IN_TRANSIT: s('onTheWay', ORDERS_TONE, 'current'),
  ARRIVED: s('arrived', ORDERS_TONE, 'current'),
  CHECKED_IN: s('arrived', ORDERS_TONE, 'current'),
  ARRIVED_CHECKIN: s('arrived', ORDERS_TONE, 'current'),
  IN_PROGRESS: s('inProgress', ORDERS_TONE, 'current'),
  CARE_IN_PROGRESS: s('inProgress', ORDERS_TONE, 'current'),
  IN_SCANNING: s('inProgress', ORDERS_TONE, 'current'),
  IN_LAB: s('inProgress', ORDERS_TONE, 'current'),
  PROCESSING: s('processing', ORDERS_TONE, 'current'),
  REPORT_DRAFT: s('processing', ORDERS_TONE, 'current'),
  SAMPLE_COLLECTED: s('sampleCollected', ORDERS_TONE, 'current'),
  ESCALATED_EMERGENCY: s('escalated', 'danger', 'current'),
  ACTIVE: s('active', ORDERS_TONE, 'current'),
  // done
  DELIVERED: s('delivered', 'mint', 'previous'),
  COMPLETED: s('completed', 'mint', 'previous'),
  PARTIALLY_FULFILLED: s('partiallyFulfilled', 'mint', 'previous'),
  RESULT_UPLOADED: s('resultReady', 'mint', 'previous'),
  REPORT_READY: s('resultReady', 'mint', 'previous'),
  REPORT_PUBLISHED: s('resultReady', 'mint', 'previous'),
  REPORTED: s('resultReady', 'mint', 'previous'),
  APPROVED: s('approved', 'mint', 'previous'),
  PARTIAL_APPROVAL: s('partialApproval', 'amber', 'previous'),
  REIMBURSED: s('reimbursed', 'mint', 'previous'),
  RESOLVED: s('resolved', 'mint', 'previous'),
  // ended without service
  CANCELLED: s('cancelled', 'danger', 'previous'),
  SCAN_ABORTED: s('cancelled', 'danger', 'previous'),
  REJECTED: s('rejected', 'danger', 'previous'),
  SAMPLE_REJECTED: s('rejected', 'danger', 'previous'),
  NO_SHOW: s('noShow', 'danger', 'previous'),
  EXPIRED: s('expired', 'neutral', 'previous'),
  REFUNDED: s('refunded', 'neutral', 'previous'),
};

/**
 * Claims and returns say `pending` and `processing` in their own sense (under review), which the appointment and order
 * tables read as "awaiting confirmation"; they get their own small table.
 */
const REVIEWED: Record<string, StatusLook> = {
  PENDING: s('underReview', 'blue', 'current'),
  PROCESSING: s('underReview', 'blue', 'current'),
};

const UNKNOWN: StatusLook = s('unknown', 'neutral', 'current');

export const STATUS_LABELS: readonly string[] = [...new Set([...Object.values(STATUS), ...Object.values(REVIEWED), UNKNOWN].map((x) => x.label))];

export function statusLook(kind: OrderKind, status: string | null | undefined): StatusLook {
  const code = String(status ?? '').trim().toUpperCase();
  if ((kind === 'insurance' || kind === 'returns') && REVIEWED[code]) return REVIEWED[code];
  return STATUS[code] ?? UNKNOWN;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Rows                                                                                                                */
/* ------------------------------------------------------------------------------------------------------------------ */

/** The line under the title: a translation key with its slots, or text the server wrote (a name, an address). */
export type SubLine = { key: string; n?: number; ref?: string } | { text: string };

export type RowAction = 'track' | 'details' | 'reorder';

export type RowRoute = { pathname: string; params?: Record<string, string> };

export interface OrderRow {
  key: string;
  id: string;
  kind: OrderKind;
  /** The name the server gave (a doctor, a service); null = the screen names the kind. */
  title: string | null;
  sub: SubLine | null;
  status: string;
  look: StatusLook;
  /** Epoch ms, null when the server sent none or an unreadable one. */
  at: number | null;
  amount: { value: number; currency: string | null } | null;
  /** The pharmacy order number shown as "#A1B2C3". */
  number: string | null;
  /** null = nothing to open (no screen can show this row). */
  route: RowRoute | null;
  action: RowAction | null;
}

/** Icon and tone of a kind: the handoff's service map (the board draws a pill in coral, test-tube in mint). */
export const KIND_ICON: Record<OrderKind, { icon: FillIconName; tone: ServiceTone }> = {
  doctors: SERVICE_ICONS.consult,
  pharmacy: SERVICE_ICONS.pharmacy,
  labs: SERVICE_ICONS.lab,
  radiology: SERVICE_ICONS.radiology,
  nursing: SERVICE_ICONS.nursing,
  insurance: SERVICE_ICONS.insurance,
  returns: { icon: 'arrows-left-right', tone: SERVICE_ICONS.radiology.tone },
};

function time(value: unknown): number | null {
  if (typeof value !== 'string' && typeof value !== 'number') return null;
  const at = new Date(value).getTime();
  return Number.isFinite(at) ? at : null;
}

/** The first positive amount among the fields the service really stores, in the order given. */
function firstAmount(o: Record<string, unknown>, fields: string[]): { value: number; currency: string | null } | null {
  for (const field of fields) {
    const value = num(o[field]);
    if (value !== null && value > 0) return { value, currency: null };
  }
  return null;
}

/** The address of a booking: a text, or an object with its own line. */
export function addressText(raw: unknown): string | null {
  if (typeof raw === 'string') return text(raw);
  const a = record(raw);
  if (!a) return null;
  return text(a.address) ?? text(a.formatted_address) ?? text(a.street) ?? text(a.line1) ?? text(a.label);
}

const idOf = (o: Record<string, unknown>) => text(o.id) ?? text(o._id);

function row(kind: OrderKind, o: Record<string, unknown>, status: string, extra: Partial<OrderRow>): OrderRow | null {
  const id = idOf(o);
  if (!id) return null;
  return { key: `${kind}-${id}`, id, kind, title: null, sub: null, status, look: statusLook(kind, status), at: time(o.createdAt), amount: null, number: null, route: null, action: null, ...extra };
}

/** Pharmacy statuses after which "track" is the useful action (an offer was accepted and the order moves). */
const TRACKED = new Set(['confirmed', 'in_fulfillment', 'out_for_delivery', 'cod_due_on_delivery']);
const REORDERABLE = new Set(['delivered', 'completed']);

function pharmacyRow(o: Record<string, unknown>): OrderRow | null {
  const status = text(o.status) ?? '';
  const id = idOf(o);
  if (!id) return null;
  const items = Array.isArray(o.items) ? o.items.length : 0;
  const snapshot = record(o.pricing_snapshot);
  const total = num(record(snapshot?.totals)?.total);
  const currency = text(record(snapshot?.totals)?.currency);
  const next = orderRoute({ id, status, governed_state: governedStep(o.governed_state), payment_status: text(o.payment_status), selected_offer_id: text(o.selected_offer_id), payment_method: text(o.payment_method) });
  const lower = status.toLowerCase();
  const reorder = REORDERABLE.has(lower);
  return row('pharmacy', o, status, {
    sub: items > 0 ? { key: items === 1 ? 'pharmacy.hub.oneItem' : 'pharmacy.hub.items', n: items } : null,
    amount: total !== null && total > 0 ? { value: total, currency } : null,
    number: orderNumber(id),
    // the order list sends the stored order, so orderRoute reads its status and chosen offer (see pharmacyCheckout.ts)
    route: reorder ? { pathname: '/pharmacy/reorder', params: { orderId: id } } : next,
    action: reorder ? 'reorder' : TRACKED.has(lower) ? 'track' : 'details',
  });
}

/** The rows of every source. `sources` holds the raw answers; a source that failed is simply absent. */
export interface OrderSources {
  appointments?: unknown;
  legacyOrders?: unknown;
  pharmacyOrders?: unknown;
  labs?: unknown;
  radiology?: unknown;
  nursing?: unknown;
  claims?: unknown;
  returns?: unknown;
}

/** The server's own name of a service, in the language asked (`name_<lang>` falls back to the other of ar / en). */
export type PickName = (ar: unknown, en: unknown) => string | null;

export function buildRows(src: OrderSources, pick: PickName): OrderRow[] {
  const rows: OrderRow[] = [];
  const push = (r: OrderRow | null) => {
    if (r) rows.push(r);
  };

  for (const a of listOf(src.appointments)) {
    const id = idOf(a);
    const type = text(a.service_type);
    push(
      row('doctors', a, text(a.status) ?? 'PENDING', {
        title: text(a.doctor_name) ?? text(a.doctorName),
        sub: type === 'video' ? { key: 'orders.sub.video' } : type === 'home' ? { key: 'orders.sub.home' } : { key: 'orders.sub.clinic' },
        at: time(a.slot_start) ?? time(a.createdAt),
        amount: firstAmount(a, ['total_price', 'price']),
        route: id ? { pathname: '/consultations/appointment-detail', params: { appointmentId: id } } : null,
        action: 'details',
      }),
    );
  }
  for (const o of listOf(src.legacyOrders)) {
    const items = Array.isArray(o.items) ? o.items.length : 0;
    // the legacy orders have no screen of their own: the governed order screens do not know their ids
    push(row('pharmacy', o, text(o.state) ?? text(o.status) ?? 'PENDING', { sub: items > 0 ? { key: items === 1 ? 'pharmacy.hub.oneItem' : 'pharmacy.hub.items', n: items } : text(o.pharmacy_name) ? { text: text(o.pharmacy_name) as string } : null, number: idOf(o) ? orderNumber(idOf(o) as string) : null }));
  }
  for (const o of listOf(src.pharmacyOrders)) push(pharmacyRow(o));
  for (const b of listOf(src.labs)) {
    push(
      row('labs', b, text(b.state) ?? text(b.status) ?? 'NEW_REQUEST', {
        title: pick(b.service_name_ar, b.service_name_en) ?? pick(b.package_name_ar, b.package_name_en),
        sub: b.visit_type === 'home' ? { key: 'orders.sub.labHome' } : { key: 'orders.sub.labVisit' },
        at: time(b.scheduled_at) ?? time(b.createdAt),
        amount: firstAmount(b, ['total', 'total_price']),
        route: idOf(b) ? { pathname: '/diagnostics/order/[id]', params: { id: idOf(b) as string } } : null,
        action: 'details',
      }),
    );
  }
  for (const b of listOf(src.radiology)) {
    const center = text(b.center_name);
    push(
      row('radiology', b, text(b.state) ?? text(b.status) ?? 'NEW_REQUEST', {
        title: pick(b.service_name_ar, b.service_name_en),
        sub: center ? { text: center } : null,
        at: time(b.scheduled_at) ?? time(b.createdAt),
        amount: firstAmount(b, ['total', 'total_price']),
        route: idOf(b) ? { pathname: '/diagnostics/order/[id]', params: { id: idOf(b) as string } } : null,
        action: 'details',
      }),
    );
  }
  for (const b of listOf(src.nursing)) {
    const id = idOf(b);
    const address = addressText(b.address);
    push(
      row('nursing', b, text(b.state) ?? 'NEW_REQUEST', {
        title: pick(b.service_name_ar, b.service_name_en),
        sub: address ? { text: address } : null,
        at: time(b.scheduled_at) ?? time(b.createdAt),
        amount: firstAmount(b, ['total_price']),
        route: id ? { pathname: '/nursing/live-tracking', params: { bookingId: id, type: 'nurse' } } : null,
        action: 'track',
      }),
    );
  }
  for (const c of listOf(src.claims)) {
    push(
      row('insurance', c, text(c.status) ?? 'pending', {
        title: text(c.service),
        at: time(c.date) ?? time(c.createdAt),
        amount: firstAmount(c, ['amount']),
        route: { pathname: '/insurance', params: { tab: 'claims' } },
        action: 'details',
      }),
    );
  }
  for (const r of listOf(src.returns)) {
    const id = idOf(r);
    const orderId = text(r.order_id);
    push(
      row('returns', r, text(r.status) ?? 'processing', {
        title: text(r.reason),
        sub: orderId ? { key: 'orders.sub.returnOf', ref: orderNumber(orderId) } : null,
        amount: firstAmount(r, ['amount']),
        route: id ? { pathname: '/returns/detail', params: { returnId: id } } : null,
        action: 'details',
      }),
    );
  }

  return rows.sort((a, b) => (b.at ?? 0) - (a.at ?? 0));
}

export function inBucket(rows: OrderRow[], bucket: Bucket): OrderRow[] {
  return rows.filter((r) => r.look.bucket === bucket);
}
