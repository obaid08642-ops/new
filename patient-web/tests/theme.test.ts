import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  THEME_INIT_SCRIPT,
  THEME_STORAGE_KEY,
  THEMES,
  isTheme,
} from "@/app/theme";

const layout = readFileSync(
  resolve(process.cwd(), "app/[locale]/layout.tsx"),
  "utf8",
);
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("12.A3 — theme", () => {
  it("resolves before first paint, in the document, not after mount", () => {
    // A theme resolved in an effect is a flash of the wrong theme on every
    // navigation, so the resolver has to be a synchronous script in the markup.
    expect(layout).toContain("THEME_INIT_SCRIPT");
    expect(layout.indexOf("THEME_INIT_SCRIPT")).toBeLessThan(layout.indexOf("<header"));
    expect(THEME_INIT_SCRIPT).toContain("localStorage");
    expect(THEME_INIT_SCRIPT).toContain("prefers-color-scheme: dark");
  });

  it("sets the attribute AND the class, because page overrides use the class", () => {
    // This is the defect the runtime contrast audit found: 64 `:global(.dark)`
    // rules and zero code that set `.dark`. Tokens flipped to dark, panels did
    // not, and 63 strings measured as low as 1.07:1.
    const attributeRules = (css.match(/\[data-theme="dark"\]/g) ?? []).length;
    expect(attributeRules).toBeGreaterThan(0);
    expect(THEME_INIT_SCRIPT).toContain('setAttribute("data-theme"');
    expect(THEME_INIT_SCRIPT).toContain('classList.toggle("dark"');
    expect(THEME_INIT_SCRIPT).toContain("colorScheme");
  });

  it("stores an explicit choice and treats system as a real state", () => {
    expect(THEMES).toEqual(["light", "dark"]);
    expect(isTheme("dark")).toBe(true);
    expect(isTheme("system")).toBe(false);
    expect(isTheme(null)).toBe(false);
    expect(THEME_STORAGE_KEY).toBe("nabd.theme");
  });

  it("survives storage being unavailable instead of throwing during paint", () => {
    // Safari private mode throws on localStorage. An exception here would abort
    // the script before the attribute is set, leaving the page unthemed.
    expect(THEME_INIT_SCRIPT).toContain("try");
    expect(THEME_INIT_SCRIPT.trim().endsWith("})();"));
  });

  it("declares one breakpoint scale, and the a11y floor", () => {
    // 12.A10: nine ad-hoc max-widths (360/420/430/440/540/760/860/1024/1060/
    // 1080/1100) meant two screens could each be "mobile" at a different point.
    for (const bp of ["sm", "md", "lg", "xl", "2xl"]) {
      expect(css).toContain(`--nabd-breakpoint-${bp}:`);
    }
    expect(css).toContain("--nabd-layout-max:");
    expect(css).toContain("@media (max-width: 360px)");
  });

  it("uses the motion tokens rather than hand-written durations (12.A9)", () => {
    // The motion scale existed and nothing consumed it, so timings were written
    // by hand in 11 places and the reduced-motion decision could not be enforced.
    expect(css).toContain("--nabd-motion-duration-enter");
    expect(css).toContain("--nabd-motion-easing-enter");
  });

  it("consumes the glass tokens rather than hand-rolled white (12.A8)", () => {
    // glass.bg / glass.bgStrong existed and zero screens used them; the premium
    // surfaces reimplemented the idea with rgba(255,255,255,...) that cannot
    // follow a theme change.
    expect(css).toContain("--nabd-color-glass-bg");
    expect(css).toContain("--nabd-color-glass-bgStrong");
    expect(css).not.toMatch(/rgba\(255,\s*255,\s*255/);
  });

  it("offers all three states in the header", () => {
    expect(layout).toContain("<ThemeToggle");
    expect(css).toContain(".theme-toggle");
    // The control must be reachable and announce its state.
    expect(css).toMatch(/\.theme-option\s*\{[^}]*min-width/);
  });
});
