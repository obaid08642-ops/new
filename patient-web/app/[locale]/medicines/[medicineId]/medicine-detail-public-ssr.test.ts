import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicMedicine: vi.fn() }));

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({
  isLocale: () => true,
  locales: ["ar", "en", "ur", "hi", "bn", "fil"],
}));
vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicine: state.getPublicMedicine }));

import PublicMedicineDetailPage, { generateMetadata } from "./page";

const params = Promise.resolve({ locale: "en", medicineId: "published-medicine" });

describe("public medicine detail SSR boundary", () => {
  beforeEach(() => state.getPublicMedicine.mockReset());

  it("renders only allowlisted catalogue fields and never embeds private or commercial fields", async () => {
    state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({
      data: {
        id: "published-medicine",
        name_en: "Published medicine",
        active_ingredient: "Ingredient",
        generic_name: "Generic name",
        form: "Tablet",
        strength: "10 mg",
        price: 99,
        patient_id: "private-patient",
        attachment_url: "https://storage.example/private.pdf",
      },
    }), { status: 200 }));

    const html = renderToStaticMarkup(await PublicMedicineDetailPage({ params }));

    expect(state.getPublicMedicine).toHaveBeenCalledWith("published-medicine");
    expect(html).toContain("Published medicine");
    expect(html).toContain('"@type":"MedicalWebPage"');
    expect(html).toContain('href="/en/medicine-catalog"');
    expect(html).not.toContain("99");
    expect(html).not.toContain("private-patient");
    expect(html).not.toContain("private.pdf");
  });

  it("sets canonical and all six hreflang alternatives but keeps unclassified legacy catalogue entries noindex", async () => {
    state.getPublicMedicine.mockResolvedValue(new Response(JSON.stringify({ data: { id: "published-medicine", name_en: "Published medicine" } }), { status: 200 }));

    const metadata = await generateMetadata({ params });
    const languages = metadata.alternates?.languages as Record<string, string>;

    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en/medicines/published-medicine");
    expect(languages).toMatchObject({
      ar: "https://nabd.plus/ar/medicines/published-medicine",
      en: "https://nabd.plus/en/medicines/published-medicine",
      ur: "https://nabd.plus/ur/medicines/published-medicine",
      hi: "https://nabd.plus/hi/medicines/published-medicine",
      bn: "https://nabd.plus/bn/medicines/published-medicine",
      fil: "https://nabd.plus/fil/medicines/published-medicine",
      "x-default": "https://nabd.plus/ar/medicines/published-medicine",
    });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
