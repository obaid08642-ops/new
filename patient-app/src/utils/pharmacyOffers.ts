/**
 * Pharmacy offers and the final quote (Batch 1c). Pure reading of what the backend sends, so the screens draw
 * numbers, states and expiry that came from the server and never from the client:
 *
 *   GET  /patient/pharmacy/orders/:id/offers   the submitted, unexpired offers (backend pharmacy-offer.service.ts
 *                                              `listForPatient` / `patientDtoAsync`)
 *   GET  /patient/pharmacy/orders/:id          the order with `status`, `governed_state` and the quote snapshots
 *                                              (pharmacy-order.service.ts `detail` / `governedView`)
 *
 * Nothing here computes a price, a fee or a total. A field that is missing or not a number stays `null`, and the
 * screen does not draw it.
 */

export interface OfferLine {
  key: string;
  name: string | null;
  available: boolean;
  offeredQty: number | null;
  unitPrice: number | null;
  alternative: string | null;
}

export interface OfferTotals {
  subtotal: number | null;
  deliveryFee: number | null;
  total: number | null;
  currency: string | null;
}

export interface OfferView {
  id: string;
  /** The server's status; the patient endpoint answers `open` for a submitted offer. */
  status: string;
  open: boolean;
  nameAr: string | null;
  nameEn: string | null;
  /** Approximate straight-line distance in km, rounded by the server to 0.5; null when the server could not place it. */
  distanceKm: number | null;
  /** The server's estimate of preparation time. */
  prepMinutes: number | null;
  /** `quote_expires_at` as epoch milliseconds; null when the server sent none or an unreadable one. */
  expiresAt: number | null;
  totals: OfferTotals;
  lines: OfferLine[];
  availableCount: number;
  allAvailable: boolean;
  /** The server's flag; `false` only when it says so. */
  insuranceReady: boolean;
  note: string | null;
}

/** A finite number from a number or a numeric string; null for anything else (null, '', objects). */
export function num(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

const text = (value: unknown): string | null => (typeof value === 'string' && value.trim() !== '' ? value.trim() : null);

function readTotals(raw: unknown): OfferTotals {
  const t = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  return { subtotal: num(t.subtotal), deliveryFee: num(t.delivery_fee), total: num(t.total), currency: text(t.currency) };
}

function readLines(raw: unknown): OfferLine[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((l): l is Record<string, unknown> => Boolean(l) && typeof l === 'object')
    .map((l, i) => ({
      key: text(l.order_item_id) ?? text(l.id) ?? text(l.sku) ?? String(i),
      name: text(l.name) ?? text(l.sku),
      available: l.available === true,
      offeredQty: num(l.offered_qty),
      unitPrice: num(l.unit_price),
      alternative: text(l.alternative),
    }));
}

export function parseOffer(raw: unknown): OfferView | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = text(o.id);
  if (!id) return null;
  const lines = readLines(o.lines);
  const availableCount = lines.filter((l) => l.available).length;
  const expires = typeof o.expires_at === 'string' || typeof o.expires_at === 'number' ? new Date(o.expires_at as string | number).getTime() : NaN;
  // #512: the server sends its clock; the expiry is moved onto this phone's clock so a wrong phone time does not skew the countdown.
  const serverNow = typeof o.server_time === 'string' ? new Date(o.server_time).getTime() : NaN;
  const localExpires = Number.isFinite(expires) && Number.isFinite(serverNow) ? Date.now() + (expires - serverNow) : expires;
  const status = text(o.status) ?? 'open';
  return {
    id,
    status,
    open: status === 'open',
    nameAr: text(o.pharmacy_name_ar) ?? null,
    nameEn: text(o.pharmacy_name_en) ?? null,
    distanceKm: num(o.approx_distance_km),
    prepMinutes: num(o.preparation_minutes),
    expiresAt: Number.isFinite(localExpires) ? localExpires : null,
    totals: readTotals(o.totals),
    lines,
    availableCount,
    allAvailable: lines.length > 0 && availableCount === lines.length,
    insuranceReady: o.insurance_ready !== false,
    note: text(o.provider_note),
  };
}

