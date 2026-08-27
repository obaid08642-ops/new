import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/family/family.module.css"), "utf8");

describe("family design", () => {
  it("provides responsive member cards, privacy notice, and explicit states", () => {
    expect(css).toContain("repeat(auto-fit, minmax(17rem, 1fr))");
    expect(css).toContain(".notice");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover movement and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
