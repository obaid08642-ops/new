import { describe, expect, it } from "vitest";
import { isVerifyCode, readReportDetail, readReportList, readVerification } from "./rest";

describe("PT-08 medical reports (rest period)", () => {
  it("reads the list, marks revoked ones and Seha state, and drops rows without an id", () => {
    const rows = readReportList([
      { id: "r1", serial: "MED-2026-000001", status: "issued", from: "2026-11-10", to: "2026-11-12", days: 3, doctor_name: "Dr Test", national_id: "*******123", verify_code: "ABCD2345", seha_status: "pending", seha_number: null },
      { id: "r2", serial: "MED-2026-000002", status: "revoked", seha_status: "registered", seha_number: "SEHA-77" },
      { serial: "no-id" },
    ]);
    expect(rows.map((r) => [r.id, r.revoked, r.seha.status, r.seha.number])).toEqual([["r1", false, "pending", null], ["r2", true, "registered", "SEHA-77"]]);
    expect(rows[0]).toMatchObject({ from: "2026-11-10", to: "2026-11-12", days: 3, idNumber: "*******123" });
    expect(readReportList({ data: [{ id: "r3" }] })).toHaveLength(1);
    expect(readReportList(null)).toEqual([]);
  });
  it("a Seha number without the registered state is shown as pending", () => {
    expect(readReportList([{ id: "r1", seha_status: "pending", seha_number: "X-1" }])[0].seha).toEqual({ status: "pending", number: null });
  });
  it("reads the detail in full; the diagnosis only when the server sent it", () => {
    const d = readReportDetail({ id: "r1", patient_name: "Test Patient", doctor_specialty_en: "Cardiology", doctor_license_no: "SCFHS-1", consultation_at: "2026-11-09T09:00:00Z", booking_ref: "BK-1", reason: "Rest", diagnosis: null, revoke_reason: null });
    expect(d).toMatchObject({ patientName: "Test Patient", specialtyEn: "Cardiology", licenceNo: "SCFHS-1", bookingRef: "BK-1", reason: "Rest", diagnosis: null });
    expect(readReportDetail({ id: "r1", diagnosis: "Flu" })?.diagnosis).toBe("Flu");
    expect(readReportDetail({})).toBeNull();
  });
  it("reads the public verification: only the minimal fields", () => {
    expect(readVerification({ valid: true, status: "issued", serial: "MED-1", initials: "T. P.", from: "2026-11-10", to: "2026-11-12", days: 3, issued_at: "2026-11-09T10:00:00Z", seha_registered: true })).toMatchObject({ valid: true, revoked: false, initials: "T. P.", days: 3, sehaRegistered: true });
    expect(readVerification({ valid: false, status: "revoked", revoked_at: "2026-11-10T00:00:00Z" })).toMatchObject({ valid: false, revoked: true });
    expect(readVerification({ status: "issued" })).toBeNull();
    expect(readVerification(null)).toBeNull();
  });
  it("sends only a code in the backend's alphabet", () => {
    expect(isVerifyCode("abcd2345")).toBe(true);
    for (const bad of ["", "ABCD234", "ABCD23450", "ABCD0345", "ABCDI345", "../etc/pw", "ABCD 345"]) expect(isVerifyCode(bad)).toBe(false);
  });
});
