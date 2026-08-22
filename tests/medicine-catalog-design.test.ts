import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/medicine-catalog/medicine-catalog.module.css"), "utf8");

describe("medicine catalog design", () => {
  it("provides a clear search surface, accessible cards, and an honest empty state", () => {
    expect(css).toContain(".fieldInput:focus-within");
    expect(css).toContain(".card:focus-visible");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover animation and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
