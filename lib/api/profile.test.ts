import { describe, expect, it } from "vitest";
import { extractRecord, profileDomainState, readProfileFields } from "./profile";

describe("profile response guards", () => {
  it("uses only explicitly allowed primitive fields", () => {
    const record = extractRecord({ data: { fullName: "Patient", secret: "never show", nested: { value: "ignored" } } });
    expect(readProfileFields(record, ["fullName"])).toEqual([{ key: "fullName", value: "Patient" }]);
  });

  it("does not create a profile record when the upstream response is malformed", () => {
    expect(extractRecord(["invalid"])).toBeNull();
  });

  it("preserves primitive boolean values so the UI can translate them without guessing", () => {
    const record = extractRecord({ is_smoker: false, internal_id: "not-allowed" });
    expect(readProfileFields(record, ["is_smoker"])).toEqual([{ key: "is_smoker", value: false }]);
  });

  it("keeps empty, forbidden and upstream failure states distinct", () => {
    expect(profileDomainState(200, 0)).toBe("empty");
    expect(profileDomainState(200, 1)).toBe("available");
    expect(profileDomainState(403, 0)).toBe("forbidden");
    expect(profileDomainState(404, 0)).toBe("forbidden");
    expect(profileDomainState(503, 0)).toBe("error");
  });
});
