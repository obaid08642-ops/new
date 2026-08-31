import { normalizeSearchText } from "./seo-search.module";

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
