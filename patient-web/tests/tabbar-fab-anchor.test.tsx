import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { renderToStaticMarkup } from "react-dom/server";
import { BottomTabBar, fabAnchorX } from "@/components-next/ui-generated/components/Surfaces";

/**
 * Owner feedback 2026-10-30 (web twin of the app fix): the mask cut-out was centred at 50% of the bar while the
 * raised button sits in its flex slot, which moves when another tab grows into a labelled pill. Now the cut-out
 * reads ONE custom property (--nabd-fab-x), set by BottomTabBar from the raised slot's measured centre.
 */
const css = readFileSync(join(__dirname, "../components-next/ui-generated/components/css/Surfaces.css"), "utf8");

describe("web BottomTabBar: one anchor for the cut-out and the raised button", () => {
  it("the mask centre is the shared custom property, no fixed 50%", () => {
    const masks = css.match(/mask-image: radial-gradient\([^;]*\);/g) ?? [];
    expect(masks).toHaveLength(2);
    for (const m of masks) {
      expect(m).toContain("var(--nabd-fab-x)");
      expect(m).not.toMatch(/circle at 50%/);
    }
  });

  it("falls back to the bar centre before the slot is measured (50% of the 200px-larger mask box, minus the 100px offset)", () => {
    expect(css).toMatch(/--nabd-fab-x: calc\(50% - 100px\);/);
  });

  it("the anchor is the centre of the raised slot, whichever tab is selected (slot moved off the bar centre)", () => {
    const bar = 360 - 28;
    expect(fabAnchorX(140, 52)).toBe(166); // consult selected: slot centred on the bar
    expect(fabAnchorX(190, 52)).toBe(216); // another tab selected: slot moved 50 px, the cut-out follows
    expect(Math.abs(fabAnchorX(190, 52) - bar / 2)).toBeGreaterThan(40);
  });

  it("the markup carries no style attribute (CSP): the property is set through the CSSOM", () => {
    const items = ["home", "pharmacy", "consult", "labs", "nursing"].map((id) => ({ id, label: id, icon: "house", raised: id === "consult" }));
    const html = renderToStaticMarkup(<BottomTabBar items={items as never} value="home" />);
    expect(html).not.toMatch(/style=/);
    expect(html).toContain("nabd-bottom-tab-bar__raised");
  });
});
