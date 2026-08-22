import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/settings/settings.module.css"), "utf8");

describe("account settings design", () => {
  it("provides structured settings cards, protected boundaries, and honest states", () => {
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".boundary");
    expect(css).toContain(".sessionsSummary");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("collapses safely for narrow screens", () => {
    expect(css).toContain("@media (max-width: 760px)");
    expect(css).toContain("@media (max-width: 440px)");
  });
});
