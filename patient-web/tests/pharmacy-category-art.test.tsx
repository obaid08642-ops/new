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
