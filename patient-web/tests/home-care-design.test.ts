import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Batch 4 (nursing / home care): the home care and nursing screens are drawn with the shared consultation kit and the
 * nursing parts (tokens, logical properties), not with a stylesheet of their own. The old assertions described the old
 * stylesheet (a 17rem card grid, hover lift, a dashed state box) which no longer exists; these pin the new contract.
 */
const files = [
  "app/[locale]/home-care/page.tsx",
  "app/[locale]/home-care/providers/page.tsx",
  "app/[locale]/home-care/services/page.tsx",
  "app/[locale]/home-care/services/[serviceId]/page.tsx",
  "app/[locale]/nursing/catalog/page.tsx",
  "app/[locale]/nursing/insurance-status/page.tsx",
  "app/[locale]/nursing/nurses/[nurseId]/page.tsx",
  "app/[locale]/nursing/visits/page.tsx",
  "app/[locale]/nursing/visits/[visitId]/page.tsx",
  "components-next/nursing-booking-form.tsx",
  "components-next/nursing/nursing-parts.tsx",
  "components-next/nursing/nursing.module.css",
];
const read = (file: string) => readFileSync(resolve(process.cwd(), file), "utf8");

describe("home care design", () => {
  it("draws every screen with the shared kit: no inline style (the CSP refuses it) and no raw colour", () => {
    for (const file of files) {
      const source = read(file);
      expect(source, file).not.toMatch(/\bstyle=\{/);
      expect(source, file).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
      expect(source, file).not.toMatch(/rgba?\(/);
    }
  });

  it("has no stylesheet of its own left in the screens' folders", () => {
    for (const file of ["app/[locale]/home-care/home-care.module.css", "app/[locale]/nursing/catalog/catalog.module.css", "app/[locale]/nursing/visits/visits.module.css"]) {
      expect(existsSync(resolve(process.cwd(), file)), file).toBe(false);
    }
  });

  it("keeps the shared stylesheet on tokens, logical properties and a reduced-motion-safe layout", () => {
    const css = read("components-next/nursing/nursing.module.css");
    expect(css).toContain("var(--nabd-");
    expect(css).not.toMatch(/\b(margin|padding)-(left|right)\b/);
    expect(css).not.toContain("transition");
  });
});
