import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// the appointment screens' own stylesheet is now the shared consultation one (components-next/consult/consult.module.css)
const css = readFileSync(resolve(process.cwd(), "components-next/consult/consult.module.css"), "utf8");

describe("appointments design", () => {
  it("keeps an accessible care-card hierarchy with 44px targets and visible focus", () => {
    expect(css).toContain(".appt");
    expect(css).toContain(".apptLink:focus-visible");
    expect(css).toContain("min-block-size: 44px");
    expect(css).toContain("var(--nabd-a11y-focusRing-width)");
  });

  it("draws the appointment cards on tokens only, with no colour, blur or inline-style hook of its own", () => {
    expect(css).not.toMatch(/#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/);
    expect(css).not.toContain("backdrop-filter");
  });

  it("honours reduced motion for the one animation it has", () => {
    expect(css).toContain("prefers-reduced-motion: reduce");
  });
});
