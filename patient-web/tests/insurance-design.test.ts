import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/insurance/insurance.module.css"), "utf8");

describe("insurance design", () => {
  it("provides coverage cards, readable claim statuses, and explicit empty states", () => {
    expect(css).toContain("repeat(3, minmax(0, 1fr))");
    expect(css).toContain(".status");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("collapses coverage and claims safely on narrow screens", () => {
    expect(css).toContain("@media (max-width: 700px)");
    expect(css).toContain("@media (max-width: 440px)");
  });
});
