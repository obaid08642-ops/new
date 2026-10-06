import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  fontHrefFor,
  fontStackFor,
  locales,
  typeScale,
  tokens,
  token,
  isThemed,
} from "@nabd/design-tokens";
import tokensSource from "../../packages/design-tokens/tokens.json";

/**
 * 12.A5 — typography. One family that covers Arabic, Latin, Urdu (Nastaliq),
 * Devanagari and Bengali, with the fallback for the active locale loaded and
 * nothing more; and a type scale, so no screen ever writes its own font size.
 */
const repo = (p: string) => resolve(process.cwd(), p);

describe("Nabd+ typography", () => {
  it("supports exactly the six locales of the plan", () => {
    expect([...locales]).toEqual(["ar", "en", "ur", "hi", "fil", "bn"]);
  });

  it("loads only the scripts a locale actually renders", () => {
    // Readex Pro everywhere; one script-specific family per locale that needs it.
    const expected: Record<string, string[]> = {
      ar: ["Readex+Pro", "Noto+Sans+Arabic"],
      en: ["Readex+Pro"],
      fil: ["Readex+Pro"],
      ur: ["Readex+Pro", "Noto+Nastaliq+Urdu"],
      hi: ["Readex+Pro", "Noto+Sans+Devanagari"],
      bn: ["Readex+Pro", "Noto+Sans+Bengali"],
    };
    for (const locale of locales) {
      const href = fontHrefFor(locale);
      const families = [...href.matchAll(/family=([^:&]+):/g)].map((m) => m[1]);
      expect(families, `families requested for ${locale}`).toEqual(expected[locale]);
      // Weights 300/400/500/700, and swap-display so the text never blocks paint.
      expect(href).toContain("wght@300;400;500;700");
      expect(href).toContain("display=swap");
    }
  });

  it("puts the script-specific family first where the script needs it", () => {
    // Nastaliq and Devanagari must win for Urdu and Hindi, or Readex Pro is used
    // and the glyphs come out wrong.
    expect(fontStackFor("ur").startsWith("'Noto Nastaliq Urdu'")).toBe(true);
    expect(fontStackFor("hi").startsWith("'Noto Sans Devanagari'")).toBe(true);
    expect(fontStackFor("bn").startsWith("'Noto Sans Bengali'")).toBe(true);
    // Latin and Arabic lead with the brand family.
    expect(fontStackFor("en").startsWith("'Readex Pro'")).toBe(true);
    expect(fontStackFor("ar").startsWith("'Readex Pro'")).toBe(true);
    // Every stack ends in a generic fallback, or a missing glyph is invisible.
    for (const locale of locales) expect(fontStackFor(locale)).toMatch(/sans-serif$/);
  });

  it("exposes the whole type scale with a line height for Arabic", () => {
    const scale = typeScale();
    expect(Object.keys(scale).sort()).toEqual(
      ["body", "bodyLg", "bodyStrong", "caption", "display", "h1", "h2", "h3", "h4", "label", "micro"].sort(),
    );
    for (const [name, step] of Object.entries(scale)) {
      expect(step.size, `${name}.size`).toMatch(/^\d+(\.\d+)?px$/);
      // A line height is not optional: the Arabic line height is the point.
      expect(step.lineHeight, `${name}.lineHeight`).toMatch(/^\d/);
      expect([400, 500, 700], `${name}.weight`).toContain(step.weight);
    }
    // The scale decreases, and body is the readable default.
    expect(parseFloat(scale.display.size)).toBeGreaterThan(parseFloat(scale.h1.size));
    expect(parseFloat(scale.h1.size)).toBeGreaterThan(parseFloat(scale.h4.size));
    expect(parseFloat(scale.body.size)).toBeGreaterThan(parseFloat(scale.micro.size));
    expect(Number(scale.body.lineHeight)).toBeGreaterThanOrEqual(1.5);
  });

  it("writes the scale and the locale stacks out as CSS custom properties", () => {
    const css = readFileSync(repo("../packages/design-tokens/dist/css/fonts.css"), "utf8");
    for (const locale of locales) expect(css).toContain(`--nabd-font-${locale}:`);
    expect(css).toContain("--nabd-font-sans:");
    // Every scale step gets a size, a line height and a weight variable.
    expect(css).toContain("--nabd-font-size-display: 40px");
    expect(css).toContain("--nabd-line-height-body: 1.7");
    expect(css).toContain("--nabd-font-weight-body: 400");
    // A preview import, so a static render never falls back to a system font.
    expect(css).toContain("@import url(\"https://fonts.googleapis.com/css2?");
    expect(css).toContain("family=Readex+Pro");
  });

  it("keeps colour tokens resolvable per theme, and throws on a typo", () => {
    expect(tokens("light").color.bg.surface).toBe("#FFFFFF");
    expect(tokens("dark").color.bg.surface).toBe("#12263A");
    // A themed token reports that it has a pair, so a seasonal override can find it.
    expect(isThemed("color.bg.canvas")).toBe(true);
    expect(isThemed("color.brand.ink")).toBe(false);
    expect(token("a11y.minTouchTarget", "light")).toBe("44px");
    expect(() => token("color.nope", "light")).toThrow(/Unknown design token/);
  });

  it("declares a contrast pair for every pairing a component may use", () => {
    const pairs = tokensSource.contrast as Array<{ fg: string; bg: string; min: number }>;
    expect(Array.isArray(pairs)).toBe(true);
    expect(pairs.length).toBeGreaterThanOrEqual(30);
    for (const pair of pairs) {
      // Every pair must name two real colour tokens, or the checker is vacuous.
      expect(() => token(`color.${pair.fg}`, "light")).not.toThrow();
      expect(() => token(`color.${pair.bg}`, "light")).not.toThrow();
      // Body text is AA, icons and large text are 3:1 — never below.
      expect(pair.min).toBeGreaterThanOrEqual(3);
    }
  });
});
