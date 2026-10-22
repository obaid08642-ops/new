import { describe, expect, it } from "vitest";
import { insuranceBookingHref, parseRequestExtras } from "../lib/insurance/view";

const ID = "3f2c8f7e-6d2a-4b1e-9c3a-1a2b3c4d5e6f";

describe("insurance request: view booking goes to the booking's own page", () => {
  it("routes a consultation to its status, a lab and a radiology booking to their detail pages", () => {
    expect(insuranceBookingHref("en", "consultation", ID)).toBe(`/en/consultations/booking-status?appointmentId=${ID}`);
    expect(insuranceBookingHref("en", "lab", ID)).toBe(`/en/diagnostics/bookings/labs/${ID}`);
    expect(insuranceBookingHref("ar", "radiology", ID)).toBe(`/ar/diagnostics/bookings/radiology/${ID}`);
  });

  it("sends another kind to the orders list and keeps the consultation status when the kind is missing", () => {
    expect(insuranceBookingHref("en", "pharmacy", ID)).toBe("/en/orders");
    expect(insuranceBookingHref("en", undefined, ID)).toBe(`/en/consultations/booking-status?appointmentId=${ID}`);
  });

  it("reads the booking kind from the request answer", () => {
    expect(parseRequestExtras({ booking_id: ID, booking_kind: "lab" })).toMatchObject({ bookingId: ID, bookingKind: "lab" });
  });
});
