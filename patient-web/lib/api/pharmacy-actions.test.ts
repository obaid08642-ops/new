import { describe, expect, it } from "vitest";
import { buildOfferSelectionRequest } from "./pharmacy-actions";

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
});
