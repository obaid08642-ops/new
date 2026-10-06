/**
 * Checkout, payment and insurance decision of a pharmacy order (Batch 1d, high effort: money, payment status, insurance).
 * Pure reading of what the backend sends, so a screen draws amounts, states and results that came from the server and
 * never from the client:
 *
 *   GET  /patient/pharmacy/orders/:id              the order (`governed_state`, `payment_status`, the quote snapshots,
 *                                                  `insurance_decision` and its summary; pharmacy-order.service.ts)
 *   GET  /payments/pharmacy/:id/capabilities       what is payable now: `amount`, `currency`, `methods`; it answers 400 with a
 *                                                  code when nothing is payable (payments.module.ts `getPharmacyCapabilities`)
 *   POST /payments/intent/pharmacy/:id             the transaction (`id`, `status`, `checkout_url`)
 *   POST /payments/verify/:txn                     the transaction as the gateway reports it (`status`, `amount`, `paid_at`)
 *   POST /patient/pharmacy/orders/:id/insurance/:kind/accept
 *
 * Nothing here adds up a price, a fee, a discount, a co-pay or a total. A field that is missing or not a number stays
 * `null` and the screen does not draw it. Payment is "paid" only when the order's `payment_status` or the transaction's
 * `status` says `paid`; a redirect, a query string or a flag held by the client never is.
 */
import { num, type OfferTotals } from './pharmacyOffers';
import type { DraftLine } from './pharmacy-draft';

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);
const record = (value: unknown): Record<string, unknown> | null => (value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null);
/** A response that may be wrapped in `{ data }`. */
const unwrap = (response: unknown): Record<string, unknown> | null => {
  const root = record(response);
  return record(root?.data) ?? root;
};

function readTotals(raw: unknown): OfferTotals {
  const t = record(raw) ?? {};
  return { subtotal: num(t.subtotal), deliveryFee: num(t.delivery_fee), total: num(t.total), currency: text(t.currency) };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Checkout: what is sent                                                                                              */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface CartLineInput {
  id: string;
  name: string;
  qty: number;
}

const same = (name: string) => name.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();

/**
 * The lines of a request: the prescription's, and the cart's that are not already among them (same medicine id, or the same
 * name once case and spacing are ignored). The old checkout sent the prescription's lines only and dropped the rest of the
 * cart without a word; both groups are now listed on screen so the patient sees exactly what goes out.
 */
export function checkoutLines(rx: DraftLine[], cart: CartLineInput[]): { rx: DraftLine[]; cart: DraftLine[]; all: DraftLine[]; duplicates: number } {
  const ids = new Set(rx.map((l) => l.sku ?? l.id));
  const names = new Set(rx.map((l) => same(l.name)));
  const kept: DraftLine[] = [];
  let duplicates = 0;
  for (const line of cart) {
    if (ids.has(line.id) || names.has(same(line.name))) {
      duplicates += 1;
      continue;
    }
    kept.push({ id: line.id, sku: line.id, name: line.name, qty: Math.max(1, Math.floor(line.qty) || 1), intake_source: 'cart' });
  }
  return { rx, cart: kept, all: [...rx, ...kept], duplicates };
}

export type CheckoutFailure = 'location' | 'signIn' | 'items' | 'send' | 'offline' | 'inProgress' | 'session';

/** The translation key of what the reader sees when sending a request fails (never the server's own text). */
export function checkoutErrorKey(error: unknown): string {
  const raw = errorText(error);
  if (/offline_error|request_aborted|network error/i.test(raw)) return 'errors.offline';
  if (/idempotency_request_in_progress/i.test(raw)) return 'pharmacy.checkout.err.inProgress';
  if (/AUTH_ERROR_403|insufficient role|patient_scope_required/i.test(raw)) return 'pharmacy.checkout.err.signIn';
  if (/AUTH_ERROR_401/i.test(raw)) return 'pharmacy.offers.err.session';
  if (/items_required/i.test(raw)) return 'pharmacy.checkout.err.items';
  if (/too many requests|throttl/i.test(raw)) return 'errors.tooManyRequests';
  return 'pharmacy.checkout.err.send';
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Errors and idempotency of the money steps                                                                           */
/* ------------------------------------------------------------------------------------------------------------------ */

export function errorText(error: unknown): string {
  return typeof error === 'string' ? error : error instanceof Error ? error.message : '';
}

/**
 * No answer came back, or the server says the first attempt is still running: the request may have been applied, so its
 * idempotency key is sent again by the retry. After any other answer the next attempt takes a fresh key.
 */
export function noAnswerYet(error: unknown): boolean {
  return /offline_error|request_aborted|idempotency_request_in_progress/i.test(errorText(error));
}

const PAY_ERRORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/offline_error|request_aborted|network error/i, 'errors.offline'],
  [/idempotency_request_in_progress/i, 'pharmacy.pay.err.inProgress'],
  [/booking_already_paid/i, 'pharmacy.pay.err.alreadyPaid'],
  [/payment_gateway_not_configured|payment_gateway_unavailable|service unavailable|bad gateway/i, 'pharmacy.pay.err.gateway'],
  [/payment_order_not_collectable/i, 'pharmacy.pay.err.notCollectable'],
  [/final_quote_acceptance_required/i, 'pharmacy.quote.err.acceptFirst'],
  [/copay_acceptance_required|insurance_decision_pending|insurance_rejected_acceptance_required|covered_by_insurance_no_payment_due|cod_orders_do_not_require_online_payment|selected_quote_required|invalid_amount/i, 'pharmacy.pay.err.notPayable'],
  [/secure_checkout_redirect_unavailable/i, 'pharmacy.pay.err.noPage'],
  [/booking_not_found|not_authorized|order_not_found|not_yours/i, 'pharmacy.offers.err.notFound'],
  [/AUTH_ERROR_40[13]/i, 'pharmacy.offers.err.session'],
  [/too many requests|throttl/i, 'errors.tooManyRequests'],
];

