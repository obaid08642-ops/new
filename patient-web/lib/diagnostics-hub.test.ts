import { describe, expect, it } from "vitest";
import { byPrice, byRating, matchesQuery, parseHubFilter } from "./diagnostics-hub";

describe("diagnostics hub filter", () => {
  it("reads the search, show and sort and drops anything unknown", () => {
    expect(parseHubFilter({ q: "  cbc ", show: "packages", sort: "price" })).toEqual({ q: "cbc", show: "packages", sort: "price" });
    expect(parseHubFilter({ show: "all", sort: "cheap" })).toEqual({ q: "" });
  });
  it("matches a name in any case, and everything for an empty search", () => {
    expect(matchesQuery("", "x")).toBe(true);
    expect(matchesQuery("glu", undefined, "Fasting Glucose")).toBe(true);
    expect(matchesQuery("xyz", "Fasting Glucose", "سكر")).toBe(false);
    expect(matchesQuery("سكر", "Glucose", "سكر صائم")).toBe(true);
  });
  it("sorts by lowest price and best rating with the unknown last, without changing the input", () => {
    const rows = [{ price: 30 }, { price: undefined }, { price: 10 }];
    expect(byPrice(rows).map((r) => r.price)).toEqual([10, 30, undefined]);
    expect(rows[0].price).toBe(30);
    expect(byRating([{ rating: 3 }, { rating: undefined }, { rating: 4.5 }]).map((r) => r.rating)).toEqual([4.5, 3, undefined]);
  });
});
