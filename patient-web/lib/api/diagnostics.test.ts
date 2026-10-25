import { describe, expect, it } from "vitest";
import { extractDiagnosticBooking, extractDiagnosticBookings, extractDiagnosticTracking, parseDiagnosticBookingId, parseDiagnosticDomain } from "./diagnostics";

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

describe("diagnostic booking results and collector", () => {
  it("reads result rows (name, result, reference, abnormal) and drops rows without a name or a result", () => {
    const booking = extractDiagnosticBooking({ id: bookingId, results: [{ id: "r1", name: "Glucose", result: 130, reference: "70-100", isAbnormal: true }, { name: "HDL", result: "55" }, { name: "empty" }, "x"] });
    expect(booking?.results).toEqual([
      { id: "r1", name: "Glucose", result: "130", reference: "70-100", abnormal: true },
      { id: "1", name: "HDL", result: "55", reference: undefined, abnormal: false },
    ]);
    expect(extractDiagnosticBooking({ id: bookingId })?.results).toBeUndefined();
  });

  it("keeps the collector name and phone of the tracking", () => {
    expect(extractDiagnosticTracking({ techName: "Sara", techPhone: "+966500000000", timeline: [] })).toMatchObject({ techName: "Sara", techPhone: "+966500000000" });
  });
});

describe("booking names in every language (issue 1832)", () => {
  const names = { ar: "صورة دم", en: "CBC", ur: "خون", hi: "रक्त", bn: "রক্ত", tl: "Dugo" };

  it("reads the server's names for a lab line and a scan, and the page's language picks its own", async () => {
    const { pickTexts } = await import("@/lib/i18n/localized");
    const [lab] = extractDiagnosticBookings([{ id: bookingId, state: "CONFIRMED", items: [{ name_ar: "قديم", name_en: "old", names }] }]);
    expect(lab.testNames).toEqual(names);
    expect(["ar", "en", "ur", "hi", "bn", "fil"].map((l) => pickTexts(l, lab.testNames))).toEqual(["صورة دم", "CBC", "خون", "रक्त", "রক্ত", "Dugo"]);
    const [scan] = extractDiagnosticBookings([{ id: bookingId, state: "CONFIRMED", scan_name_ar: "قديم", scan_name_en: "old", scan_names: { ar: "رنين", en: "MRI", hi: "एमआरआई" } }]);
    expect(pickTexts("hi", scan.scanNames)).toBe("एमआरआई");
    expect(pickTexts("bn", scan.scanNames)).toBe("MRI"); // no Bengali on the row: English, as every catalogue page does
  });

  it("an old booking without names falls back to its stored Arabic and English", async () => {
    const { pickTexts } = await import("@/lib/i18n/localized");
    const [old] = extractDiagnosticBookings([{ id: bookingId, state: "CONFIRMED", items: [{ name_ar: "صورة دم", name_en: "CBC" }] }]);
    expect(old.testNames).toEqual({ ar: "صورة دم", en: "CBC" });
    expect(pickTexts("ur", old.testNames)).toBe("صورة دم");
    expect(pickTexts("hi", old.testNames)).toBe("CBC");
    const [none] = extractDiagnosticBookings([{ id: bookingId, state: "CONFIRMED" }]);
    expect(none.testNames).toBeUndefined();
    expect(none.scanNames).toBeUndefined();
  });

  it("ignores anything in `names` that is not a language text", () => {
    const [row] = extractDiagnosticBookings([{ id: bookingId, items: [{ names: { hi: "रक्त", fr: "Sang", en: 5, bn: "   " } }] }]);
    expect(row.testNames).toEqual({ hi: "रक्त" });
  });
});
