import { z } from "zod";
import { governedStep } from "@/lib/pharmacy/governed-step";

const record = z.record(z.string(), z.unknown());
const offerId = z.string().uuid();

export type PatientPharmacyOfferLine = {
  id: string;
  name: string;
  requestedQuantity?: number;
  offeredQuantity?: number;
  /** The pharmacy's own unit price for the line, as sent (the client never multiplies or sums it). */
  unitPrice?: number;
  available?: boolean;
  alternative?: string;
};

export type PatientPharmacyOffer = {
  id: string;
  pharmacyName?: string;
  status?: string;
  /** The server's totals of the offer (`totals.subtotal`, `totals.delivery_fee`, `totals.total`), drawn as sent. */
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  currency?: string;
  preparationMinutes?: number;
  /** When the pharmacy's price stops being valid (server field `expires_at`, else `quote_expires_at`). */
  expiresAt?: string;
  /** issue 512: the server's clock when it answered, so the countdown does not depend on the viewer's clock. */
  serverTime?: string;
  insuranceReady?: boolean;
  codAllowed?: boolean;
  quoteHash?: string;
  quoteRevision?: number;
  approxDistanceKm?: number;
  providerNote?: string;
  lines: PatientPharmacyOfferLine[];
};

/** A quote as the order carries it: the immutable snapshot the patient accepts (hash and revision from the server). */
export type PatientPharmacyQuote = {
  hash?: string;
  revision?: number;
  subtotal?: number;
  deliveryFee?: number;
  total?: number;
  currency?: string;
};

export type PatientPharmacyOrderProgress = {
  /** The order's own status (`draft`, `broadcasting`, `cash_card_payment_pending` ...). */
  status?: string;
  governedState?: string;
  coverageMode?: "cash" | "insurance";
  /** The selected offer (`selected_offer_snapshot`, `selected_offer_hash`, `selected_offer_revision`). */
  selectedQuote?: PatientPharmacyQuote;
  /** A revised final quote waiting for acceptance (`pending_final_quote_*`). */
  pendingQuote?: PatientPharmacyQuote;
  acceptedQuoteHash?: string;
  acceptedQuoteRevision?: number;
  acceptedQuoteTotal?: number;
  codAllowed?: boolean;
  paymentStatus?: string;
  /** The order's own items (id and names), so a decision or a conversation can name the item instead of its id. */
  items?: Array<{ id: string; nameAr?: string; nameEn?: string; rawName?: string }>;
  insurance?: {
    decision?: string;
    coPayAmount?: number;
    coveredAmount?: number;
    items: Array<{ id: string; decision?: string; lineAmount?: number; coveredAmount?: number; coPayAmount?: number; reason?: string }>;
  };
};

function valueRecord(value: unknown) {
  const parsed = record.safeParse(value);
  return parsed.success ? parsed.data : undefined;
}

function stringValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "string" && value.trim()) return value;
  }
  return undefined;
}

function numberValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = source[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function booleanValue(source: Record<string, unknown>, keys: string[]) {
  for (const key of keys) if (typeof source[key] === "boolean") return source[key];
  return undefined;
}

function parseLine(value: unknown): PatientPharmacyOfferLine | undefined {
  const source = valueRecord(value);
  if (!source) return undefined;
  const id = stringValue(source, ["order_item_id", "orderItemId", "id"]);
  const name = stringValue(source, ["name_ar", "name_en", "name", "sku"]);
  if (!id || !name) return undefined;
  return {
    id,
    name,
    requestedQuantity: numberValue(source, ["requested_qty", "requestedQuantity", "qty_requested"]),
    offeredQuantity: numberValue(source, ["offered_qty", "offeredQuantity", "qty_offered"]),
    unitPrice: numberValue(source, ["unit_price", "unitPrice"]),
    available: booleanValue(source, ["available"]),
    alternative: stringValue(source, ["alternative"]),
  };
}

export function extractPatientPharmacyOffers(payload: unknown): PatientPharmacyOffer[] {
  const root = valueRecord(payload);
  const values = Array.isArray(payload) ? payload : [root?.data, root?.offers, root?.items].find(Array.isArray);
  if (!Array.isArray(values)) return [];
  return values.flatMap((value) => {
    const source = valueRecord(value);
    if (!source) return [];
    const id = offerId.safeParse(stringValue(source, ["id", "offer_id", "offerId"]));
    if (!id.success) return [];
    const totals = valueRecord(source.totals);
    // The server sends the named lines in `lines` (the shared governed contract) and the bare priced rows in `items`,
    // which carry no product name: read `lines` first, `items` only when the API has no `lines`.
    const rawLines = Array.isArray(source.lines) ? source.lines : Array.isArray(source.items) ? source.items : [];
    return [{
      id: id.data,
      pharmacyName: stringValue(source, ["pharmacy_name", "pharmacyName"]),
      status: stringValue(source, ["status"]),
      subtotal: numberValue(totals ?? {}, ["subtotal"]),
      deliveryFee: numberValue(totals ?? {}, ["delivery_fee", "deliveryFee"]),
      total: numberValue(totals ?? source, ["total", "total_price"]),
      currency: stringValue(totals ?? source, ["currency"]),
      preparationMinutes: numberValue(source, ["preparation_minutes", "preparationMinutes", "estimated_preparation_minutes"]),
      expiresAt: stringValue(source, ["expires_at", "expiresAt", "quote_expires_at"]),
      serverTime: stringValue(source, ["server_time"]),
      insuranceReady: booleanValue(source, ["insurance_ready", "insuranceReady"]),
      codAllowed: booleanValue(source, ["cod_allowed", "codAllowed"]),
      quoteHash: stringValue(source, ["snapshot_hash", "quote_hash", "quoteHash"]),
      quoteRevision: numberValue(source, ["revision", "quote_revision", "quoteRevision"]),
      approxDistanceKm: numberValue(source, ["approx_distance_km", "approxDistanceKm"]),
      providerNote: stringValue(source, ["provider_note", "providerNote"]),
      lines: rawLines.flatMap((line) => {
        const parsed = parseLine(line);
        return parsed ? [parsed] : [];
      }),
    }];
  });
}

function parseQuote(snapshot: unknown, hash: unknown, revision: unknown): PatientPharmacyQuote | undefined {
  const source = valueRecord(snapshot);
  if (!source) return undefined;
  const totals = valueRecord(source.totals);
  const quote: PatientPharmacyQuote = {
    hash: typeof hash === "string" && hash ? hash : stringValue(source, ["hash"]),
    revision: typeof revision === "number" && Number.isInteger(revision) ? revision : undefined,
    subtotal: numberValue(totals ?? {}, ["subtotal"]),
    deliveryFee: numberValue(totals ?? {}, ["delivery_fee", "deliveryFee"]),
    total: numberValue(totals ?? {}, ["total"]),
    currency: stringValue(totals ?? {}, ["currency"]),
  };
  return quote.total === undefined && quote.hash === undefined ? undefined : quote;
}

/** The quote the patient is asked to accept: a revised one while the order is FINAL_QUOTE_READY, else the selected offer's. */
export function quoteToAccept(progress: PatientPharmacyOrderProgress | null | undefined): PatientPharmacyQuote | undefined {
  if (!progress) return undefined;
  return progress.governedState === "FINAL_QUOTE_READY" ? progress.pendingQuote : progress.selectedQuote;
}

export function extractPatientPharmacyOrderProgress(payload: unknown): PatientPharmacyOrderProgress | null {
  const root = valueRecord(payload);
  const source = valueRecord(root?.data) ?? root;
  if (!source) return null;
  const acceptedSnapshot = valueRecord(source.accepted_quote_snapshot);
  const rawCoverageMode = stringValue(source, ["coverage_mode", "coverageMode"]);
  const summary = valueRecord(source.insurance_decision_summary);
  const items = Array.isArray(source.insurance_item_decisions) ? source.insurance_item_decisions.flatMap((value) => {
    const item = valueRecord(value);
    const id = item ? stringValue(item, ["order_item_id", "orderItemId", "id"]) : undefined;
    return id ? [{ id, decision: stringValue(item!, ["decision"]), lineAmount: numberValue(item!, ["line_amount", "lineAmount"]), coveredAmount: numberValue(item!, ["covered_amount", "coveredAmount"]), coPayAmount: numberValue(item!, ["co_pay_amount", "coPayAmount"]), reason: stringValue(item!, ["reason"])}] : [];
  }) : [];
  const orderItems = Array.isArray(source.items) ? source.items.flatMap((value) => {
    const item = valueRecord(value);
    const id = item ? stringValue(item, ["id", "order_item_id"]) : undefined;
    return id ? [{ id, nameAr: stringValue(item!, ["name_ar"]), nameEn: stringValue(item!, ["name_en"]), rawName: stringValue(item!, ["raw_name", "name"]) }] : [];
  }) : [];
  return {
    status: stringValue(source, ["status"]),
    items: orderItems.length ? orderItems : undefined,
    governedState: governedStep(stringValue(source, ["governed_state", "governedState"])),
    coverageMode: rawCoverageMode === "cash" || rawCoverageMode === "insurance" ? rawCoverageMode : undefined,
    selectedQuote: parseQuote(source.selected_offer_snapshot, source.selected_offer_hash, source.selected_offer_revision),
    pendingQuote: parseQuote(source.pending_final_quote_snapshot, source.pending_final_quote_hash, source.pending_final_quote_revision),
    acceptedQuoteHash: stringValue(source, ["accepted_quote_hash", "acceptedQuoteHash"]),
    acceptedQuoteRevision: numberValue(source, ["accepted_quote_revision", "acceptedQuoteRevision"]),
    acceptedQuoteTotal: numberValue(valueRecord(acceptedSnapshot?.totals) ?? {}, ["total"]),
    codAllowed: booleanValue(acceptedSnapshot ?? {}, ["cod_allowed", "codAllowed"]),
    paymentStatus: stringValue(source, ["payment_status", "paymentStatus"]),
    insurance: summary || items.length ? {
      decision: stringValue(summary ?? {}, ["decision"]),
      coPayAmount: numberValue(summary ?? {}, ["co_pay_amount", "coPayAmount"]),
      // The server's summary names the insurer's part `insurer_share`; `covered_amount` is the older spelling.
      coveredAmount: numberValue(summary ?? {}, ["covered_amount", "coveredAmount", "insurer_share"]),
      items,
    } : undefined,
  };
}
