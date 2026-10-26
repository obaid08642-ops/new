import { describe, expect, it } from "vitest";
import { parseCatalogueFilters } from "./public-products-server";
import { activeFilterCount, filtersQuery } from "@/components-next/pharmacy/catalogue-filters";

describe("issue 1819 catalogue filters", () => {
  it("keeps valid values and drops what does not parse", () => {
    expect(parseCatalogueFilters({ form: " Tablets ", brand: "Pfizer", rx: "true", price_min: "10", price_max: "50" })).toEqual({ form: "Tablets", brand: "Pfizer", rx: "true", price_min: "10", price_max: "50" });
    expect(parseCatalogueFilters({ rx: "maybe", price_min: "abc", price_max: "-3", form: "" })).toEqual({});
  });
  it("drops a maximum below the minimum and strips control characters", () => {
    expect(parseCatalogueFilters({ price_min: "40", price_max: "20" })).toEqual({ price_min: "40" });
    expect(parseCatalogueFilters({ brand: "A\u0000B" })).toEqual({ brand: "AB" });
  });
  it("builds the query and counts the price range once", () => {
    const f = parseCatalogueFilters({ form: "Syrup", rx: "false", price_min: "5", price_max: "9" });
    expect(filtersQuery(f)).toBe("form=Syrup&rx=false&price_min=5&price_max=9");
    expect(activeFilterCount(f)).toBe(3);
    expect(activeFilterCount({})).toBe(0);
  });
});
