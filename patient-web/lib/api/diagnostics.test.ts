import { describe, expect, it } from "vitest";
import { extractDiagnosticBooking, extractDiagnosticBookings, parseDiagnosticBookingId, parseDiagnosticDomain } from "./diagnostics";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("diagnostic booking response guards", () => {
  it("allows only approved booking fields and ignores patient, pricing, reports, and document fields", () => {
    const rows = extractDiagnosticBookings({ data: [{ id: bookingId, state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", patient_name: "private", total_price: 500, reports: [{ url: "private" }] }] });
    expect(rows).toEqual([{ id: bookingId, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", locationType: undefined, scanNameAr: undefined, scanNameEn: undefined, medicalReferralRequired: undefined, hasReport: true }]);
  });

  it("validates diagnostic domains and UUID booking identifiers", () => {
    expect(parseDiagnosticDomain("labs")).toBe("labs");
    expect(parseDiagnosticDomain("radiology")).toBe("radiology");
    expect(parseDiagnosticDomain("admin")).toBeNull();
    expect(parseDiagnosticBookingId(bookingId).success).toBe(true);
    expect(parseDiagnosticBookingId("invalid").success).toBe(false);
    expect(extractDiagnosticBooking({ id: "invalid" })).toBeNull();
  });
});
