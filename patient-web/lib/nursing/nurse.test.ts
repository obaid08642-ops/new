import { describe, expect, it } from "vitest";
import { nurseGenderOf, nurseSortOf, parseInsuranceOnFile, parseNurse, parseNurses } from "./nurse";

describe("nurses", () => {
  it("reads the facts the server sends and invents none", () => {
    const nurse = parseNurse({ id: "n-1", name_ar: "ليلى", facility_name: "Clinic", rating: 4.5, reviews_count: 12, years_experience: 6, price: 80, available_now: true });
    expect(nurse).toEqual({ id: "n-1", nameAr: "ليلى", nameEn: undefined, facility: "Clinic", degree: undefined, rating: 4.5, reviewCount: 12, years: 6, price: 80, availableNow: true });
    expect(parseNurse({ id: "n-2", name: "Sam", rating: null, reviews_count: 0, price: null })).toMatchObject({ id: "n-2", rating: undefined, reviewCount: undefined, price: undefined });
  });
  it("drops what is not a nurse (no id, no name, an unsafe id)", () => {
    expect(parseNurse({ id: "../x", name: "A" })).toBeNull();
    expect(parseNurse({ id: "n-3" })).toBeNull();
    expect(parseNurses({ data: [{ id: "n-1", name: "A" }, { name: "B" }, "x"] })).toHaveLength(1);
    expect(parseNurses(null)).toEqual([]);
  });
  it("sort and gender fall back to the open choice", () => {
    expect(nurseSortOf("rating")).toBe("rating");
    expect(nurseSortOf("nearest")).toBe("any");
    expect(nurseGenderOf("female")).toBe("female");
    expect(nurseGenderOf("x")).toBe("any");
  });
});

describe("insurance on file", () => {
  it("reads the company and the policy number when there is a policy", () => {
    expect(parseInsuranceOnFile({ has_policy: true, policy: { company_name: "Bupa", policy_number: "P-1" } })).toEqual({ has: true, company: "Bupa", policy: "P-1" });
  });
  it("says there is none when the server says so", () => {
    expect(parseInsuranceOnFile({ eligible: false, has_policy: false, policy: null })).toEqual({ has: false, company: undefined, policy: undefined });
    expect(parseInsuranceOnFile("x")).toBeNull();
  });
});

describe("issue 1819 nurse list filters", () => {
  it("reads the nationality only from the offered list and the availability only as 'now'", async () => {
    const { nurseNationalityOf, nurseAvailableOf } = await import("./nurse");
    expect(nurseNationalityOf("Saudi")).toBe("Saudi");
    expect(nurseNationalityOf("saudi")).toBe("any");
    expect(nurseNationalityOf("x$ne")).toBe("any");
    expect(nurseNationalityOf(undefined)).toBe("any");
    expect(nurseAvailableOf("now")).toBe(true);
    expect(nurseAvailableOf("any")).toBe(false);
    expect(nurseAvailableOf(undefined)).toBe(false);
  });
});
