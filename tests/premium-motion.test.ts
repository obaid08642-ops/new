import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const globalStyles = () => readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("premium motion accessibility", () => {
  it("provides a global reduced-motion override for non-essential animation", () => {
    const css = globalStyles();

    expect(css).toContain("@media (prefers-reduced-motion: reduce)");
    expect(css).toContain("animation-duration: .01ms !important");
    expect(css).toContain("transition-duration: .01ms !important");
  });

  it("keeps named Premium keyframes limited to composited visual properties", () => {
    const css = globalStyles();
    const premiumKeyframes = css.match(/@keyframes (?:premium-float|premium-enter|page-enter) \{[^}]+\{([^}]+)\}[^}]*\}/g) ?? [];

    expect(premiumKeyframes).toHaveLength(3);
    for (const keyframes of premiumKeyframes) {
      expect(keyframes).toMatch(/(?:opacity|transform)/);
      expect(keyframes).not.toMatch(/(?:width|height|margin|padding|top|right|bottom|left)\s*:/);
    }
  });

  it("avoids a blanket transition that could animate layout-sensitive properties", () => {
    expect(globalStyles()).not.toMatch(/transition\s*:\s*all\b/);
  });
});
