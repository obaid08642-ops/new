import { describe, expect, it } from "vitest";
import { policyLines } from "./policy-lines";

const c = (key: string, values?: Record<string, string | number>) => `${key}:${JSON.stringify(values ?? {})}`;

describe("policyLines", () => {
  it("states the server's late band and no 'nothing back' line when there is no half-hours cut-off", () => {
    const lines = policyLines(c, { fullHours: 2, halfHours: 0, halfPercent: 50 });
    expect(lines).toEqual(['policyFull:{"hours":2}', 'policyHalf:{"half":0,"full":2,"percent":50}']);
  });

  it("keeps the third line when the policy has a half-hours cut-off", () => {
    expect(policyLines(c, { fullHours: 24, halfHours: 12, halfPercent: 50 })).toHaveLength(3);
  });

  it("says the policy is unavailable when the server stated none", () => {
    expect(policyLines(c, null)).toEqual(["policyUnavailable:{}"]);
  });
});
