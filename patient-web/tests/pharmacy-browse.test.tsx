import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }) }));
vi.mock("next-intl", () => ({
  useTranslations: () => (key: string, values?: Record<string, unknown>) => (values ? `${key}:${Object.values(values).join(",")}` : key),
}));

import { CatalogImage } from "@/components-next/pharmacy/catalog-image";
import { ChipLink } from "@/components-next/pharmacy/chip-link";
import { ProductGrid, type GridProduct } from "@/components-next/pharmacy/product-grid";
import { ProductSections } from "@/components-next/pharmacy/product-sections";
import { discountPercent } from "@/lib/discount";
import { formatPrice } from "@/lib/format-price";

const item = (over: Partial<GridProduct> = {}): GridProduct => ({
  id: "p1", slug: "paracetamol-500", name: "Paracetamol 500", price: 24.5, oldPrice: null, image: null,
  form: "Tablets", strength: "500 mg", packageSize: "24", rx: false, ...over,
});

describe("pharmacy browse building blocks", () => {
  it("ChipLink uses the classes of the design system's Chip, so the two cannot drift", () => {
    const surfaces = readFileSync(resolve(process.cwd(), "components-next/ui-generated/components/Surfaces.tsx"), "utf8");
    for (const cls of ["nabd-chip", "nabd-chip__pill", "nabd-chip__pill--selected", "nabd-chip__count"]) expect(surfaces).toContain(cls);
    const html = renderToStaticMarkup(<ChipLink href="/ar/c/x" label="X" count={3} selected />);
    expect(html).toContain('class="nabd-chip');
    expect(html).toContain("nabd-chip__pill nabd-chip__pill--selected");
    expect(html).toContain('aria-current="page"');
    expect(html).toContain('<span class="nabd-chip__count">3</span>');
  });

  it("the product grid draws design-system cards as links to the product page, without a style attribute", () => {
    const html = renderToStaticMarkup(<ProductGrid locale="ar" items={[item(), item({ id: "p2", slug: "a b", oldPrice: 40 }), item({ id: "p3", slug: "rx-one", oldPrice: 40, rx: true })]} />);
    expect(html).toContain('href="/ar/p/paracetamol-500"');
    expect(html).toContain('href="/ar/p/a%20b"');
    expect((html.match(/class="nabd-product-card"/g) || []).length).toBe(3);
    expect(html).not.toContain("style=");
    expect(html).toContain("discount:39"); // 24.50 against 40: only the card with an old price above its price
    expect((html.match(/discount:/g) || []).length).toBe(1);
    expect(html).toContain("rxRequired");
  });

  it("decision 10: a prescription card shows no discount or cheaper badge even when the answer carries an old price", () => {
    const html = renderToStaticMarkup(<ProductGrid locale="en" items={[item({ oldPrice: 40, rx: true, badge: "cheaper" })]} />);
    expect(html).toContain("rxRequired");
    expect(html).not.toContain("discount:");
    expect(html).not.toContain("nabd-product-card__discount");
    expect(html).not.toContain("cheaper");
  });

  it("a product with no price says so and cannot be added: no invented 0.00", () => {
    const html = renderToStaticMarkup(<ProductGrid locale="en" items={[item({ price: 0 })]} />);
    expect(html).toContain("priceUnavailable");
    expect(html).not.toContain("0.00");
    expect(html).toMatch(/nabd-product-card__add[^"]*--disabled/);
  });

  it("the discount is computed from the two real prices and never invented", () => {
    expect(discountPercent(75, 100)).toBe(25);
    expect(discountPercent(100, null)).toBe(0);
    expect(discountPercent(100, 80)).toBe(0);
    expect(discountPercent(0, 80)).toBe(0);
  });

  it("prices go through the locale's currency formatter", () => {
    const en = formatPrice("en", 419.6);
    expect(en.amount).toBe("419.60");
    expect(en.currency).toBe("SAR");
  });

  it("the details keep every section's text in the HTML and open the first one", () => {
    const html = renderToStaticMarkup(
      <ProductSections
        label="details"
        groups={[
          { id: "usage", title: "Usage", sections: [{ id: "dose", title: "Dose", items: ["Adults: one", "Children: half"] }] },
          { id: "warn", title: "Warnings", sections: [{ id: "w", title: "Warnings", items: ["Not with alcohol"] }] },
        ]}
      />,
    );
    expect(html).toContain("Adults: one");
    expect(html).toContain("Not with alcohol"); // in the page even while its panel is hidden by the tab
    expect(html).toContain('aria-expanded="true"');
    expect(html).toContain('role="tablist"');
    expect(html).not.toContain("style=");
  });

  it("the catalogue image carries no inline style (the CSP refuses it)", () => {
    const html = renderToStaticMarkup(<CatalogImage src="https://cdn.nabd.plus/a.webp" alt="A" sizes="100vw" className="c" />);
    expect(html).toContain("<img");
    expect(html).toContain('class="c"');
    expect(html).not.toContain("style=");
  });
});
