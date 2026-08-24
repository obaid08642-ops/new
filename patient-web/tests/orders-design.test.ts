import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/orders/orders.module.css"), "utf8");

describe("orders design", () => {
  it("provides accessible tabs, cards, and an honest empty state", () => {
    expect(css).toContain(".tab:focus-visible");
    expect(css).toContain(".card:focus-visible");
    expect(css).toContain(".state");
    expect(css).toContain("border: 1px dashed");
  });

  it("limits hover motion and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
