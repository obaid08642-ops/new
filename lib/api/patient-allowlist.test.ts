import { describe, expect, it } from "vitest";
import {
  isAllowedPatientApiPath,
  isAllowedPatientApiRequest,
} from "./patient-allowlist";

describe("patient API allowlist", () => {
  it("allows only the documented order reads needed by the browser BFF", () => {
    expect(isAllowedPatientApiPath("/orders/mine")).toBe(true);
    expect(
      isAllowedPatientApiPath("/orders/91047ef2-ad36-422a-a184-629693e7c729")
    ).toBe(true);
    expect(isAllowedPatientApiPath("/patient/pharmacy/orders")).toBe(true);
    expect(isAllowedPatientApiPath(`/patient/pharmacy/orders/${"91047ef2-ad36-422a-a184-629693e7c729"}`)).toBe(true);
    expect(isAllowedPatientApiPath(`/orders/${"91047ef2-ad36-422a-a184-629693e7c729"}/tracking`)).toBe(true);
    expect(isAllowedPatientApiPath("/cart")).toBe(true);
    expect(isAllowedPatientApiPath("/cart/checkout")).toBe(true);
    expect(isAllowedPatientApiPath("/care/appointments/123e4567-e89b-12d3-a456-426614174000")).toBe(true);
    expect(isAllowedPatientApiPath("/cart/prescription")).toBe(true);
    expect(isAllowedPatientApiPath("/nursing/visits")).toBe(true);
    expect(isAllowedPatientApiPath("/users/me/wishlist")).toBe(true);
    expect(isAllowedPatientApiPath("/medical-profile")).toBe(false);
  });

  it("rejects administrative, provider, unlisted patient domains, and writes", () => {
    expect(isAllowedPatientApiPath("/admin/users")).toBe(false);
    expect(isAllowedPatientApiPath("/provider/queue")).toBe(false);
    expect(isAllowedPatientApiRequest("/orders/mine", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/orders/mine", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/patient/pharmacy/orders", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/patient/pharmacy/orders/91047ef2-ad36-422a-a184-629693e7c729", "PATCH")).toBe(false);
    expect(isAllowedPatientApiRequest("/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/cart", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/cart/lines/line-1", "PATCH")).toBe(false);
    expect(isAllowedPatientApiRequest("/cart/clear", "POST")).toBe(false);
    expect(isAllowedPatientApiRequest("/nursing/visits", "POST")).toBe(false);
    expect(isAllowedPatientApiPath("/nursing/visits?limit=10")).toBe(false);
    expect(isAllowedPatientApiRequest("/users/me/wishlist", "GET")).toBe(true);
    expect(isAllowedPatientApiRequest("/users/me/wishlist/med-1", "POST")).toBe(false);
  });

  it("fails closed for malformed or nested order identifiers", () => {
    expect(isAllowedPatientApiPath("/orders/not-an-id")).toBe(false);
    expect(
      isAllowedPatientApiPath(
        "/orders/91047ef2-ad36-422a-a184-629693e7c729/items"
      )
    ).toBe(false);
    expect(isAllowedPatientApiPath("/orders/../admin/users")).toBe(false);
    expect(isAllowedPatientApiPath("/orders/%2e%2e/admin/users")).toBe(false);
    expect(isAllowedPatientApiPath("/patient/pharmacy/orders/not-an-id")).toBe(false);
    expect(isAllowedPatientApiPath("/patient/pharmacy/orders/91047ef2-ad36-422a-a184-629693e7c729/items")).toBe(false);
    expect(isAllowedPatientApiPath("/orders/91047ef2-ad36-422a-a184-629693e7c729/tracking/messages")).toBe(false);
    expect(isAllowedPatientApiPath("/cart/lines")).toBe(false);
    expect(isAllowedPatientApiPath("/users/me/wishlist/../admin")).toBe(false);
    expect(isAllowedPatientApiPath("/cart/checkout/payment")).toBe(false);
  });

  it("does not widen the browser surface through method casing or writes", () => {
    expect(isAllowedPatientApiRequest("/orders/mine", "get")).toBe(false);
    expect(isAllowedPatientApiRequest("/orders/mine", "PUT")).toBe(false);
    expect(
      isAllowedPatientApiRequest(
        "/orders/91047ef2-ad36-422a-a184-629693e7c729",
        "DELETE"
      )
    ).toBe(false);
  });
});
