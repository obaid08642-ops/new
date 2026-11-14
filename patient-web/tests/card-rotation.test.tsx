import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ProductCardStatic } from "@/components-next/pharmacy/product-card-static";
import { ROTATION_MS, nextIndex, shouldRotate } from "@/components-next/pharmacy/card-rotation";

const card = (moreImages?: string[]) =>
  renderToStaticMarkup(<ProductCardStatic name="Panadol" price="10" href="/en/p/panadol" imageSrc="/a.png" moreImages={moreImages} add={<span />} />);

describe("a product card with more than one picture", () => {
  it("draws only the first picture in the markup (no other picture is loaded until it is its turn)", () => {
    const html = card(["/b.png", "/c.png"]);
    expect(html.match(/<img /g)).toHaveLength(1);
    expect(html).toContain('src="/a.png"');
    expect(html).not.toContain("/b.png");
  });
  it("a card with one picture has no rotator", () => {
    expect(card(undefined)).toEqual(card([]));
  });
});

describe("the rotation rules", () => {
  it("turns every 2.5 s through the pictures and back to the first", () => {
    expect(ROTATION_MS).toBe(2500);
    expect([0, 1, 2].map((i) => nextIndex(i, 3))).toEqual([1, 2, 0]);
  });
  it("only a card with more than one picture turns, and not with reduced motion", () => {
    expect(shouldRotate(2, false)).toBe(true);
    expect(shouldRotate(1, false)).toBe(false);
    expect(shouldRotate(3, true)).toBe(false);
  });
});
