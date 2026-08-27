import { z } from "zod";

const identifier = z.string().uuid();
const coverageMode = z.enum(["cash", "insurance"]);

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
