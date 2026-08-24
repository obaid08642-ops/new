import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "app/[locale]/diagnostics/diagnostics.module.css"), "utf8");

describe("diagnostics design", () => {
  it("provides a responsive diagnostic hierarchy with honest alerts and empty states", () => {
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain(".alert, .empty");
    expect(css).toContain("border: 1px dashed");
    expect(css).toContain(".card:focus-visible");
  });

  it("contains hover motion and honours reduced-motion preferences", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
