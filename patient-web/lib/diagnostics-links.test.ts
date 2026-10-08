import { describe, expect, it } from "vitest";
import { diagnosticBookingHref, diagnosticOrderNextHref } from "./diagnostics-links";

describe("diagnostics links", () => {
  it("builds a booking path that labs/[labId] and radiology/[serviceId] cannot shadow", () => {
    expect(diagnosticBookingHref("ar", "labs", "b 1")).toBe("/ar/diagnostics/bookings/labs/b%201");
    expect(diagnosticBookingHref("en", "radiology", "r1")).toBe("/en/diagnostics/bookings/radiology/r1");
  });
  it("opens the confirmation of the one booking an order made", () => {
    expect(diagnosticOrderNextHref("ar", { id: "order-1", lines: [{ kind: "lab", booking_id: "lb1" }] })).toBe("/ar/diagnostics/booking-success?bookingId=lb1&domain=labs");
    expect(diagnosticOrderNextHref("ar", { lines: [{ kind: "radiology", booking_id: "rb1" }] })).toBe("/ar/diagnostics/booking-success?bookingId=rb1&domain=radiology");
  });
  it("opens the bookings list when there is no single booking (never the order id)", () => {
    expect(diagnosticOrderNextHref("ar", { id: "order-1", lines: [{ kind: "lab", booking_id: "a" }, { kind: "radiology", booking_id: "b" }] })).toBe("/ar/diagnostics/bookings");
    expect(diagnosticOrderNextHref("ar", { id: "order-1", lines: [{ kind: "lab" }] })).toBe("/ar/diagnostics/bookings");
    expect(diagnosticOrderNextHref("ar", null)).toBe("/ar/diagnostics/bookings");
  });
});
