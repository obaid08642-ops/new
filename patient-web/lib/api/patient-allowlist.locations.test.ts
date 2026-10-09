import { describe, expect, it } from "vitest";
import { isAllowedPatientApiTarget } from "./patient-allowlist";

// Needs-review issue 780: the address selects read regions, cities and districts through the proxy.
describe("patient proxy allowlist: location lists", () => {
  it("allows the three location reads the address form makes", () => {
    expect(isAllowedPatientApiTarget("/locations/regions", "", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/locations/cities", "", "GET")).toBe(true);
    expect(isAllowedPatientApiTarget("/locations/districts", "?city=%D8%A7%D9%84%D8%B1%D9%8A%D8%A7%D8%B6", "GET")).toBe(true);
  });
  it("refuses other location paths, extra query fields and writes", () => {
    expect(isAllowedPatientApiTarget("/locations/districts", "?city=x&user=y", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/locations/admin", "", "GET")).toBe(false);
    expect(isAllowedPatientApiTarget("/locations/cities", "", "POST")).toBe(false);
  });
});
