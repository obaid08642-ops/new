import { normalizeSearchText, expandMultilingualSearchTerms } from "./seo-search.module";

describe("normalizeSearchText (ar/en search contract)", () => {
  it("strips Arabic diacritics and tatweel", () => {
    expect(normalizeSearchText("بَارَاسِيتَامُولــ")).toBe("باراسيتامول");
  });
  it("unifies alef variants and yeh/teh-marbuta", () => {
    expect(normalizeSearchText("أنسولين")).toBe("انسولين");
    expect(normalizeSearchText("إيبوبروفين")).toBe("ايبوبروفين");
    expect(normalizeSearchText("أسبرين")).toBe("اسبرين");
    expect(normalizeSearchText("مستشفى")).toBe("مستشفي");
    expect(normalizeSearchText("صيدلية")).toBe("صيدليه");
  });
  it("normalizes English case and whitespace", () => {
    expect(normalizeSearchText("  Paracetamol   500MG ")).toBe("paracetamol 500mg");
  });
  it("handles mixed ar/en queries", () => {
    expect(normalizeSearchText("Panadol بنادول")).toBe("panadol بنادول");
  });
  it("is null-safe", () => {
    expect(normalizeSearchText(null as unknown as string)).toBe("");
    expect(normalizeSearchText(undefined as unknown as string)).toBe("");
  });
});

describe("expandMultilingualSearchTerms (multilingual search & active ingredients)", () => {
  it("expands paracetamol into Arabic, Urdu, Hindi, Bengali, and Filipino synonyms", () => {
    const terms = expandMultilingualSearchTerms("paracetamol");
    expect(terms).toContain(normalizeSearchText("paracetamol"));
    expect(terms).toContain(normalizeSearchText("باراسيتامول"));
    expect(terms).toContain(normalizeSearchText("بنادول"));
    expect(terms).toContain(normalizeSearchText("panadol"));
    expect(terms).toContain(normalizeSearchText("پیراسیٹامول"));
    expect(terms).toContain(normalizeSearchText("पैरासिटामोल"));
    expect(terms).toContain(normalizeSearchText("প্যারাসিটামল"));
    expect(terms).toContain(normalizeSearchText("parasetamol"));
  });

  it("expands Arabic brand to active ingredient and cross-locale variants", () => {
    const terms = expandMultilingualSearchTerms("بنادول");
    expect(terms).toContain("بنادول");
    expect(terms).toContain("panadol");
    expect(terms).toContain("باراسيتامول");
    expect(terms).toContain("paracetamol");
  });

  it("expands ibuprofen and brufen synonyms", () => {
    const terms = expandMultilingualSearchTerms("brufen");
    expect(terms).toContain("ibuprofen");
    expect(terms).toContain("ايبوبروفين");
    expect(terms).toContain("بروفين");
  });

  it("returns single normalized query when no medical synonym is mapped", () => {
    const terms = expandMultilingualSearchTerms("  UnknownDrugX  ");
    expect(terms).toEqual(["unknowndrugx"]);
  });

  it("handles null, undefined or empty input safely", () => {
    expect(expandMultilingualSearchTerms("")).toEqual([]);
    expect(expandMultilingualSearchTerms(null as unknown as string)).toEqual([]);
    expect(expandMultilingualSearchTerms("a")).toEqual(["a"]);
  });
});

