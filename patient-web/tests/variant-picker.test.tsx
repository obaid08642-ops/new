import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

// Owner decision D (issue 1556): the product page's variant picker, built for long lists.
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("next-intl", () => ({ useTranslations: () => (key: string, v?: Record<string, unknown>) => (v ? `${key}:${Object.values(v).join(",")}` : key) }));
vi.mock("@/lib/context/CartContext", () => ({ useCart: () => ({ addItem: vi.fn(), items: [], updateQty: vi.fn() }) }));
vi.mock("next/image", () => ({ getImageProps: ({ src }: { src: string }) => ({ props: { src } }) }));

import { BuyProvider, type BuyProduct, type BuyVariant } from "@/components-next/pharmacy/product-buy";
import { VariantPicker, buildSwatches, formatPower, visiblePowers } from "@/components-next/pharmacy/variant-picker";

const v = (id: string, power: number | null, colour: string | null, extra: Partial<BuyVariant> = {}): BuyVariant => ({
  id, sku: Number(id.replace(/\D/g, "")) || null, slug: `diva-${id}`, name: `Diva ${colour ?? ""} ${power ?? ""}`.trim(), price: 60,
  image: `https://cdn.nabd.plus/${id}.webp`, available: true, power, colour, shade: null, kind: colour && power !== null ? "colour_power" : power !== null ? "power" : "picture", ...extra,
});
const page: BuyProduct = { id: "d2", name: "Diva", price: 60, rx: false, image: null, slug: "diva-d2", activeIngredient: null, form: null, strength: null };

const diva = [
  v("d1", -0.25, "hazel gray"), v("d2", -2.5, "hazel gray"), v("d3", 1.5, "hazel gray"), v("d4", -2.5, "brown", { available: false }),
  ...Array.from({ length: 14 }, (_, i) => v(`p${i}`, -(i + 12) * 0.25, "hazel gray")),
];

describe("variant picker model", () => {
  it("formats a power with its sign and two decimals in the page's language", () => {
    expect(formatPower("en", -2.5)).toBe("-2.50");
    expect(formatPower("en", 1.25)).toBe("+1.25");
    expect(formatPower("en", 0)).toBe("0.00");
  });

  it("Diva: one swatch per colour (its picture), the colour's powers split into minus and plus", () => {
    const sw = buildSwatches(diva, (n) => `Option ${n}`);
    expect(sw.map((s) => [s.key, s.label, s.available])).toEqual([["hazel gray", "Hazel Gray", true], ["brown", "Brown", false]]);
    const sel = diva[1];
    const minus = visiblePowers(diva, sel, "", null);
    expect(minus.activeSign).toBe("minus");
    expect(minus.shown.every((x) => (x.power ?? 0) <= 0 && x.colour === "hazel gray")).toBe(true);
    expect(minus.shown.some((x) => x.id === "d4")).toBe(false); // another colour's power
    expect(visiblePowers(diva, sel, "", "plus").shown.map((x) => x.id)).toEqual(["d3"]);
  });

  it("the power search matches with or without the sign, across both sides", () => {
    expect(visiblePowers(diva, diva[1], "-2.5", null).shown.map((x) => x.id)).toEqual(["d2"]);
    expect(visiblePowers(diva, diva[1], "1.5", null).shown.map((x) => x.id)).toEqual(["d3"]);
    expect(visiblePowers(diva, diva[1], "+1", null).shown.map((x) => x.id)).toEqual(["d3"]);
    expect(visiblePowers(diva, diva[1], "−0.25", null).shown.map((x) => x.id)).toEqual(["d1"]);
  });

  it("Lensme / Newlens: picture swatches named Option n, never an invented colour", () => {
    const lensme = [v("l1", null, null), v("l2", null, null), v("l3", null, null)];
    expect(buildSwatches(lensme, (n) => `Option ${n}`).map((s) => s.label)).toEqual(["Option 1", "Option 2", "Option 3"]);
  });
});

describe("VariantPicker", () => {
  it("draws lazy picture swatches, the power grid with minus/plus and search, and greys an unavailable variant", () => {
    const html = renderToStaticMarkup(
      <BuyProvider locale="en" product={page} variants={diva}>
        <VariantPicker locale="en" />
      </BuyProvider>,
    );
    expect(html).toContain('data-testid="variant-picker"');
    expect(html).toMatch(/<img[^>]*src="https:\/\/cdn\.nabd\.plus\/d1\.webp"[^>]*loading="lazy"/);
    expect(html).toMatch(/<button[^>]*role="radio"[^>]*aria-checked="false"[^>]*aria-label="variantUnavailable:Brown"[^>]*disabled=""/);
    expect(html).toMatch(/aria-checked="true"[^>]*aria-label="-2.50"/);
    expect(html).toContain("variantMinus");
    expect(html).toContain("variantPlus");
    expect(html).toContain("variantPowerSearch"); // more than 12 powers: the search field
    expect(html).toContain("variantChosen:Hazel Gray · -2.50");
  });

  it("draws nothing for a product without variants", () => {
    const html = renderToStaticMarkup(
      <BuyProvider locale="en" product={page}>
        <VariantPicker locale="en" />
      </BuyProvider>,
    );
    expect(html).toBe("");
  });
});
