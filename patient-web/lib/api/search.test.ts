import { describe, expect, it } from "vitest";
import { extractSearchResults } from "./search";

describe("search results guard", () => {
  it("keeps a row whose price or rating the API sent as null, and drops rows without an id or name", () => {
    const rows = extractSearchResults([
      { id: "d1", type: "دكتور", typeEn: "Doctor", name: "د. س", nameEn: "Dr S", sub: "قلب", subEn: "Cardiology", rate: null, price: null },
      { id: "", type: "x", name: "no id" },
      { id: "m1", type: "دواء", typeEn: "Medicine", name: "دواء", nameEn: "Drug", price: "12" },
    ], "en");
    expect(rows.map((r) => r.id)).toEqual(["d1", "m1"]);
    expect(rows[0]).toMatchObject({ name: "Dr S", sub: "Cardiology", type: "Doctor", price: undefined, rate: undefined });
    expect(rows[1].price).toBe("12");
  });

  it("drops rows that are not objects, or whose fields have the wrong type, and keeps only the known fields", () => {
    const rows = extractSearchResults([
      null,
      "text",
      ["array"],
      { id: "a", type: "t", name: "n", price: 5 },
      { id: "b", type: 1, name: "n" },
      { id: "c", type: "t", name: "n", extra: "not kept", rate: "4.5" },
    ], "ar");
    expect(rows.map((r) => r.id)).toEqual(["c"]);
    expect(Object.keys(rows[0]).sort()).toEqual(["id", "name", "nameEn", "price", "rate", "sub", "subEn", "type", "typeEn"]);
    expect(rows[0].rate).toBe("4.5");
  });

  it("returns no rows for a payload that is not a list", () => {
    expect(extractSearchResults({ items: [] }, "ar")).toEqual([]);
    expect(extractSearchResults(undefined, "en")).toEqual([]);
  });
});
