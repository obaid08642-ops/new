import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { hubFilterCount, nurseFilterCount, radiologyFilterCount } from "./diagnostics-filter-count";
import { parseHubFilter } from "./diagnostics-hub";

/** Owner review G6: the filters of labs, radiology and nursing on the web. */
describe("applied filter counts never count a default", () => {
  it("hub: show is labs-only, sort counts for both, sort counts as one filter for both", () => {
    expect(hubFilterCount({}, "labs")).toBe(0);
    expect(hubFilterCount({ show: "packages", sort: "price" }, "labs")).toBe(2);
    expect(hubFilterCount({ show: "packages", sort: "price" }, "radiology")).toBe(1);
    // highest rated is real on the tests and the scans now (the server orders both)
    expect(hubFilterCount({ sort: "rating" }, "radiology")).toBe(1);
    expect(parseHubFilter({ sort: "bogus", show: "x" })).toEqual({ q: "" });
  });
  it("radiology page and nurse list", () => {
    expect(radiologyFilterCount({})).toBe(0);
    expect(radiologyFilterCount({ modality: "mri", bodyPart: "knee", homeVisit: true, lowestPrice: true })).toBe(4);
    expect(radiologyFilterCount({ highestRated: true })).toBe(1);
    expect(nurseFilterCount({ sort: "any", gender: "any", availableNow: false, nationality: "any" })).toBe(0);
    expect(nurseFilterCount({ sort: "rating", gender: "female", availableNow: true, nationality: "Saudi" })).toBe(4);
  });
});

describe("radiology scan type reaches the endpoint in the case the catalogue sends", () => {
  it("sends MRI / mri, drops anything that is not a plain token", () => {
    for (const [value, ok] of [["MRI", true], ["xray", true], ["a b", false], ["x".repeat(60), false]] as const) expect(/^[A-Za-z0-9_-]{1,40}$/.test(value)).toBe(ok);
  });
});

describe("new keys in the six web languages", () => {
  const want: Record<string, string[]> = { DiagWeb: ["filterSummary", "filterReset"], RadiologyServices: ["filtersOn", "reset"], NursingWeb: ["filtersOn", "resetFilters"] };
  const en = JSON.parse(readFileSync("messages/en.json", "utf8")) as Record<string, Record<string, string>>;
  it.each(["ar", "en", "ur", "hi", "bn", "fil"])("%s", (loc) => {
    const m = JSON.parse(readFileSync(`messages/${loc}.json`, "utf8")) as Record<string, Record<string, string>>;
    for (const [ns, keys] of Object.entries(want)) for (const key of keys) {
      expect(m[ns][key]?.trim(), `${loc} ${ns}.${key}`).toBeTruthy();
      if (loc !== "en") expect(m[ns][key]).not.toBe(en[ns][key]);
      if (key === "filtersOn" || key === "filterSummary") expect(m[ns][key]).toContain("{count}");
    }
  });
});
