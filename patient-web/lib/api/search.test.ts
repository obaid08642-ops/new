import { describe, expect, it } from "vitest";
import { extractSearchResults, intentRedirect, MAX_QUERY_CHARS, truncateQuery } from "./search";

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

describe("query length", () => {
  it("cuts a long query to 120 whole characters, not 120 encoded characters", () => {
    expect(truncateQuery("short")).toBe("short");
    const arabic = "ب".repeat(300);
    expect(Array.from(truncateQuery(arabic)).length).toBe(MAX_QUERY_CHARS);
    const emoji = "😀".repeat(200);
    const cut = truncateQuery(emoji);
    expect(Array.from(cut).length).toBe(MAX_QUERY_CHARS);
    expect(() => encodeURIComponent(cut)).not.toThrow();
  });
});

describe("intentRedirect: a confident intent for a query that found nothing", () => {
  const intent = (canonical_path: string, confidence: number) => ({ canonical_path, confidence, intent_type: "discovery" });
  it("follows a confident internal page, under the page's locale", () => {
    expect(intentRedirect(intent("/en/doctors/cardiology/riyadh", 0.9), "en")).toBe("/en/doctors/cardiology/riyadh");
    expect(intentRedirect(intent("/doctors/cardiology/riyadh", 0.9), "ar")).toBe("/ar/doctors/cardiology/riyadh");
    expect(intentRedirect(intent("/en/medicine-catalog", 0.85), "en")).toBe("/en/medicine-catalog");
  });
  it("ignores a guess, the search page itself, other schemes and malformed answers", () => {
    expect(intentRedirect(intent("/en/search", 0.95), "en")).toBeNull();
    expect(intentRedirect(intent("/en/doctors/cardiology/riyadh", 0.5), "en")).toBeNull();
    expect(intentRedirect(intent("//evil.test/x", 0.99), "en")).toBeNull();
    expect(intentRedirect(intent("https://evil.test/x", 0.99), "en")).toBeNull();
    expect(intentRedirect(intent("/en/../admin", 0.99), "en")).toBeNull();
    expect(intentRedirect({ canonical_path: "/en/doctors", confidence: "0.9" }, "en")).toBeNull();
    expect(intentRedirect(null, "en")).toBeNull();
    expect(intentRedirect([], "en")).toBeNull();
  });
});
