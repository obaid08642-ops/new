import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { ProductCard } from "@/components-next/ui-generated/components/Cards";
import { ProductCardStatic } from "@/components-next/pharmacy/product-card-static";

/** The server card must stay the design system's card: same markup, only the add button is the page's own client island. */
const addButton = (disabled: boolean) => (
  <button type="button" aria-label="add" disabled={disabled} className={`nabd-product-card__add${disabled ? " nabd-product-card__add--inert nabd-product-card__add--disabled" : ""}`} />
);
const strip = (html: string) => html.replace(/<button[\s\S]*?<\/button>/, "<button/>").replace(/<a /, "<a ");

describe("ProductCardStatic (issue 1835)", () => {
  const base = { name: "Panadol", meta: "Tablets · 500 mg", price: "24.50", currency: "SAR", discountLabel: "-39%", rxLabel: "Rx", onlineLabel: "Online only", imageSrc: "/i.webp" };

  it("draws the same markup as the generated ProductCard, outside the add button", () => {
    const generated = renderToStaticMarkup(<ProductCard {...base} addLabel="add" href="/ar/p/x" />);
    const server = renderToStaticMarkup(<ProductCardStatic {...base} href="/ar/p/x" add={addButton(false)} />);
    expect(strip(server)).toBe(strip(generated));
  });

  it("matches without an image (the pill glyph), without optional labels, and eager when it is a priority card", () => {
    const generated = renderToStaticMarkup(<ProductCard name="N" price="1" addLabel="add" href="/ar/p/x" />);
    const server = renderToStaticMarkup(<ProductCardStatic name="N" price="1" href="/ar/p/x" add={addButton(false)} />);
    expect(strip(server)).toBe(strip(generated));
    const eager = renderToStaticMarkup(<ProductCardStatic {...base} href="/ar/p/x" imagePriority add={addButton(false)} />);
    expect(eager).toContain('loading="eager"');
    expect(eager).toContain('fetchPriority="high"');
  });

  it("carries no client code of its own: no onClick, no style attribute", () => {
    const html = renderToStaticMarkup(<ProductCardStatic {...base} href="/ar/p/x" add={addButton(false)} />);
    expect(html).not.toContain("style=");
    expect(html).not.toContain("onclick");
  });
});
