import { describe, expect, it } from "vitest";
import { extractCartSummary, parseCartLineId } from "./cart";

describe("cart response guards", () => {
  it("accepts only a bounded cart line id", () => {
    expect(parseCartLineId("line-1").success).toBe(true);
    expect(parseCartLineId("").success).toBe(false);
  });

  it("keeps cart display fields and excludes patient/private metadata", () => {
    expect(extractCartSummary({ patient_id: "private", groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ line_id: "line-1", service_id: "med-1", name_ar: "Medicine", qty: 2, price: 6, payment_method: "cash", notes: "private", meta: { private: true } }] }], subtotal: 12, home_visit_fee: 0, total: 12, currency: "SAR" })).toEqual({ groups: [{ kind: "pharmacy", count: 1, subtotal: 12, items: [{ lineId: "line-1", serviceId: "med-1", kind: "pharmacy", name: "Medicine", quantity: 2, price: 6, paymentMethod: "cash", homeVisit: false }] }], subtotal: 12, homeVisitFee: 0, total: 12, currency: "SAR" });
  });

  it("returns a truthful empty summary when groups are absent", () => {
    expect(extractCartSummary({ patient_id: "private", subtotal: 0, total: 0 })).toEqual({ groups: [], subtotal: 0, total: 0, homeVisitFee: undefined, currency: undefined });
  });
});