/** The translation key for a failed payment request; a code this table does not know shows the generic sentence. */
export function payErrorKey(error: unknown, fallback = 'pharmacy.pay.err.generic'): string {
  const raw = errorText(error);
  for (const [pattern, key] of PAY_ERRORS) if (pattern.test(raw)) return key;
  return fallback;
}

const INSURANCE_ERRORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/offline_error|request_aborted|network error/i, 'errors.offline'],
  [/idempotency_request_in_progress/i, 'pharmacy.pay.err.inProgress'],
  [/copay_acceptance_requires_partial_decision|self_pay_acceptance_not_applicable|insurance_decision_pending|order_has_no_insurance|invalid_insurance_acceptance_kind|insurance_acceptance_conflict|selected_quote_required/i, 'pharmacy.ins.err.state'],
  [/rejected_insurance_decision_required|rejected_order_cancellation_not_allowed_after_fulfillment|order_cancellation_conflict|allocation_cancellation_conflict|selected_allocation_required|reserved_inventory_release_conflict/i, 'pharmacy.ins.err.cancel'],
  [/order_not_found|not_yours|patient_identity_required/i, 'pharmacy.offers.err.notFound'],
  [/AUTH_ERROR_40[13]/i, 'pharmacy.offers.err.session'],
  [/too many requests|throttl/i, 'errors.tooManyRequests'],
];

export function insuranceErrorKey(error: unknown, fallback = 'pharmacy.ins.err.accept'): string {
  const raw = errorText(error);
  for (const [pattern, key] of INSURANCE_ERRORS) if (pattern.test(raw)) return key;
  return fallback;
}

