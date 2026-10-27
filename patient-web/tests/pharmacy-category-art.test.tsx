import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { CATEGORY_ART, CATEGORY_ART_KEYS, CATEGORY_ART_TONE, categoryArtKey } from "@/components-next/ui-generated/icons/category-art";
import { SERVICE_TONES } from "@/components-next/ui-generated/icons/fill";
import { CategoryArt } from "@/components-next/pharmacy/category-art";
import { CategoryTile } from "@/components-next/pharmacy/category-tile";

const read = (rel: string) => readFileSync(join(__dirname, "..", rel), "utf8");

describe("pharmacy category illustrations (shared module)", () => {
  it("every art has shapes and a tone from the ten service tones", () => {
    for (const key of CATEGORY_ART_KEYS) {
      expect(CATEGORY_ART[key].length).toBeGreaterThan(1);
      expect(SERVICE_TONES).toContain(CATEGORY_ART_TONE[key]);
    }
  });

  it("maps the eight main trees in Arabic and English to their art, unknown names to generic", () => {
    const cases: Array<[string, string]> = [
      ["الأدوية والعلاج", "medicines"], ["الفيتامينات والتغذية الصحية", "vitamins"], ["الأم والطفل", "motherBaby"],
      ["العناية بالبشرة", "skin"], ["العناية بالشعر", "hair"], ["المكياج والإكسسوارات", "makeup"],
      ["العناية الشخصية", "personal"], ["الرعاية الصحية المنزلية والأجهزة الطبية", "devices"],
      ["Skin Care", "skin"], ["Hair Care", "hair"], ["Personal Care", "personal"], ["Medicines", "medicines"], ["???", "generic"],
    ];
    for (const [name, art] of cases) expect(categoryArtKey(name), name).toBe(art);
  });

  it("draws roles as classes (no colour value, no style attribute) and is decorative", () => {
    const html = renderToStaticMarkup(<CategoryArt art="medicines" />);
    expect(html).toContain('aria-hidden="true"');
    expect(html).not.toMatch(/style=|#[0-9a-fA-F]{3,8}\b|rgb\(/);
    expect(read("components-next/pharmacy/category-art.module.css")).toContain("var(--nabd-tone-fg)");
  });

  it("a tile shows the name and the art and never a count", () => {
    const html = renderToStaticMarkup(<CategoryTile href="/ar/c/x" label="العناية بالبشرة" selected />);
    expect(html).toContain("العناية بالبشرة");
    expect(html).toContain("nabd-tone--peach");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain("<svg");
  });
});

describe("pharmacy page layout (owner decisions 2026-10-26, items 3 to 9)", () => {
  const view = read("app/[locale]/c/[[...category]]/category-view.tsx");
  it("title is the pharmacy, no map, no shortcuts row, no public product count", () => {
    expect(view).toContain('t("pageTitle")');
    expect(view).not.toContain("MapEntryLink");
    for (const gone of ["hubFavorites", "hubCart", "hubReminders", "hubOrders", "productsCount", "OrderAgainCard"]) expect(view).not.toContain(gone);
    expect(view).not.toMatch(/count=\{/);
  });
  it("keeps the search, the upload button, the filter panel and the sort", () => {
    for (const kept of ["<CatalogSearch", "hubUploadTitle", "<CatalogueFilterPanel", "t(\"sortLabel\")"]) expect(view).toContain(kept);
  });
  it("Home carries Reminders and My orders and the order-again row", () => {
    const tiles = read("components-next/pharmacy/home-quick-tiles.tsx");
    expect(tiles).toContain("/health/medications?tab=all");
    expect(tiles).toContain("/orders");
    expect(tiles).toContain("<OrderAgainCard");
    expect(read("app/[locale]/page.tsx")).toContain("<HomeQuickTiles");
  });
});

// The real top-level category names of the public catalogue (GET /public/categories/{locale}, read 2026-10-26): none may fall back to the generic art.
const REAL_CATEGORY_NAMES: Record<string, string[]> = {
  "ar": [
    "الأدوية والعلاج",
    "العناية الشخصية",
    "العناية بالشعر",
    "المكياج والإكسسوارات",
    "العناية بالبشرة",
    "الأم والطفل",
    "الفيتامينات والتغذية الصحية",
    "الرعاية الصحية المنزلية والأجهزة الطبية",
    "النظافة الشخصية والحماية",
    "أدوية ومكملات غذائية",
    "العناية بالجسم والاستحمام",
    "تجميل وعناية",
    "الصحة والعافية المتخصصة"
  ],
  "en": [
    "Medicine & Treatment",
    "Personal Care",
    "Hair Care",
    "Makeup & Accessories",
    "Skin Care",
    "Mother & Baby",
    "Vitamins & Healthy Nutrition",
    "Home Health Care & Medical Devices",
    "Personal Hygiene & Protection",
    "Medications & Supplements",
    "Bath & Body Care",
    "Cosmetics & Care",
    "Specialized Wellness"
  ],
  "ur": [
    "ادویات اور علاج",
    "ذاتی نگہداشت",
    "بالوں کی دیکھ بھال",
    "میک اپ اور لوازمات",
    "ماں اور بچہ",
    "جلد کی دیکھ بھال",
    "وٹامنز اور صحت مند غذائیت",
    "Skin Care",
    "Makeup & Accessories",
    "گھریلو صحت کی دیکھ بھال اور طبی آلات",
    "ذاتی حفظان صحت اور تحفظ",
    "Hair Care",
    "Personal Care",
    "ادویات اور سپلیمنٹس",
    "Bath & Body Care",
    "غسل اور جسم کی دیکھ بھال",
    "کاسمیٹکس اور نگہداشت",
    "Medicine & Treatment",
    "Vitamins & Healthy Nutrition",
    "خصوصی تندرستی",
    "Home Health Care & Medical Devices"
  ],
  "hi": [
    "दवाएं और उपचार",
    "व्यक्तिगत देखभाल",
    "बालों की देखभाल",
    "मेकअप और सहायक उपकरण",
    "माँ और बच्चा",
    "त्वचा की देखभाल",
    "विटामिन और स्वस्थ पोषण",
    "Skin Care",
    "Makeup & Accessories",
    "घरेलू स्वास्थ्य देखभाल और चिकित्सा उपकरण",
    "व्यक्तिगत स्वच्छता और सुरक्षा",
    "Hair Care",
    "Personal Care",
    "दवाएँ एवं अनुपूरक",
    "Bath & Body Care",
    "स्नान और शरीर की देखभाल",
    "सौंदर्य प्रसाधन एवं देखभाल",
    "Vitamins & Healthy Nutrition",
    "Medicine & Treatment",
    "विशिष्ट कल्याण",
    "Home Health Care & Medical Devices"
  ],
  "bn": [
    "ওষুধ ও চিকিৎসা",
    "ব্যক্তিগত পরিচর্যা",
    "চুলের যত্ন",
    "মেকআপ ও আনুষাঙ্গিক",
    "মা ও শিশু",
    "ত্বকের যত্ন",
    "ভিটামিন ও স্বাস্থ্যকর পুষ্টি",
    "Skin Care",
    "Makeup & Accessories",
    "গৃহ স্বাস্থ্যসেবা ও চিকিৎসা সরঞ্জাম",
    "ব্যক্তিগত স্বাস্থ্যবিধি ও সুরক্ষা",
    "Hair Care",
    "Personal Care",
    "ওষুধ ও পরিপূরক",
    "Bath & Body Care",
    "স্নান ও শরীরের যত্ন",
    "প্রসাধনী এবং যত্ন",
    "Vitamins & Healthy Nutrition",
    "Medicine & Treatment",
    "বিশেষ সুস্থতা",
    "Home Health Care & Medical Devices"
  ],
  "fil": [
    "Gamot at Paggamot",
    "Personal na Pag-aalaga",
    "Pangangalaga sa Buhok",
    "Pampaganda at mga Aksesorya",
    "Ina at Sanggol",
    "Pangangalaga sa Balat",
    "Mga Bitamina at Masustansyang Nutrisyon",
    "Skin Care",
    "Makeup & Accessories",
    "Pangangalagang Pangkalusugan sa Bahay at Medikal na Kagamitan",
    "Personal na Kalinisan at Proteksyon",
    "Hair Care",
    "Personal Care",
    "Mga Gamot at Supplement",
    "Bath & Body Care",
    "Paliligo at Pangangalaga sa Katawan",
    "Mga Kosmetiko at Pangangalaga",
    "Medicine & Treatment",
    "Vitamins & Healthy Nutrition",
    "Espesyal na Kalusugan",
    "Home Health Care & Medical Devices"
  ]
};

describe("every real catalogue category has its own art", () => {
  for (const [locale, list] of Object.entries(REAL_CATEGORY_NAMES)) {
    it(`${locale}: no real category falls back to generic`, () => {
      const generic = list.filter((name) => categoryArtKey(name) === "generic");
      expect(generic).toEqual([]);
    });
  }
  it("the English category pairs keep the same art in every language", () => {
    const en = REAL_CATEGORY_NAMES.en.map((name) => categoryArtKey(name));
    expect(en).toEqual(["medicines", "personal", "hair", "makeup", "skin", "motherBaby", "vitamins", "devices", "personal", "vitamins", "personal", "makeup", "vitamins"]);
  });
});