/** The offers of a response: a bare array or `{ data: [...] }`. A malformed row is dropped, never invented. */
export function parseOffers(response: unknown): OfferView[] {
  const rows = Array.isArray(response) ? response : response && typeof response === 'object' && Array.isArray((response as { data?: unknown }).data) ? (response as { data: unknown[] }).data : [];
  return rows.map(parseOffer).filter((o): o is OfferView => o !== null);
}

/** The pharmacy's name in the reader's language, the other language when only that one exists, null when the server sent none. */
export function offerName(offer: OfferView, lang: string): string | null {
  return lang === 'ar' || lang === 'ur' ? offer.nameAr ?? offer.nameEn : offer.nameEn ?? offer.nameAr;
}

export type OfferSort = 'price' | 'nearest' | 'fastest';

/** Orders the offers by one of the server's numbers; an offer without that number goes last. Never mutates. */
export function sortOffers(offers: OfferView[], by: OfferSort): OfferView[] {
  const key = (o: OfferView): number | null => (by === 'price' ? o.totals.total : by === 'nearest' ? o.distanceKm : o.prepMinutes);
  return offers
    .map((o, i) => ({ o, i, v: key(o) }))
    .sort((a, b) => (a.v === null ? 1 : b.v === null ? -1 : a.v - b.v || a.i - b.i))
    .map((x) => x.o);
}

/** The ids of the cheapest offers (same server total), only when there is more than one offer to compare. */
export function lowestPriceIds(offers: OfferView[]): Set<string> {
  const priced = offers.filter((o) => o.totals.total !== null);
  if (priced.length < 2) return new Set();
  const min = Math.min(...priced.map((o) => o.totals.total as number));
  return new Set(priced.filter((o) => o.totals.total === min).map((o) => o.id));
}

/** Whole seconds left before the server's expiry; 0 once passed; null when the server sent no expiry. */
export function secondsLeft(offer: OfferView, now: number): number | null {
  return offer.expiresAt === null ? null : Math.max(0, Math.ceil((offer.expiresAt - now) / 1000));
}

export interface OrderState {
  status: string;
  governedState: string | null;
  selectedOfferId: string | null;
  selectedAllocationId: string | null;
  coverageMode: string | null;
  paymentMode: string | null;
  paymentMethod: string | null;
}

export function parseOrder(response: unknown): OrderState | null {
  const raw = response && typeof response === 'object' ? ((response as { data?: unknown }).data ?? response) : null;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const status = text(o.status);
  if (!status) return null;
  return {
    status,
    governedState: text(o.governed_state),
    selectedOfferId: text(o.selected_offer_id),
    selectedAllocationId: text(o.selected_allocation_id),
    coverageMode: text(o.coverage_mode),
    paymentMode: text(o.payment_mode),
    paymentMethod: text(o.payment_method),
  };
}

/** Where the order is, as far as the offers screen is concerned. */
export type OfferPhase = 'searching' | 'selected' | 'cancelled' | 'review' | 'draft';

// the order states after the patient chose an offer (backend PharmacyOrderState)
const AFTER_SELECTION = new Set(['cash_card_payment_pending', 'cod_due_on_delivery', 'insurance_decision_pending', 'waiting_copay', 'confirmed', 'in_fulfillment', 'out_for_delivery', 'delivered', 'completed']);

/** `searching` while the broadcast can still bring offers; when the order itself is not known the screen treats it as searching. */
export function offerPhase(order: OrderState | null): OfferPhase {
  if (!order) return 'searching';
  if (order.status === 'cancelled') return 'cancelled';
  if (order.selectedOfferId || AFTER_SELECTION.has(order.status)) return 'selected';
  if (order.status === 'draft') return 'draft';
  if (order.status === 'manual_review') return 'review';
  return 'searching';
}

