import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");

describe("patient design system", () => {
  it("defines a restrained healthcare palette and readable typography tokens", () => {
    expect(css).toContain("--canvas: #f6f7f9");
    expect(css).toContain("--surface: #ffffff");
    expect(css).toContain("--ink: #101828");
    expect(css).toContain("--brand: #087f8c");
    expect(css).toContain("--font-ui-arabic");
  });

  it("keeps visible keyboard focus and honours reduced-motion preferences", () => {
    expect(css).toContain(":focus-visible");
    expect(css).toContain("prefers-reduced-motion: reduce");
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
  });
});
