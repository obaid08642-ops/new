import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");
const FILES = ["components-next/pharmacy/rx.module.css", "components-next/pharmacy/cart-screen.module.css"];

/** The cart, upload, order-from-prescription, prescription list/detail, barcode, request and chat screens (Batch 1b). */
describe("prescription and cart screens design", () => {
  it("are tokens only: no hex, rgb or hsl colour, and no named colour, in their stylesheets", () => {
    for (const file of FILES) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(css, file).not.toMatch(/\b(?:rgb|rgba|hsl|hsla)\(/);
      expect(css, file).not.toMatch(/:\s*(?:white|black|red|green|blue|gray|grey|orange|yellow|teal|purple|brown|pink)\b/i);
    }
  });

  it("use logical properties only, so one stylesheet serves RTL and LTR", () => {
    for (const file of FILES) {
      const css = read(file).replace(/\/\*[\s\S]*?\*\//g, "");
      expect(css, file).not.toMatch(/(?:^|[;{\s])(?:margin|padding|border)-(?:left|right)\s*:/);
      expect(css, file).not.toMatch(/(?:^|[;{\s])(?:left|right)\s*:/);
      expect(css, file).not.toMatch(/\btext-align\s*:\s*(?:left|right)\b/);
    }
  });

  it("keep every control at the 44 px touch target and honour reduced motion", () => {
    const css = read("components-next/pharmacy/rx.module.css");
    for (const selector of [".cardLink", ".textLink", ".bannerAction", ".thumbRemove"]) expect(css).toMatch(new RegExp(`${selector.replace(".", "\\.")}[^}]*(?:min-block-size|block-size): 44px`));
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("never write a style attribute (the CSP refuses it)", () => {
    for (const file of ["cart-screen", "rx-upload-screen", "rx-order-screen", "request-screen", "barcode-screen", "chat-screen", "address-card", "rx-medicines", "button-link", "link-empty-state"]) {
      expect(read(`components-next/pharmacy/${file}.tsx`), file).not.toMatch(/\bstyle=/);
    }
  });
});
