import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/medicines/[medicineId]/medicine-detail.module.css"), "utf8");

describe("medicine detail design", () => {
  it("provides accessible, responsive medicine information and an explicit unavailable state", () => {
    expect(css).toContain(".back:focus-visible");
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits interaction movement and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
