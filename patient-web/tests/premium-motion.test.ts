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

  it("resolves the UI font from the token sheet and ships no embedded font binary", () => {
    const css = globalStyles();
    // A5 replaced the hand-written stacks with the generated sheet, so the app
    // no longer pins a font literal. What still has to hold: the stack is
    // token-driven, it still terminates in real system fonts so a failed
    // download degrades instead of rendering nothing, and no binary ships.
    const fontSheet = readFileSync(resolve(process.cwd(), "app/design-tokens/fonts.css"), "utf8");
    const sans = fontSheet.match(/--nabd-font-sans:\s*([^;]+);/)?.[1] ?? "";
    expect(sans).toContain("'Readex Pro'");
    expect(sans).toContain("system-ui");
    expect(sans).toContain("-apple-system");
    // The Arabic locale keeps an explicit Noto face.
    expect(fontSheet).toContain("--nabd-font-ar:");
    expect(fontSheet).toContain("'Noto Sans Arabic'");
    // The app points at the token rather than restating a stack.
    expect(css).toContain("--font-ui: var(--nabd-font-sans)");
    // No binary, and no reintroduced "Nabd Cairo" brand face.
    expect(css).not.toContain("@font-face");
    expect(css).not.toContain("Nabd Cairo");
    expect(fontSheet).not.toContain("@font-face");
  });
});
