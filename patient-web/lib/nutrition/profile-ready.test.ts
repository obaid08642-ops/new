import { describe, expect, it } from "vitest";
import { hasBodyProfile } from "./plan";

describe("hasBodyProfile (the plan needs a height and a weight, as POST /nutrition/plan/generate does)", () => {
  it("is true when both are positive numbers", () => {
    expect(hasBodyProfile({ height_cm: 170, weight_kg: 65 })).toBe(true);
    expect(hasBodyProfile({ data: { height_cm: 170, weight_kg: 65 } })).toBe(true);
  });
  it("is false for a profile that was never completed", () => {
    expect(hasBodyProfile({ patient_id: "p", profile_ready: false })).toBe(false);
    expect(hasBodyProfile({ height_cm: 170 })).toBe(false);
    expect(hasBodyProfile({ height_cm: 0, weight_kg: 65 })).toBe(false);
  });
  it("is unknown (null) when the reply is not an object, so the button is not hidden on a bad reply", () => {
    expect(hasBodyProfile(null)).toBeNull();
    expect(hasBodyProfile("x")).toBeNull();
  });
});
