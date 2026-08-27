import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicMedicines: vi.fn() }));

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["ar", "en", "ur", "hi", "bn", "fil"] }));
vi.mock("@/lib/api/public-medicines-server", () => ({ getPublicMedicines: state.getPublicMedicines }));

import PublicMedicineCatalogPage, { generateMetadata } from "./page";

describe("public medicine catalogue SSR boundary", () => {
  beforeEach(() => state.getPublicMedicines.mockReset());

  it("renders only public catalogue fields and omits price and patient data", async () => {
    state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "Ingredient", price: 99, patient_id: "private-patient" }]), { status: 200 }));

    const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ page: "1" }) }));

    expect(state.getPublicMedicines).toHaveBeenCalledWith({ page: 1 });
    expect(html).toContain("Published medicine");
    expect(html).toContain('\"@type\":\"WebPage\"');
    expect(html).not.toContain("99");
    expect(html).not.toContain("private-patient");
  });

  it("marks Arabic medicine details for bidirectional rendering inside the English catalogue", async () => {
    state.getPublicMedicines.mockResolvedValue(new Response(JSON.stringify([{ id: "published-medicine", name_en: "Published medicine", active_ingredient: "باراسيتامول 500 مجم" }]), { status: 200 }));

    const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }));

    expect(html).toContain('lang="ar"');
    expect(html).toContain('dir="auto"');
    expect(html).toContain("باراسيتامول 500 مجم");
  });

  it("keeps catalogue URLs out of the index until a verified medicine classification exists", async () => {
    const metadata = await generateMetadata({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "query", page: "1" }) });

    expect(metadata.robots).toMatchObject({ index: false, follow: false });
    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en/medicine-catalog");
    expect(metadata.alternates?.languages).toMatchObject({
      ar: "https://nabd.plus/ar/medicine-catalog",
      en: "https://nabd.plus/en/medicine-catalog",
      ur: "https://nabd.plus/ur/medicine-catalog",
      hi: "https://nabd.plus/hi/medicine-catalog",
      bn: "https://nabd.plus/bn/medicine-catalog",
      fil: "https://nabd.plus/fil/medicine-catalog",
      "x-default": "https://nabd.plus/ar/medicine-catalog",
    });
  });
});
