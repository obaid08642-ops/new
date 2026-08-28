import { describe, expect, it } from "vitest";
import { isTrustedCheckoutUrl, parsePatientPharmacyPaymentCapabilities } from "./pharmacy-payment";

describe("patient pharmacy payment capabilities", () => {
  it("accepts only server-declared online methods and valid monetary data", () => {
    expect(parsePatientPharmacyPaymentCapabilities({
      booking_id: "91047ef2-ad36-422a-a184-629693e7c729", amount: 36.5, currency: "SAR",
      methods: [{ id: "card", kind: "online" }, { id: "apple-pay", kind: "online" }],
    })).toEqual({
      bookingId: "91047ef2-ad36-422a-a184-629693e7c729", amount: 36.5, currency: "SAR",
      methods: [{ id: "card", kind: "online" }, { id: "apple-pay", kind: "online" }],
    });
    expect(parsePatientPharmacyPaymentCapabilities({ booking_id: "not-an-id", amount: 10, currency: "SAR", methods: [{ id: "wallet", kind: "online" }] })).toBeNull();
  });

  it("allows only HTTPS checkout redirects", () => {
    expect(isTrustedCheckoutUrl("https://checkout.example.test/session")).toBe(true);
    expect(isTrustedCheckoutUrl("http://checkout.example.test/session")).toBe(false);
    expect(isTrustedCheckoutUrl("javascript:alert(1)")).toBe(false);
  });
});
