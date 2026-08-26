import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/prescriptions/prescriptions.module.css"), "utf8");

describe("prescriptions design", () => {
  it("provides responsive prescription cards and explicit states", () => {
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
