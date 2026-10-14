import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NabdMark } from "../components-next/nabd-mark";
import { VitalGlyph } from "../components-next/vital-glyph";

/**
 * The brand contract. The mark is owner-approved geometry
 * (docs/audit/05 Part A §A1, docs/design/canvas/Main.dc.html): the open bowl of
 * the Arabic letter ن with the pulse dot above it. These tests are what stop a
 * well-meaning edit from quietly redrawing the logo.
 */
const BOWL = "M40 104 C40 196 200 196 200 104";

describe("premium Nabd brand assets", () => {
  it("renders the approved Noon Dot geometry as a scalable vector with no embedded text", () => {
    const markup = renderToStaticMarkup(createElement(NabdMark, { size: 36 }));
    expect(markup).toContain('viewBox="0 0 240 240"');
    expect(markup).toContain(BOWL);
    // The dot above the bowl is what makes the mark a pulse rather than a letter.
    expect(markup).toMatch(/<circle[^>]*cx="120"[^>]*cy="58"[^>]*r="24"/);
    expect(markup).not.toContain("<text");
  });

  it("keeps the mark decorative by default and named when a title is given", () => {
    const decorative = renderToStaticMarkup(createElement(NabdMark, { size: 36 }));
    expect(decorative).toContain("aria-hidden");

    const named = renderToStaticMarkup(createElement(NabdMark, { size: 36, title: "نبض بلس" }));
    expect(named).toContain('role="img"');
    expect(named).toContain('aria-label="نبض بلس"');
  });

  it("only beats when asked, and the pulse is gated behind reduced-motion", () => {
    const still = renderToStaticMarkup(createElement(NabdMark, { size: 36 }));
    expect(still).not.toContain("nabd-mark--pulse");

    const beating = renderToStaticMarkup(createElement(NabdMark, { size: 36, pulse: true }));
    expect(beating).toContain("nabd-mark--pulse");

    const css = readFileSync(
      resolve(process.cwd(), "components-next/nabd-mark.css"),
      "utf8",
    );
    // A9: 60 bpm, and the animation disappears entirely for reduced motion.
    expect(css).toMatch(/nabd-dot-beat\s+1000ms/);
    expect(css).toContain("@media (prefers-reduced-motion: no-preference)");
  });

  it("uses the approved mark in the header and in the protected patient dashboard", () => {
    const layout = readFileSync(resolve(process.cwd(), "app/[locale]/layout.tsx"), "utf8");
    expect(layout).toContain('from "@/components-next/nabd-mark"');
    expect(layout).not.toContain("PulseShieldMark");

    // The dashboard draws the mark through the shared home shell and hero (components-next/home).
    const page = readFileSync(resolve(process.cwd(), "app/[locale]/dashboard/page.tsx"), "utf8");
    expect(page).toContain('from "@/components-next/home/home-shell"');
    expect(page).not.toContain("PulseShieldMark");
    for (const file of ["home-shell.tsx", "home-parts.tsx"]) {
      const source = readFileSync(resolve(process.cwd(), "components-next/home", file), "utf8");
      expect(source).toContain('from "@/components-next/nabd-mark"');
      expect(source).not.toContain("PulseShieldMark");
    }
  });

  it("renders a reusable vector glyph for each permitted vital key", () => {
    const markup = renderToStaticMarkup(createElement(VitalGlyph, { kind: "heart_rate" }));
    expect(markup).toContain("<svg");
    expect(markup).not.toContain("<text");
  });
});
