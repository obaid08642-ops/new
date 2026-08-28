import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/health/health.module.css"), "utf8");

describe("health design", () => {
  it("provides accessible quick actions, responsive vital cards, and explicit states", () => {
    expect(css).toContain(".quickAction:focus-visible");
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover movement and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