/** The server already holds this acceptance (an earlier attempt landed): the screen reads the order again instead of failing. */
export function acceptanceAlreadyRecorded(error: unknown): boolean {
  return /insurance_acceptance_already_recorded/i.test(errorText(error));
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The order, as the payment and insurance screens need it                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

export type InsuranceOutcome = 'full' | 'partial' | 'rejected';

export interface InsuranceItem {
  key: string;
  name: string | null;
  outcome: InsuranceOutcome;
  lineAmount: number | null;
  covered: number | null;
  copay: number | null;
  reason: string | null;
}

export interface InsuranceView {
  outcome: InsuranceOutcome;
  /** `insurance_decision_summary.co_pay_amount`: the patient's share, as the server derived it. */
  copay: number | null;
  insurerShare: number | null;
  currency: string | null;
  items: InsuranceItem[];
  /** What the patient already accepted (`insurance_decision.patient_acceptance.kind`), null when nothing yet. */
  accepted: 'co-pay' | 'self-pay' | null;
}

export interface PayOrder {
  id: string;
  status: string;
  governedState: string | null;
  /** The order's own payment flag: `paid` once the gateway confirmed, `covered_by_insurance`, or null. */
  paymentStatus: string | null;
  paymentMethod: string | null;
  selectedOfferId: string | null;
  coverageMode: string | null;
  fulfillment: 'delivery' | 'pickup' | null;
  address: { label: string | null; line: string | null } | null;
  /** The quote's own numbers (accepted snapshot, else the chosen offer's); never added up here. */
  totals: OfferTotals;
  insurance: InsuranceView | null;
}

const DECISION: Record<string, InsuranceOutcome> = { APPROVED_FULL: 'full', APPROVED_PARTIAL: 'partial', REJECTED: 'rejected' };

function readInsurance(o: Record<string, unknown>): InsuranceView | null {
  const summary = record(o.insurance_decision_summary);
  const outcome = summary ? DECISION[String(summary.decision)] : undefined;
  if (!summary || !outcome) return null;
  const names = new Map<string, string>();
  for (const item of Array.isArray(o.items) ? o.items : []) {
    const r = record(item);
    const name = text(r?.raw_name) ?? text(r?.name_ar) ?? text(r?.name_en);
    if (r && text(r.id) && name) names.set(String(r.id), name);
  }
  const rows = Array.isArray(o.insurance_item_decisions) ? o.insurance_item_decisions : [];
  const items = rows.flatMap((row, i): InsuranceItem[] => {
    const r = record(row);
    const itemOutcome = r ? DECISION[String(r.decision)] : undefined;
    if (!r || !itemOutcome) return [];
    const id = text(r.order_item_id);
    return [{ key: id ?? String(i), name: id ? names.get(id) ?? null : null, outcome: itemOutcome, lineAmount: num(r.line_amount), covered: num(r.covered_amount), copay: num(r.co_pay_amount), reason: text(r.reason) }];
  });
  const kind = text(record(record(o.insurance_decision)?.patient_acceptance)?.kind);
  return { outcome, copay: num(summary.co_pay_amount), insurerShare: num(summary.insurer_share), currency: text(summary.currency), items, accepted: kind === 'co-pay' || kind === 'self-pay' ? kind : null };
}

function readAddress(raw: unknown): PayOrder['address'] {
  const a = record(raw);
  if (!a) return null;
  const label = text(a.label);
  const line = [text(a.street), text(a.district), text(a.city)].filter(Boolean).join(', ') || null;
  return label || line ? { label, line } : null;
}

export function readPayOrder(response: unknown): PayOrder | null {
  const o = unwrap(response);
  const id = text(o?.id);
  const status = text(o?.status);
  if (!o || !id || !status) return null;
  const shown = record(o.accepted_quote_snapshot) ?? record(o.selected_offer_snapshot) ?? record(o.pricing_snapshot);
  const fulfillment = o.fulfillment === 'pickup' ? 'pickup' : o.fulfillment === 'delivery' ? 'delivery' : null;
  return {
    id,
    status,
    governedState: text(o.governed_state),
    paymentStatus: text(o.payment_status),
    paymentMethod: text(o.payment_method),
    selectedOfferId: text(o.selected_offer_id),
    coverageMode: text(o.coverage_mode),
    fulfillment,
    address: readAddress(o.delivery_address),
    totals: readTotals(shown?.totals),
    insurance: readInsurance(o),
  };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Payment: what is payable                                                                                            */
/* ------------------------------------------------------------------------------------------------------------------ */

export interface Capabilities {
  /** What the server says is due now (the full quote, or the accepted co-pay). */
  amount: number | null;
  currency: string | null;
  methods: string[];
}

const ONLINE_METHODS = new Set(['card', 'apple-pay', 'google-pay']);

export function readCapabilities(response: unknown): Capabilities | null {
  const o = unwrap(response);
  if (!o) return null;
  const methods = (Array.isArray(o.methods) ? o.methods : []).flatMap((m) => {
    const id = text(record(m)?.id);
    return id && ONLINE_METHODS.has(id) ? [id] : [];
  });
  return { amount: num(o.amount), currency: text(o.currency), methods };
}

/** Why the server would not say what is payable (the codes of `getPharmacyCapabilities` / `pharmacyDueAmount`). */
export type PayBlock = 'acceptQuote' | 'insurance' | 'noSelection' | 'cod' | 'covered' | 'notFound' | 'other';

export function payBlock(error: unknown): PayBlock {
  const raw = errorText(error);
  if (/final_quote_acceptance_required/i.test(raw)) return 'acceptQuote';
  if (/copay_acceptance_required|insurance_decision_pending|insurance_rejected_acceptance_required/i.test(raw)) return 'insurance';
  if (/covered_by_insurance_no_payment_due/i.test(raw)) return 'covered';
  if (/cod_orders_do_not_require_online_payment/i.test(raw)) return 'cod';
  if (/selected_quote_required/i.test(raw)) return 'noSelection';
  if (/booking_not_found|not_authorized/i.test(raw)) return 'notFound';
  return 'other';
}

/** A business refusal of the capabilities call (the answer is "not payable now"), not a failure to reach the server. */
export function isPayBlock(error: unknown): boolean {
  return payBlock(error) !== 'other';
}

export type PaymentView =
  | { kind: 'paid' }
  | { kind: 'covered' }
  | { kind: 'cod' }
  | { kind: 'cancelled' }
  | { kind: 'blocked'; reason: Exclude<PayBlock, 'cod' | 'covered'> }
  | { kind: 'noMethods'; amount: number; currency: string | null }
  | { kind: 'payable'; amount: number; currency: string | null };

/**
 * What the payment screen offers, decided by the server's own flags: the order's `payment_status`, its `governed_state`
 * and the capabilities answer (`caps`, or the refusal `blocked` the server gave). The amount is the capabilities `amount`,
 * and only a positive one makes an order payable; with no method advertised nothing can be started.
 */
export function paymentView(order: PayOrder, caps: Capabilities | null, blocked: PayBlock | null): PaymentView {
  if (order.paymentStatus === 'paid') return { kind: 'paid' };
  if (order.paymentStatus === 'covered_by_insurance' || (order.governedState === 'CONFIRMED' && order.insurance?.outcome === 'full')) return { kind: 'covered' };
  if (order.governedState === 'COD_REGISTERED') return { kind: 'cod' };
  if (order.governedState === 'CANCELLED' || order.status === 'cancelled' || order.status === 'expired') return { kind: 'cancelled' };
  if (blocked === 'cod') return { kind: 'cod' };
  if (blocked === 'covered') return { kind: 'covered' };
  if (blocked) return { kind: 'blocked', reason: blocked };
  if (!caps || caps.amount === null || !(caps.amount > 0)) return { kind: 'blocked', reason: 'other' };
  if (caps.methods.length === 0) return { kind: 'noMethods', amount: caps.amount, currency: caps.currency };
  return { kind: 'payable', amount: caps.amount, currency: caps.currency };
}

export interface Intent {
  transactionId: string | null;
  /** The hosted payment page, only when it is an https address. */
  checkoutUrl: string | null;
  status: string | null;
}

export function readIntent(response: unknown): Intent {
  const o = unwrap(response);
  const url = text(o?.checkout_url);
  let https: string | null = null;
  try {
    https = url && new URL(url).protocol === 'https:' ? url : null;
  } catch {
    https = null;
  }
  return { transactionId: text(o?.id), checkoutUrl: https, status: text(o?.status) };
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* The result of a payment                                                                                             */
/* ------------------------------------------------------------------------------------------------------------------ */

export type PaymentPhase = 'paid' | 'pending' | 'failed' | 'cancelled' | 'refunded' | 'unknown';

/** The server's transaction status (payments `Transaction.status`, or the Moyasar record's) as one of the screen's phases. */
export function paymentPhase(status: unknown): PaymentPhase {
  const s = typeof status === 'string' ? status.toLowerCase() : '';
  if (s === 'paid') return 'paid';
  if (s === 'failed') return 'failed';
  if (s === 'cancelled') return 'cancelled';
  if (s === 'refunded' || s === 'partially_refunded') return 'refunded';
  if (['pending', 'initiating', 'authorized', 'initiated'].includes(s)) return 'pending';
  return 'unknown';
}

export interface PaymentResult {
  phase: PaymentPhase;
  amount: number | null;
  currency: string | null;
  paidAt: number | null;
  /** The transaction id, shortened for the reader; null when the server sent none. */
  reference: string | null;
}

/** The answer of `POST /payments/verify/:txn` (a transaction) or `GET /moyasar/payments/sync/:id` (the gateway record). */
export function readPaymentResult(response: unknown): PaymentResult | null {
  const o = unwrap(response);
  if (!o) return null;
  const phase = paymentPhase(o.status);
  const at = typeof o.paid_at === 'string' || typeof o.paid_at === 'number' ? new Date(o.paid_at).getTime() : NaN;
  const ref = text(o.id) ?? text(o.moyasar_id);
  return { phase, amount: num(o.amount), currency: text(o.currency), paidAt: Number.isFinite(at) ? at : null, reference: ref ? ref.slice(-8).toUpperCase() : null };
}

export interface ResultParams {
  /** The transaction to verify (what the payment screens pass; the callers of other services still say `moyasarId`). */
  transactionId: string | null;
  /** The gateway's own payment id (`pay_...`), as the gateway's redirect carries it in `id`. */
  gatewayId: string | null;
  bookingKind: string | null;
  bookingId: string | null;
  visitType: string | null;
}

const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || null;

/**
 * The route params of the result screen. `status`, `amount` and any other value that came through a link or a redirect is
 * not read: the result is asked of the server, never taken from the address.
 */
export function readResultParams(params: Record<string, string | string[] | undefined>): ResultParams {
  const id = first(params.transactionId) ?? first(params.moyasarId) ?? first(params.id);
  const gateway = id !== null && id.startsWith('pay_');
  return {
    transactionId: gateway ? null : id,
    gatewayId: gateway ? id : null,
    bookingKind: first(params.bookingKind),
    bookingId: first(params.bookingId) ?? first(params.orderId),
    visitType: first(params.visitType),
  };
}

/** The request that asks the server for the result of a payment; null when the link carries nothing to ask about. */
export function resultRequest(p: ResultParams): { path: string; method: 'GET' | 'POST' } | null {
  if (p.transactionId) return { path: `/payments/verify/${encodeURIComponent(p.transactionId)}`, method: 'POST' };
  if (p.gatewayId) return { path: `/moyasar/payments/sync/${encodeURIComponent(p.gatewayId)}`, method: 'GET' };
  return null;
}

/* ------------------------------------------------------------------------------------------------------------------ */
/* Where an order goes                                                                                                 */
/* ------------------------------------------------------------------------------------------------------------------ */

export type OrderRoute =
  | { pathname: '/pharmacy/broadcast-status'; params: { orderId: string } }
  | { pathname: '/pharmacy/final-quote'; params: { orderId: string } }
  | { pathname: '/pharmacy/insurance-decision'; params: { orderId: string } }
  | { pathname: '/pharmacy/order-tracking'; params: { orderId: string } };

// order statuses before an offer is chosen (backend PharmacyOrderState): the offers screen reads and explains each
const BEFORE_SELECTION = new Set(['draft', 'intake_processing', 'ready_for_split', 'broadcasting', 'awaiting_full_acceptance', 'negotiating_substitutes', 'allocating', 'partially_allocated', 'fully_allocated', 'offer_selection_pending', 'manual_review']);

/**
 * The screen that continues an order, from what the backend really produces. `governed_state` is null until an offer is
 * selected (it never says ORDER_BROADCASTING or OFFERS_READY, which older screens tested for), so an order still looking for
 * or choosing an offer is told by its `status`.
 */
export function orderRoute(order: { id: string; status?: string | null; governed_state?: string | null; payment_status?: string | null; selected_offer_id?: string | null; payment_method?: string | null }): OrderRoute {
  const orderId = order.id;
  const state = order.governed_state ?? '';
  const status = String(order.status ?? '');
  const paid = order.payment_status === 'paid';
  if (state === 'INSURANCE_PROCESSING' || state === 'INSURANCE_DECISION_READY' || state === 'CO_PAY_PENDING') return { pathname: '/pharmacy/insurance-decision', params: { orderId } };
  if (!paid && ['OFFER_SELECTED', 'FINAL_QUOTE_READY', 'FINAL_QUOTE_ACCEPTED', 'COD_REGISTERED'].includes(state)) return { pathname: '/pharmacy/final-quote', params: { orderId } };
  if (!state && order.selected_offer_id) {
    // the order list sends the stored order, without the derived `governed_state`: the status and the chosen offer tell the step
    const insurance = String(order.payment_method ?? '').toLowerCase() === 'insurance';
    if (!paid && (['insurance_decision_pending', 'waiting_copay'].includes(status) || (insurance && status === 'manual_review'))) return { pathname: '/pharmacy/insurance-decision', params: { orderId } };
    if (!paid && ['cash_card_payment_pending', 'cod_due_on_delivery'].includes(status)) return { pathname: '/pharmacy/final-quote', params: { orderId } };
    return { pathname: '/pharmacy/order-tracking', params: { orderId } };
  }
  if (!state && BEFORE_SELECTION.has(status)) return { pathname: '/pharmacy/broadcast-status', params: { orderId } };
  return { pathname: '/pharmacy/order-tracking', params: { orderId } };
}

/** A short number for an order, as the order list draws it ("#A1B2C3"). */
export function orderNumber(id: string): string {
  return id.slice(-6).toUpperCase();
}
