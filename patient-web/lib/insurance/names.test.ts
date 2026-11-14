import { describe, expect, it } from "vitest";
import { parseCompanies, parseProviders } from "./view";

const company = [{ id: "c1", name_ar: "بوبا العربية", name_en: "Bupa Arabia" }, { id: "c2", name_ar: "التعاونية" }];
const provider = [{ id: "p1", name_ar: "مستشفى دله", name_en: "Dallah Hospital", type: "hospital" }];

describe("insurer and network provider names follow the page language", () => {
  it("shows the English name outside Arabic and the Arabic one on the Arabic page", () => {
    expect(parseCompanies(company, "en")[0].name).toBe("Bupa Arabia");
    expect(parseCompanies(company, "hi")[0].name).toBe("Bupa Arabia");
    expect(parseCompanies(company, "ar")[0].name).toBe("بوبا العربية");
    expect(parseProviders(provider, "fil")[0].name).toBe("Dallah Hospital");
    expect(parseProviders(provider, "ar")[0].name).toBe("مستشفى دله");
  });
  it("falls back to the other language when the page's own name is missing", () => {
    expect(parseCompanies(company, "en")[1].name).toBe("التعاونية");
    expect(parseCompanies([{ id: "c3", name_en: "Only English" }], "ar")[0].name).toBe("Only English");
  });
});
