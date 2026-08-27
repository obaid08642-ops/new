import { z } from "zod";

const record = z.record(z.string(), z.unknown());
const offerId = z.string().uuid();

export type PatientPharmacyOfferLine = {
  id: string;
  name: string;
  requestedQuantity?: number;
  offeredQuantity?: number;
  available?: boolean;
  alternative?: string;
};

export type PatientPharmacyOffer = {
  id: string;
  pharmacyName?: string;
  status?: string;
  total?: number;
  currency?: string;
  preparationMinutes?: number;
  expiresAt?: string;
  insuranceReady?: boolean;
  codAllowed?: boolean;
  quoteHash?: string;
  quoteRevision?: number;
  lines: PatientPharmacyOfferLine[];
};

export type PatientPharmacyOrderProgress = {
  governedState?: string;
  coverageMode?: "cash" | "insurance";
  acceptedQuoteHash?: string;
  acceptedQuoteRevision?: number;
  codAllowed?: boolean;
  paymentStatus?: string;
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
    requestedQuantity: numberValue(source, ["requested_qty", "requestedQuantity"]),
    offeredQuantity: numberValue(source, ["offered_qty", "offeredQuantity"]),
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
    const rawLines = Array.isArray(source.items) ? source.items : [];
    return [{
      id: id.data,
      pharmacyName: stringValue(source, ["pharmacy_name", "pharmacyName"]),
      status: stringValue(source, ["status"]),
      total: numberValue(totals ?? source, ["total", "total_price"]),
      currency: stringValue(totals ?? source, ["currency"]),
      preparationMinutes: numberValue(source, ["preparation_minutes", "preparationMinutes"]),
      expiresAt: stringValue(source, ["expires_at", "expiresAt"]),
      insuranceReady: booleanValue(source, ["insurance_ready", "insuranceReady"]),
      codAllowed: booleanValue(source, ["cod_allowed", "codAllowed"]),
      quoteHash: stringValue(source, ["snapshot_hash", "quote_hash", "quoteHash"]),
      quoteRevision: numberValue(source, ["revision", "quote_revision", "quoteRevision"]),
      lines: rawLines.flatMap((line) => {
        const parsed = parseLine(line);
        return parsed ? [parsed] : [];
      }),
    }];
  });
}

export function extractPatientPharmacyOrderProgress(payload: unknown): PatientPharmacyOrderProgress | null {
  const root = valueRecord(payload);
  const source = valueRecord(root?.data) ?? root;
  if (!source) return null;
  const acceptedSnapshot = valueRecord(source.accepted_quote_snapshot);
  const rawCoverageMode = stringValue(source, ["coverage_mode", "coverageMode"]);
  return {
    governedState: stringValue(source, ["governed_state", "governedState"]),
    coverageMode: rawCoverageMode === "cash" || rawCoverageMode === "insurance" ? rawCoverageMode : undefined,
    acceptedQuoteHash: stringValue(source, ["accepted_quote_hash", "acceptedQuoteHash"]),
    acceptedQuoteRevision: numberValue(source, ["accepted_quote_revision", "acceptedQuoteRevision"]),
    codAllowed: booleanValue(acceptedSnapshot ?? {}, ["cod_allowed", "codAllowed"]),
    paymentStatus: stringValue(source, ["payment_status", "paymentStatus"]),
  };
}
