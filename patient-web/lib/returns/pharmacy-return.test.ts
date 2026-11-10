import { describe, expect, it } from "vitest";
import { PHARMACY_RETURN_REASONS, returnErrorKey } from "./pharmacy-return";

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
