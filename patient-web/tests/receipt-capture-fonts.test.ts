import { describe, expect, it } from "vitest";
import { cleanFamily, fontFaceBlock } from "@/lib/receipt/capture";

/** Reconciliation row 13: "Save as image" draws the card inside an SVG image, which cannot reach the page's web fonts, so the font files travel inside it. */
describe("receipt image fonts", () => {
  it("builds an @font-face rule with the file inlined and only the properties that are set", () => {
    expect(fontFaceBlock({ family: "'__Readex_Pro_1a2b'", weight: "160 700", style: "normal", unicodeRange: "U+0600-06FF", dataUrl: "data:font/woff2;base64,AAAA" })).toBe(
      "@font-face{font-family:'__Readex_Pro_1a2b';src:url(data:font/woff2;base64,AAAA);font-style:normal;font-weight:160 700;unicode-range:U+0600-06FF}",
    );
    expect(fontFaceBlock({ family: "X", dataUrl: "data:font/woff2;base64,BB" })).toBe("@font-face{font-family:X;src:url(data:font/woff2;base64,BB)}");
  });

  it("compares font-family names without quotes and spaces", () => {
    expect(cleanFamily(' "Readex Pro" ')).toBe("Readex Pro");
    expect(cleanFamily("'Noto Sans Arabic'")).toBe("Noto Sans Arabic");
    expect(cleanFamily("system-ui")).toBe("system-ui");
  });
});
