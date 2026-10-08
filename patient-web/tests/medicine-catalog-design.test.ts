import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const page = readFileSync(resolve(process.cwd(), "app/[locale]/medicine-catalog/page.tsx"), "utf8");
const landingCss = readFileSync(resolve(process.cwd(), "components-next/landing/landing.module.css"), "utf8");

// Batch 13: the catalogue was drawn with its own module (mint gradient, raw colours, its own card); it now uses the shared
// landing frame and the pharmacy product cards, so the old module's assertions (its own focus ring, dashed empty state and
// hover rules) moved to the design system's components, which carry them (tests/design-system-components.test.tsx).
describe("medicine catalog design", () => {
  it("is drawn on the shared landing frame, search field and product cards, not on a module of its own", () => {
    expect(existsSync(resolve(process.cwd(), "app/[locale]/medicine-catalog/medicine-catalog.module.css"))).toBe(false);
    expect(page).toContain("LandingPage");
    expect(page).toContain("CatalogSearch");
    expect(page).toContain("ProductGrid");
    expect(page).not.toContain("style=");
  });

  it("keeps an honest empty state and a retry state for a failed read", () => {
    expect(page).toContain("LandingEmpty");
    expect(page).toContain("RetryErrorState");
  });

  it("the landing styles use tokens only: no raw colour and no physical left/right", () => {
    expect(landingCss).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(/);
    expect(landingCss).not.toMatch(/\b(margin|padding)-(left|right)\b|\b(left|right):/);
  });
});
