// Owner layout decisions 10, 11 and additions a, b: no Map button on labs/radiology, "My orders and results" in the header and the phone menu,
// removable active-filter chips with "Clear all", a sticky search.
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const code = (file: string) => readFileSync(file, "utf8");

describe("labs and radiology layout", () => {
  it("draws no Map button on the diagnostics hub, labs or radiology", () => {
    for (const file of ["app/[locale]/diagnostics/page.tsx", "app/[locale]/diagnostics/radiology/page.tsx", "components-next/diagnostics/labs-catalog.tsx"]) {
      expect(code(file), file).not.toContain("mapType");
      expect(code(file), file).not.toContain("svcMap");
    }
  });
  it("passes the results route to the shell, which draws the icon and the menu entry from the same href", () => {
    for (const file of ["app/[locale]/diagnostics/page.tsx", "app/[locale]/diagnostics/radiology/page.tsx", "components-next/diagnostics/labs-catalog.tsx"]) {
      expect(code(file), file).toContain("resultsHref={`/${locale}/diagnostics/results`}");
    }
    const shell = code("components-next/core/core-shell.tsx");
    expect(shell).toContain('{ label: shell("menuResults"), href: resultsHref }');
    expect(shell.match(/aria-label=\{shell\("menuResults"\)\}/g)?.length).toBe(2);
  });
  it("labs: sticky search, chips only when a filter is active, each removable, plus Clear all", () => {
    const labs = code("components-next/diagnostics/labs-catalog.tsx");
    expect(labs).toContain("sticky");
    expect(labs).toContain("chips.length > 0");
    expect(labs).toContain('t("removeFilter"');
    expect(labs).toContain('t("clearAll")');
  });
});
