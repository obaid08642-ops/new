import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({ isLocale: () => true, locales: ["ar", "en", "ur", "hi", "bn", "fil"] }));

import PublicMedicineCatalogPage, { generateMetadata } from "./page";

function mockSearch(payload: unknown, status = 200) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload), { status })));
}

describe("public medicine catalogue SSR boundary", () => {
  beforeEach(() => vi.unstubAllGlobals());

  it("renders v14 catalog cards that link to canonical /p/{slug} product pages", async () => {
    mockSearch({ total: 1, items: [{ id: "m1", sku: 697836, slug: "abilify-15-mg", name: "Abilify 15 Mg", form: "Tablets", strength: "15 mg", active_ingredient: "Aripiprazole", price: 419.6, currency: "SAR", is_rx: true }] });

    const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ page: "1" }) }));

    expect(html).toContain("Abilify 15 Mg");
    expect(html).toContain('href="/en/p/abilify-15-mg"');
    expect(html).toContain('"@type":"WebPage"');
  });

  it("keeps search variants out of the index while the clean landing is indexable", async () => {
    const withQuery = await generateMetadata({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "query", page: "1" }) });
    expect(withQuery.robots).toMatchObject({ index: false, follow: true });
    const clean = await generateMetadata({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) });
    expect(clean.robots).toMatchObject({ index: true, follow: true });
    expect(clean.alternates?.canonical).toBe("https://nabd.plus/en/medicine-catalog");
    expect(clean.alternates?.languages).toMatchObject({
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
