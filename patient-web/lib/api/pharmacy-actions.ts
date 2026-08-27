import { z } from "zod";

const identifier = z.string().uuid();
const coverageMode = z.enum(["cash", "insurance"]);
const quoteHash = z.string().regex(/^[a-f0-9]{64}$/i);
const quoteRevision = z.number().int().positive();

export type PharmacyCoverageMode = z.infer<typeof coverageMode>;

export function buildOfferSelectionRequest(orderId: string, offerId: string, mode: unknown) {
  const order = identifier.safeParse(orderId);
  const offer = identifier.safeParse(offerId);
  const coverage = coverageMode.safeParse(mode);
  if (!order.success || !offer.success || !coverage.success) return null;
  return {
    path: `/api/patient/patient/pharmacy/orders/${order.data}/offers/${offer.data}/select`,
    body: { coverage_mode: coverage.data },
  };
}

export function buildFinalQuoteAcceptanceRequest(orderId: string, hash: unknown, revision: unknown) {
  const order = identifier.safeParse(orderId);
  const parsedHash = quoteHash.safeParse(hash);
  const parsedRevision = quoteRevision.safeParse(revision);
  if (!order.success || !parsedHash.success || !parsedRevision.success) return null;
  return {
    path: `/api/patient/patient/pharmacy/orders/${order.data}/final-quote/accept`,
    body: { quote_hash: parsedHash.data, quote_revision: parsedRevision.data },
  };
}

export function buildCodRegistrationRequest(orderId: string) {
  const order = identifier.safeParse(orderId);
  return order.success ? { path: `/api/patient/patient/pharmacy/orders/${order.data}/cod/register`, body: {} } : null;
}