/** The screen that continues an order whose offer was already chosen (the same split the order list and confirmation use). */
export function postSelectionRoute(order: OrderState | null): '/pharmacy/final-quote' | '/pharmacy/insurance-decision' | '/pharmacy/order-tracking' {
  const state = order?.governedState ?? '';
  if (['OFFER_SELECTED', 'FINAL_QUOTE_READY', 'FINAL_QUOTE_ACCEPTED', 'COD_REGISTERED'].includes(state)) return '/pharmacy/final-quote';
  if (['INSURANCE_PROCESSING', 'INSURANCE_DECISION_READY', 'CO_PAY_PENDING'].includes(state)) return '/pharmacy/insurance-decision';
  return '/pharmacy/order-tracking';
}

export type Coverage = 'cash' | 'insurance';

/** What the order was created for: insurance when its own saved payment mode says so, otherwise a direct payment. */
export function defaultCoverage(order: OrderState | null): Coverage {
  return order?.paymentMode === 'insurance' || order?.paymentMethod === 'insurance' ? 'insurance' : 'cash';
}

/** The order id of the route: the current param is `orderId`; `requestId` is what older links and the old redirect carried. */
export function orderIdParam(params: { orderId?: string | string[]; requestId?: string | string[] }): string | undefined {
  const first = (v?: string | string[]) => (Array.isArray(v) ? v[0] : v);
  return first(params.orderId) || first(params.requestId) || undefined;
}

const ERRORS: ReadonlyArray<readonly [RegExp, string]> = [
  [/offline_error|request_aborted|network error/i, 'errors.offline'],
  [/another_offer_already_selected|offer_not_selectable|offer_selection_conflict|selection_replay_incomplete/i, 'pharmacy.offers.err.unavailable'],
  [/offer_stock_changed_requote_required/i, 'pharmacy.offers.err.stock'],
  [/prescription_required_for_insurance_orders/i, 'pharmacy.offers.err.rxInsurance'],
  [/invalid_coverage_mode/i, 'pharmacy.offers.err.generic'],
  [/cannot_cancel_in_|order_not_actionable/i, 'pharmacy.offers.err.notActionable'],
  [/quote_hash_or_revision_mismatch|selected_quote_required|quote_hash_required|quote_revision_required/i, 'pharmacy.quote.err.changed'],
  [/insurance_orders_follow_insurance_decision_flow/i, 'pharmacy.quote.err.insurance'],
  [/final_quote_acceptance_required/i, 'pharmacy.quote.err.acceptFirst'],
  [/order_not_found|not_yours|patient_identity_required|patient_scope_required/i, 'pharmacy.offers.err.notFound'],
  [/AUTH_ERROR_40[13]/i, 'pharmacy.offers.err.session'],
  [/too many requests|throttl/i, 'errors.tooManyRequests'],
];

/**
 * The translation key of what the reader sees when a request of the offers flow fails. The server's code is mapped
 * to a sentence; a code this table does not know shows the generic key, never the raw server text.
 */
export function offerErrorKey(error: unknown, fallback = 'pharmacy.offers.err.generic'): string {
  const raw = typeof error === 'string' ? error : error instanceof Error ? error.message : '';
  for (const [pattern, key] of ERRORS) if (pattern.test(raw)) return key;
  return fallback;
}

/** After these the offer list on screen is stale and is read again. */
export function errorMeansStale(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return /another_offer_already_selected|offer_not_selectable|offer_selection_conflict|offer_stock_changed_requote_required|selection_replay_incomplete/i.test(raw);
}

/** A request that may have reached the server (no answer came back): its idempotency key must be sent again on retry. */
export function mayHaveReachedServer(error: unknown): boolean {
  const raw = error instanceof Error ? error.message : String(error ?? '');
  return /offline_error|request_aborted/i.test(raw);
}

/**
 * A key the server accepts (`/^[A-Za-z0-9._:-]{16,128}$/`). The same parts and nonce give the same key, so a retry of one
 * attempt is recognised as a replay; a new attempt takes a new nonce.
 */
