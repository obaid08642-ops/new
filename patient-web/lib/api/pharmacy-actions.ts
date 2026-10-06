// No validation library here: these builders are imported by client components, and a schema library would put its
// whole runtime into the browser bundle of every offers screen (QUALITY_STANDARDS §2, JS budget).
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const QUOTE_HASH = /^[a-f0-9]{64}$/i;

export type PharmacyCoverageMode = "cash" | "insurance";

const isUuid = (value: unknown): value is string => typeof value === "string" && UUID.test(value);
const isCoverageMode = (value: unknown): value is PharmacyCoverageMode => value === "cash" || value === "insurance";

export function buildOfferSelectionRequest(orderId: string, offerId: string, mode: unknown) {
  if (!isUuid(orderId) || !isUuid(offerId) || !isCoverageMode(mode)) return null;
  return {
    path: `/api/patient/patient/pharmacy/orders/${orderId}/offers/${offerId}/select`,
    body: { coverage_mode: mode },
  };
}

export function buildFinalQuoteAcceptanceRequest(orderId: string, hash: unknown, revision: unknown) {
  if (!isUuid(orderId) || typeof hash !== "string" || !QUOTE_HASH.test(hash) || typeof revision !== "number" || !Number.isInteger(revision) || revision <= 0) return null;
  return {
    path: `/api/patient/patient/pharmacy/orders/${orderId}/final-quote/accept`,
    body: { quote_hash: hash, quote_revision: revision },
  };
}

export function buildCodRegistrationRequest(orderId: string) {
  return isUuid(orderId) ? { path: `/api/patient/patient/pharmacy/orders/${orderId}/cod/register`, body: {} } : null;
}
