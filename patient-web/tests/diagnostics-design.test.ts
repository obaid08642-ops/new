import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const css = readFileSync(resolve(process.cwd(), "components-next/diagnostics/diag.module.css"), "utf8");

// Replaces the checks on the old diagnostics.module.css and diagnostic-detail.module.css (deleted in Batch 3, slice 3-web).
describe("diagnostics design", () => {
  it("lays out the tiles, the cards and the lists responsively", () => {
    expect(css).toContain("repeat(2, minmax(0, 1fr))");
    expect(css).toContain("@media (min-width: 768px)");
    expect(css).toContain(".rail");
  });

  it("gives every pressable part a visible focus ring and a 44 px target", () => {
    for (const part of [".kind", ".test", ".pack", ".rad", ".lab", ".addBtn"]) expect(css).toContain(`${part}:focus-visible`);
    expect(css).toMatch(/\.addBtn \{[^}]*inline-size: 44px; block-size: 44px/);
    expect(css).toMatch(/\.quick \{[^}]*min-block-size: 64px/);
  });

  it("limits motion to fine pointers and honours the reduced-motion preference", () => {
    expect(css).toContain("@media (hover: hover) and (pointer: fine)");
    expect(css).toContain("prefers-reduced-motion: reduce");
  });

  it("uses tokens only: no raw colour, no physical left/right, no inline-style hooks", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b/);
    expect(css).not.toMatch(/\brgba?\(/);
    expect(css).not.toMatch(/\b(?:margin|padding|border)-(?:left|right)\b|\b(?:left|right):/);
  });
});
