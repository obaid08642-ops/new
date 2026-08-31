import { describe, expect, it } from "vitest";
import { breadcrumbList, medicalWebPage, physician, service } from "./structured-data";

describe("structured-data builders (real data only)", () => {
  it("builds a MedicalWebPage with locale and canonical url", () => {
    const data = medicalWebPage({ title: "Doctors", locale: "en", path: "/consultations/doctors" });
    expect(data["@type"]).toBe("MedicalWebPage");
    expect(data.url).toBe("https://nabd.plus/en/consultations/doctors");
    expect(data.inLanguage).toBe("en");
  });
  it("builds a BreadcrumbList in order", () => {
    const data = breadcrumbList([
      { name: "Home", locale: "en", path: "" },
      { name: "Doctors", locale: "en", path: "/consultations/doctors" },
    ]);
    expect((data.itemListElement as Array<{ position: number }>).map((i) => i.position)).toEqual([1, 2]);
  });
  it("never fabricates price or availability", () => {
    const data = physician({ name: "Dr X", locale: "ar", path: "/consultations/doctors/dr-x" });
    expect(JSON.stringify(data)).not.toMatch(/price|availability|offer/i);
  });
  it("omits optional fields when absent", () => {
    const data = service({ name: "Lab", locale: "en", path: "/diagnostics/labs/lab-1" });
    expect(data.provider).toBeUndefined();
  });
});
