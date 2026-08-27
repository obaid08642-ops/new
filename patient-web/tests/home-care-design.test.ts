import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/home-care/home-care.module.css"), "utf8");

describe("home-care design", () => {
  it("keeps the care cards and states responsive and visually distinct", () => {
    expect(css).toContain("repeat(auto-fit, minmax(17rem, 1fr))");
    expect(css).toContain(".notice");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("contains hover effects and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
