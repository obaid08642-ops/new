import { describe, expect, it } from "vitest";
import { buildCodRegistrationRequest, buildFinalQuoteAcceptanceRequest, buildOfferSelectionRequest } from "./pharmacy-actions";

describe("governed pharmacy selection request", () => {
  const orderId = "91047ef2-ad36-422a-a184-629693e7c729";
  const offerId = "123e4567-e89b-12d3-a456-426614174000";

  it("permits only explicit cash or insurance selection for valid order and offer identities", () => {
    expect(buildOfferSelectionRequest(orderId, offerId, "cash")).toEqual({
      path: `/api/patient/patient/pharmacy/orders/${orderId}/offers/${offerId}/select`,
      body: { coverage_mode: "cash" },
    });
    expect(buildOfferSelectionRequest(orderId, offerId, "insurance")).toEqual(expect.any(Object));
    expect(buildOfferSelectionRequest(orderId, offerId, "wallet")).toBeNull();
    expect(buildOfferSelectionRequest("not-an-id", offerId, "cash")).toBeNull();
  });

  it("accepts an immutable quote hash and allows COD registration only by a valid order identity", () => {
    const hash = "a".repeat(64);
    expect(buildFinalQuoteAcceptanceRequest(orderId, hash, 2)).toEqual({
      path: `/api/patient/patient/pharmacy/orders/${orderId}/final-quote/accept`, body: { quote_hash: hash, quote_revision: 2 },
    });
    expect(buildFinalQuoteAcceptanceRequest(orderId, "client-price", 2)).toBeNull();
    expect(buildFinalQuoteAcceptanceRequest(orderId, hash, 0)).toBeNull();
    expect(buildCodRegistrationRequest(orderId)).toEqual({ path: `/api/patient/patient/pharmacy/orders/${orderId}/cod/register`, body: {} });
    expect(buildCodRegistrationRequest("not-an-id")).toBeNull();
  });
});
