import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/articles/articles.module.css"), "utf8");

describe("articles design", () => {
  it("provides accessible search, category filters, and honest empty states", () => {
    expect(css).toContain(".search:focus-within");
    expect(css).toContain(".chipActive");
    expect(css).toContain(".empty, .state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover animation and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
