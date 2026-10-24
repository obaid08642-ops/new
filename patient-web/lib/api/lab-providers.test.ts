import { describe, expect, it } from "vitest";
import { extractLabProviders } from "./lab-providers";

describe("extractLabProviders", () => {
  it("keeps the id, name, rating and home collection of each lab and drops rows without an id or a name", () => {
    const rows = extractLabProviders({ data: [{ id: "l1", name_ar: "مختبر", name_en: "Lab", rating: 4.5, home_visit_enabled: true }, { id: "l2", name: "Only" }, { id: "bad id" , name: "x" }, { id: "l3" }, { name: "no id" }] });
    expect(rows).toEqual([
      { id: "l1", nameAr: "مختبر", nameEn: "Lab", rating: 4.5, homeVisit: true },
      { id: "l2", nameAr: "Only", nameEn: "Only", rating: undefined, homeVisit: false },
    ]);
    expect(extractLabProviders(null)).toEqual([]);
  });
});
