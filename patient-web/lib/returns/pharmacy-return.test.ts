import { describe, expect, it } from "vitest";
import { PHARMACY_RETURN_REASONS, returnErrorKey } from "./pharmacy-return";
import { scanStateOfUpload } from "../uploads/scan-status";

describe("the pharmacy return rules", () => {
  it("offers only the four defect reasons", () => {
    expect([...PHARMACY_RETURN_REASONS]).toEqual(["wrong_item", "damaged", "expired", "not_as_described"]);
  });
  it("maps the server's two refusals to a message and leaves others alone", () => {
    expect(returnErrorKey("pharmacy_return_needs_a_defect_reason")).toBe("defectReasonOnly");
    expect(returnErrorKey("photo_evidence_required")).toBe("photoRequiredError");
    expect(returnErrorKey("something else")).toBeNull();
    expect(returnErrorKey(undefined)).toBeNull();
  });
});

describe("the photo of a pharmacy return while it is scanned (UPLOAD_SCAN=defer)", () => {
  it("is pending while it is being checked, rejected when infected, ok otherwise: what the form's badge shows", () => {
    expect(scanStateOfUpload({ id: "m1", scan_status: "pending_scan" })).toBe("pending");
    expect(scanStateOfUpload({ id: "m1", scan_status: "scanning" })).toBe("pending");
    expect(scanStateOfUpload({ message: "file_infected" })).toBe("rejected");
    expect(scanStateOfUpload({ id: "m1", scan_status: "clean" })).toBe("ok");
    expect(scanStateOfUpload({ id: "m1" })).toBe("ok");
  });
});
