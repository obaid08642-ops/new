import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NabdMark } from "@/components-next/nabd-mark";

// Owner decision 2026-10-25: the Noon Dot is never black. Allowed: coral bowl and dot (`brand`) or the white mark (`onBrand`) on a coral tile.
function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    if (name === "node_modules" || name === ".next" || name === "ui-generated") return [];
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(tsx|ts)$/.test(name) && !name.endsWith(".test.tsx") && !name.endsWith(".test.ts") ? [path] : [];
  });
}

describe("NabdMark is never black", () => {
  it("brand draws the coral bowl and dot, in light and dark", () => {
    const html = renderToStaticMarkup(<NabdMark />);
    expect(html).toContain("var(--nabd-color-brand-coral)");
    expect(html).not.toContain("text-primary");
    expect(html).not.toContain("onInverse");
  });
  it("onBrand draws the white mark", () => {
    expect(renderToStaticMarkup(<NabdMark variant="onBrand" />)).toContain("var(--nabd-color-text-onBrand)");
  });
  it("no screen or component passes the removed text/ink variants", () => {
    const offenders = [...sources("components-next"), ...sources("app")].filter((file) => /<NabdMark[^>]*variant=(["'{]+)(text|ink)/.test(readFileSync(file, "utf8")));
    expect(offenders).toEqual([]);
  });
  it("the component source no longer has an ink or text variant", () => {
    const source = readFileSync("components-next/nabd-mark.tsx", "utf8");
    expect(source).toContain('type NabdMarkVariant = "brand" | "onBrand"');
    expect(source).not.toMatch(/text-primary|onInverse/);
  });
});
