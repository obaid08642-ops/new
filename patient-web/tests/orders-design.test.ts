import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const orders = readFileSync(resolve(process.cwd(), "components-next/orders/orders.module.css"), "utf8");
const addresses = readFileSync(resolve(process.cwd(), "components-next/delivery-address/address-select.module.css"), "utf8");

describe("order screens design", () => {
  it("every link and choice has a visible keyboard focus and a 44 px target", () => {
    for (const selector of [".orderLink:focus-visible", ".callLink:focus-visible", ".summaryLink:focus-visible", ".textLink:focus-visible", ".pickLabel:has(input:focus-visible)"]) {
      expect(orders).toContain(selector);
    }
    expect(orders).toContain("min-block-size: 44px");
    expect(addresses).toContain(".choice:has(input:focus-visible)");
    expect(addresses).toContain("min-block-size: 44px");
  });

  it("uses tokens only: no raw colour, no physical left/right, no px font size", () => {
    for (const css of [orders, addresses]) {
      expect(css).not.toMatch(/#[0-9a-f]{3,8}\b/i);
      expect(css).not.toMatch(/\brgba?\(/i);
      expect(css).not.toMatch(/\b(margin|padding|border)-(left|right)\b|\b(left|right):/);
      expect(css).not.toMatch(/font-size:\s*\d+px/);
    }
  });

  it("draws the board's card: white surface, hairline, 24 radius (3xl), soft shadow, from tokens", () => {
    expect(orders).toMatch(/\.order\s*\{[^}]*var\(--nabd-color-bg-surface\)[^}]*var\(--nabd-color-border-hairline\)[^}]*var\(--nabd-radius-3xl\)[^}]*var\(--nabd-shadow-card\)/s);
  });
});
