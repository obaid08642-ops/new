import { describe, expect, it } from "vitest";
import { buildPatientPharmacyDraft, extractPatientPharmacyOrderId } from "./pharmacy-draft";

describe("patient pharmacy draft", () => {
  it("maps only patient item identity and quantity without passing a client price or payment method", () => {
    expect(buildPatientPharmacyDraft([{ name: "Medicine", quantity: 2, sku: "sku-1", price: 99, payment_method: "wallet" }])).toEqual({ items: [{ raw_name: "Medicine", qty: 2, sku: "sku-1" }] });
  });
  it("requires a valid created pharmacy order id before submission", () => {
    expect(extractPatientPharmacyOrderId({ data: { id: "91047ef2-ad36-422a-a184-629693e7c729" } })).toBe("91047ef2-ad36-422a-a184-629693e7c729");
    expect(extractPatientPharmacyOrderId({ id: "cart" })).toBeNull();
  });
});
