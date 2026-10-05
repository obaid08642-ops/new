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
});
