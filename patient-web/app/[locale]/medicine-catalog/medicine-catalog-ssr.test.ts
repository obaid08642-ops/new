import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
// Batch 13: the page is drawn on the shared frame and the shared product cards (client components); the shell is not under test here.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));
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

  it("answers an empty search with the empty state and a failed read with the retry state, never an empty grid", async () => {
    mockSearch({ total: 0, items: [] });
    const none = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "zzz" }) }));
    expect(none).toContain("empty");
    expect(none).not.toContain("nabd-product-card");
    mockSearch({}, 503);
    const down = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({}) }));
    expect(down).toContain("unavailableTitle");
    expect(down).not.toContain("nabd-product-card");
  });

  it("links the next page with the query kept when there are more than one page of results", async () => {
    mockSearch({ total: 60, items: [{ id: "m1", sku: 1, slug: "a", name: "A", form: null, strength: null, active_ingredient: null, price: 1, currency: "SAR", is_rx: false }] });
    const html = renderToStaticMarkup(await PublicMedicineCatalogPage({ params: Promise.resolve({ locale: "en" }), searchParams: Promise.resolve({ q: "para", page: "1" }) }));
    expect(html).toContain('href="/en/medicine-catalog?page=2&amp;q=para"');
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
