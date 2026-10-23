import { describe, expect, it } from "vitest";
import { extractDiagnosticBooking, extractDiagnosticBookings, parseDiagnosticBookingId, parseDiagnosticDomain } from "./diagnostics";

const bookingId = "91047ef2-ad36-422a-a184-629693e7c729";

describe("diagnostic booking response guards", () => {
  it("allows only approved booking fields (the booking total is the patient's own, shown on the list) and ignores patient, reports, and document fields", () => {
    const rows = extractDiagnosticBookings({ data: [{ id: bookingId, state: "CONFIRMED", scheduled_at: "2026-08-20T10:00:00.000Z", patient_name: "private", total_price: 500, reports: [{ url: "private" }] }] });
    expect(rows).toEqual([{ id: bookingId, state: "CONFIRMED", scheduledAt: "2026-08-20T10:00:00.000Z", locationType: undefined, scanNameAr: undefined, scanNameEn: undefined, medicalReferralRequired: undefined, hasReport: true, reportIds: [], total: 500 }]);
  });

  it("lists the report ids the booking holds a file for, never a url (journeys#54)", () => {
    const reportId = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
    const [row] = extractDiagnosticBookings({ data: [{ id: bookingId, state: "REPORTED", reports: [{ id: reportId, name: "report.pdf", has_file: true }, { id: "not-a-uuid", has_file: true }, { url: "https://cdn.example.test/private.pdf" }] }] });
    expect(row.reportIds).toEqual([reportId]);
    expect(JSON.stringify(row)).not.toContain("cdn.example.test");
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

describe("lab booking test name (needs-review issue 1065)", () => {
  it("reads the first test's names from the booking items", () => {
    expect(extractDiagnosticBookings([{ id: bookingId, state: "CONFIRMED", items: [{ name_ar: "صورة دم كاملة", name_en: "CBC" }] }])[0])
      .toMatchObject({ id: bookingId, testNameAr: "صورة دم كاملة", testNameEn: "CBC" });
  });
});
