import { describe, expect, it } from "vitest";
import { extractRecord, readProfileFields } from "./profile";

describe("profile display security", () => {
  it("does not expose insurance identifiers through the web display allowlist", () => {
    const record = extractRecord({ data: { providerName: "Example Insurance", companyName: "Example", status: "active", policyNumber: "private-policy", memberId: "private-member" } });
    expect(readProfileFields(record, ["providerName", "companyName", "status"])).toEqual([
      { key: "providerName", value: "Example Insurance" },
      { key: "companyName", value: "Example" },
      { key: "status", value: "active" },
    ]);
  });
});
