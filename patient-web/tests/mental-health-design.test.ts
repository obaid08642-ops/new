import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/mental-health/mental-health.module.css"), "utf8");

describe("mental-health design", () => {
  it("provides readable wellness summaries, support links, and explicit states", () => {
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain("a.card:focus-visible");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover animation and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