export function idemKey(scope: string, parts: string[], nonce: string): string {
  return `mobile-${scope}-${parts.join('-')}-${nonce}`.replace(/[^A-Za-z0-9._:-]/g, '').slice(0, 128);
}

export function selectionKey(orderId: string, offerId: string, coverage: Coverage, nonce: string): string {
  return idemKey('offer', [orderId, offerId, coverage], nonce);
}

export interface QuoteLine {
  key: string;
  name: string | null;
  qty: number | null;
  unitPrice: number | null;
  action: 'available' | 'substitute' | 'unavailable';
}

/** The lines of the chosen pharmacy's allocation (`allocations_detail[]` of the order), as the server stored them. */
export function allocationLines(response: unknown, allocationId: string | null): QuoteLine[] {
  const raw = response && typeof response === 'object' ? ((response as { data?: unknown }).data ?? response) : null;
  const allocs = raw && typeof raw === 'object' ? (raw as { allocations_detail?: unknown }).allocations_detail : null;
  if (!Array.isArray(allocs) || !allocationId) return [];
  const match = allocs.find((a) => a && typeof a === 'object' && (a as { id?: unknown }).id === allocationId) as { items?: unknown } | undefined;
  if (!match || !Array.isArray(match.items)) return [];
  return match.items
    .filter((i): i is Record<string, unknown> => Boolean(i) && typeof i === 'object')
    .map((i, n) => ({
      key: text(i.order_item_id) ?? text(i.id) ?? String(n),
      name: text(i.name) ?? text(i.sku),
      qty: num(i.qty_offered),
      unitPrice: num(i.unit_price),
      action: i.action === 'unavailable' ? 'unavailable' : i.action === 'substitute' ? 'substitute' : 'available',
    }));
}

export interface QuoteView {
  /** What the screen offers to do. */
  kind: 'accept' | 'accepted' | 'cod' | 'none' | 'cancelled';
  /** The server's numbers of the quote on screen. */
  totals: OfferTotals;
  hash: string | null;
  revision: number | null;
  governedState: string | null;
  codAllowed: boolean;
  cashCoverage: boolean;
}

/**
 * What the final-quote screen shows for an order, taken from `governed_state` and the snapshots the server attached.
 * The amount to accept is the snapshot's own `totals.total`; the hash and revision sent back are the snapshot's own.
 */
export function quoteView(response: unknown): QuoteView | null {
  const raw = response && typeof response === 'object' ? ((response as { data?: unknown }).data ?? response) : null;
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const state = text(o.governed_state);
  const pending = state === 'FINAL_QUOTE_READY';
  const snap = (pending ? o.pending_final_quote_snapshot : o.selected_offer_snapshot) as Record<string, unknown> | undefined;
  const accepted = o.accepted_quote_snapshot as Record<string, unknown> | undefined;
  const shown = state === 'FINAL_QUOTE_ACCEPTED' || state === 'COD_REGISTERED' ? accepted ?? snap : snap;
  const totals = readTotals(shown?.totals);
  const hash = text(pending ? o.pending_final_quote_hash : o.selected_offer_hash);
  const rawRevision = pending ? o.pending_final_quote_revision : o.selected_offer_revision;
  const revision = typeof rawRevision === 'number' && Number.isInteger(rawRevision) ? rawRevision : null;
  const cashCoverage = o.coverage_mode === 'cash';
  const codAllowed = accepted?.cod_allowed === true;
  let kind: QuoteView['kind'] = 'none';
  if (state === 'CANCELLED') kind = 'cancelled';
  else if ((state === 'OFFER_SELECTED' || pending) && hash && revision !== null && totals.total !== null && totals.total >= 0) kind = 'accept';
  else if (state === 'FINAL_QUOTE_ACCEPTED') kind = 'accepted';
  else if (state === 'COD_REGISTERED') kind = 'cod';
  return { kind, totals, hash, revision, governedState: state, codAllowed, cashCoverage };
}
