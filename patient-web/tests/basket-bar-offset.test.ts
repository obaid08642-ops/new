import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const css = readFileSync("components-next/ordering/ordering.module.css", "utf8");
const tsx = readFileSync("components-next/ordering/basket-bar.tsx", "utf8");
const rule = css.slice(css.indexOf(".basketBar {"), css.indexOf("}", css.indexOf(".basketBar {")));

describe("basket bar sits above the tab bar (owner review G5)", () => {
  it("offsets by the measured bottom-area height and the safe-area inset", () => {
    expect(rule).toMatch(/inset-block-end:\s*calc\(var\(--nabd-basket-bottom-h, 0px\) \+ max\(12px, env\(safe-area-inset-bottom\)\)\)/);
    expect(rule).toContain("z-index: var(--nabd-z-sticky)");
  });
  it("measures the shell bottom area (tab bar) and observes its size", () => {
    expect(tsx).toContain(".nabd-shell__bottom");
    expect(tsx).toContain("--nabd-basket-bottom-h");
    expect(tsx).toContain("ResizeObserver");
  });
});
