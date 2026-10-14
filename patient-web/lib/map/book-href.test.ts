import { describe, expect, it } from "vitest";
import { mapBookHref } from "./book-href";

describe("the map's Book link (issue 767)", () => {
  it("a hospital opens its facility page, not the consultations tab", () => {
    expect(mapBookHref("en", { id: "fac-1", type: "hospital" })).toBe("/en/facility/fac-1");
    expect(mapBookHref("ar", { id: "a b/c", type: "hospital" })).toBe("/ar/facility/a%20b%2Fc");
  });
  it("keeps the other kinds where they went", () => {
    expect(mapBookHref("en", { id: "l1", type: "lab" })).toBe("/en/diagnostics/labs/l1");
    expect(mapBookHref("en", { id: "d1", type: "doctor" })).toBe("/en/consultations/doctors/d1");
    expect(mapBookHref("en", { id: "p1", type: "pharmacy" })).toBe("/en/c");
    expect(mapBookHref("en", { id: "n1", type: "nursing" })).toBe("/en/c");
  });
});
