import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicProduct: vi.fn() }));

vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({
  isLocale: () => true,
  locales: ["ar", "en", "ur", "hi", "bn", "fil"],
}));
vi.mock("@/lib/api/public-products-server", () => ({
  getPublicProduct: state.getPublicProduct,
  cdnImage: (u?: string | null) => (u ? (u.startsWith("http") ? u : `https://cdn.nabd.plus/${u}`) : null),
}));

import PublicProductPage, { generateMetadata } from "./page";

const product = {
  id: "med_v14_100002", sku: 697836, locale: "en",
  name: "Abilify, Aripiprazole 15 Mg - 28 Tablets", official_name: "Abilify, Aripiprazole 15 Mg - 28 Tablets",
  slug: "abilify-aripiprazole-15-mg-28-tablets",
  slugs: { ar: "أبليفاي-أريبيبرازول-15-مجم-28-قرص", en: "abilify-aripiprazole-15-mg-28-tablets", ur: "ایبلیفائی-15", hi: "एबलफई-15", bn: "অযবলফই-15", fil: "abilify-aripiprazole-15-mg-28-tablets" },
  description: "Antipsychotic tablets.",
  indications: ["Used to treat schizophrenia"], dosage_instructions: "Take by mouth.",
  side_effects: ["Dizziness"], warnings: ["Consult your doctor"], storage_conditions: "Store below 25°C",
  how_to_use: ["Take by mouth."], package_content_details: "28 Tablets", brand_benefits: null,
  category: "Medicine & Treatment", sub_category: "Prescribed Treatments", sub_sub_category: "Cns",
  form: "Tablets", strength: "15 mg", package_size: "28 Tabs", active_ingredient: "Aripiprazole",
  manufacturer: null, barcode: null, price: 419.6, old_price: 500, discount_percent: 16, has_discount: true,
  currency: "SAR", is_rx: true, available_online: false, availability_status: "none", available: true,
  country_of_origin: null, images: ["100002_img_1.webp"], image: "100002_img_1.webp",
};

const params = Promise.resolve({ locale: "en", slug: "abilify-aripiprazole-15-mg-28-tablets" });

describe("public product page (catalog v14)", () => {
  beforeEach(() => state.getPublicProduct.mockReset());

  it("renders the localized product with buy-ready price and structured data", async () => {
    state.getPublicProduct.mockResolvedValue(product);
    const html = renderToStaticMarkup(await PublicProductPage({ params }));
    expect(html).toContain("Abilify, Aripiprazole 15 Mg - 28 Tablets");
    expect(html).toContain("419.60 SAR");
    expect(html).toContain('"@type":"Product"');
    expect(html).toContain('"@type":"MedicalDrug"');
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"sku":"697836"');
    expect(html).toContain('https://cdn.nabd.plus/100002_img_1.webp');
    expect(html).toContain('fetchPriority="high"');
    expect(html).toContain('href="/en/c/Medicine%20%26%20Treatment/Prescribed%20Treatments"');
  });

  it("emits indexable metadata with per-locale hreflang slugs", async () => {
    state.getPublicProduct.mockResolvedValue(product);
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toMatchObject({ index: true, follow: true });
    expect(metadata.alternates?.canonical).toBe("https://nabd.plus/en/p/abilify-aripiprazole-15-mg-28-tablets");
    const languages = metadata.alternates?.languages as Record<string, string>;
    expect(languages.ar).toBe(`https://nabd.plus/ar/p/${encodeURIComponent("أبليفاي-أريبيبرازول-15-مجم-28-قرص")}`);
    expect(languages.ur).toBe(`https://nabd.plus/ur/p/${encodeURIComponent("ایبلیفائی-15")}`);
    expect(languages.fil).toBe("https://nabd.plus/fil/p/abilify-aripiprazole-15-mg-28-tablets");
    expect(languages["x-default"]).toContain("https://nabd.plus/ar/p/");
    expect((metadata.openGraph as { images?: Array<{ url: string }> })?.images?.[0]?.url).toBe("https://cdn.nabd.plus/100002_img_1.webp");
  });

  it("stays noindex when the product is not public", async () => {
    state.getPublicProduct.mockResolvedValue(null);
    const metadata = await generateMetadata({ params });
    expect(metadata.robots).toMatchObject({ index: false, follow: false });
  });
});
