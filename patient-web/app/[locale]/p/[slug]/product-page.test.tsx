import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ getPublicProduct: vi.fn(), getPublicAlternatives: vi.fn(), getPublicVariants: vi.fn(), failed: false }));

// The shell and the client controls are not under test here (the page's data and structured data are).
vi.mock("next/navigation", () => ({ notFound: vi.fn(), useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("@/components-next/core/core-shell", () => ({ CoreShell: ({ children }: { children: unknown }) => children }));

vi.mock("next-intl", () => ({ useTranslations: () => (key: string) => key }));
vi.mock("next-intl/server", () => ({ getTranslations: async () => (key: string) => key, setRequestLocale: vi.fn() }));
vi.mock("@/lib/i18n", () => ({
  isLocale: () => true,
  locales: ["ar", "en", "ur", "hi", "bn", "fil"],
}));
vi.mock("@/lib/api/public-products-server", () => ({
  getPublicProduct: state.getPublicProduct,
  readPublicProduct: async (...args: unknown[]) => ({ data: state.failed ? null : await state.getPublicProduct(...args), failed: state.failed }),
  getPublicAlternatives: state.getPublicAlternatives,
  getPublicVariants: state.getPublicVariants,
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
  beforeEach(() => {
    state.getPublicProduct.mockReset();
    state.getPublicAlternatives.mockReset().mockResolvedValue([]);
    state.getPublicVariants.mockReset().mockResolvedValue([]);
    state.failed = false;
  });

  it("renders the localized product with buy-ready price and structured data", async () => {
    state.getPublicProduct.mockResolvedValue(product);
    const html = renderToStaticMarkup(await PublicProductPage({ params }));
    expect(html).toContain("Abilify, Aripiprazole 15 Mg - 28 Tablets");
    // the price goes through the locale's currency formatter (was a hand-built "419.60 SAR")
    expect(html).toMatch(/>419\.60<\/strong><span[^>]*>SAR</);
    expect(html).not.toContain("style=");
    expect(html).toContain('"@type":"Product"');
    // schema.org Drug (MedicalDrug is not a schema.org type), with a parsed DrugStrength
    expect(html).toContain('"@type":"Drug"');
    expect(html).not.toContain('MedicalDrug');
    expect(html).toContain('"@type":"DrugStrength","strengthValue":15,"strengthUnit":"mg"');
    // AEO: the direct answer under the title, from the product's own fields, and speakable points at it
    expect(html).toContain('class="nabd-direct-answer');
    expect(html).toContain('".nabd-direct-answer"');
    // FAQ and HowTo questions come from messages, never hard-coded Arabic
    expect(html).not.toMatch(/الآثار الجانبية|التخزين —|الجرعة —|طريقة استخدام/);
    expect(html).toContain('"@type":"FAQPage"');
    expect(html).toContain('"@type":"BreadcrumbList"');
    expect(html).toContain('"sku":"697836"');
    expect(html).toContain('https://cdn.nabd.plus/100002_img_1.webp');
    // F82-1: the gallery image is the LCP element. It is a priority <img> (fetchPriority high) and React emits ONE
    // preload for it (with its srcset when the optimizer is on). The hand-written preload of the ORIGINAL url (removed)
    // made the browser download the picture twice, so exactly one image preload must be in the page.
    const preloads = html.match(/<link[^>]*rel="preload"[^>]*as="image"[^>]*>/g) ?? [];
    expect(preloads.length).toBe(1);
    expect(preloads[0]).toMatch(/imageSrcSet=/i); // the rendition that is shown, with its srcset
    expect(html).toMatch(/<img[^>]*src="https:\/\/cdn\.nabd\.plus\/100002_img_1\.webp"[^>]*loading="lazy"/i); // the zoom dialog picture is not fetched up front
    expect(html).toContain('href="/en/c/Medicine%20%26%20Treatment/Prescribed%20Treatments"');
  });

  // Decision D (issue 1556): a product with variants draws the picker and the chosen variant's own price.
  it("draws the variant picker and the chosen variant's price when the product has variants", async () => {
    state.getPublicProduct.mockResolvedValue({ ...product, id: "d2", is_rx: false, old_price: null, variant_group: "vg_diva", variant: { kind: "power", power: -2.5, colour: null, shade: null, position: 1 } });
    const variant = (id: string, power: number, price: number) => ({ id, sku: 1, slug: `diva-${id}`, name: `Diva ${power}`, price, old_price: null, currency: "SAR", is_rx: false, online_exclusive: false, available: true, availability_status: "none", image: `${id}.webp`, variant: { kind: "power", power, colour: null, shade: null, position: 0 } });
    state.getPublicVariants.mockResolvedValue([variant("d1", -0.25, 55), variant("d2", -2.5, 61.5)]);
    const html = renderToStaticMarkup(await PublicProductPage({ params }));
    expect(state.getPublicVariants).toHaveBeenCalledWith("en", expect.objectContaining({ id: "d2", variant_group: "vg_diva" }));
    expect(html).toContain('data-testid="variant-picker"');
    expect(html).toMatch(/aria-checked="true"[^>]*aria-label="-2.50"/);
    expect(html).toMatch(/>61\.50<\/strong><span[^>]*>SAR</);
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

  // F82-3: the page is cached, so a failed read must throw (Next keeps the last good copy) and never become a cached 404.
  it("throws when the service failed, and still answers not-found for a product that does not exist", async () => {
    state.failed = true;
    await expect(PublicProductPage({ params })).rejects.toThrow("public data unavailable");
    await expect(generateMetadata({ params })).rejects.toThrow("public data unavailable");
  });
});
