import { describe, expect, it } from "vitest";
import { canCancelOrder } from "./order-view";

describe("canCancelOrder", () => {
  it("allows a cancel while the order is still being arranged or prepared", () => {
    for (const status of ["draft", "broadcasting", "offer_selection_pending", "confirmed", "in_fulfillment", "CONFIRMED"]) expect(canCancelOrder(status)).toBe(true);
  });

  it("does not offer one once the order is dispatched, finished or already cancelled, or has no status", () => {
    for (const status of ["out_for_delivery", "delivered", "completed", "cancelled", "", undefined]) expect(canCancelOrder(status)).toBe(false);
  });
});
